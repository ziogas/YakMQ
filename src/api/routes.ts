import Router from 'koa-router';
import { getAllQueues, getQueueByName } from '../workers';

export function getRouter() {
  const router = new Router();

  const queuesRouter = new Router({
    prefix: '/queues',
  });

  queuesRouter.get('getQueues', '/', async (ctx, next) => {
    const queues = [];

    for await (const queue of await getAllQueues()) {
      queues.push({
        name: queue.name,
        qualifiedName: queue.qualifiedName,
        counts: await queue.getJobCounts(),
      });
    }

    ctx.body = { queues };
  });

  queuesRouter.get('getJobs', '/:queueName', async (ctx, next) => {
    const queueName = ctx.params.queueName?.trim()?.toString() || '';
    const queue = await getQueueByName(queueName);

    if (!queue) {
      ctx.status = 404;
      ctx.body = { error: `queue "${queueName}" not found` };

      return;
    }

    const jobs = await queue.getJobs();

    ctx.body = { jobs };
  });

  queuesRouter.post('createJob', '/:queueName', async (ctx, next) => {
    const queueName = ctx.params?.queueName?.trim()?.toString();
    const jobName = ctx.request.body?.jobName?.trim()?.toString();
    const jobData = ctx.request.body?.jobData;
    const jobOptions = ctx.request.body?.jobOptions;

    if (!queueName || !jobName || !jobData) {
      ctx.status = 400;
      ctx.body = {
        error: `queueName, jobName, and jobData are required. Got ${JSON.stringify({
          queueName,
          jobName,
          jobData,
        })}`,
      };

      return;
    }

    const queue = await getQueueByName(queueName);

    if (!queue) {
      ctx.status = 404;
      ctx.body = { error: `queue "${queueName}" not found` };

      return;
    }

    const addedJob = await queue.add(jobName, jobData, jobOptions || undefined);

    ctx.status = 201;
    ctx.body = { message: 'Job created', job: addedJob };
  });

  queuesRouter.get('getJob', '/:queueName/:jobId', async (ctx, next) => {
    const queueName = ctx.params?.queueName?.trim()?.toString() || '';
    const jobId = ctx.params?.jobId?.trim()?.toString() || '';

    const queue = await getQueueByName(queueName);

    if (!queue) {
      ctx.status = 404;
      ctx.body = { error: `queue "${queueName}" not found` };

      return;
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      ctx.status = 404;
      ctx.body = { error: `jobId "${jobId}" not found` };

      return;
    }

    ctx.body = { job };
  });

  router.use(queuesRouter.routes(), queuesRouter.allowedMethods());

  router.get('homepage', '/', (ctx) => {
    ctx.body = { hello: 'world' };
  });

  return router;
}
