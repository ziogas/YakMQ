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
    const params = ctx.params;

    if (!params?.queueName) {
      ctx.status = 400;
      ctx.body = { error: 'queueName is required' };

      return;
    }

    const queue = await getQueueByName(params.queueName.toString());

    if (!queue) {
      ctx.status = 404;
      ctx.body = { error: `queue "${params.queueName}" not found` };

      return;
    }

    const jobs = await queue.getJobs();

    ctx.body = { jobs };
  });

  queuesRouter.post('createJob', '/:queueName', async (ctx, next) => {
    const body = ctx.request.body as Record<string, unknown> | undefined;
    const params = ctx.params;

    if (!params?.queueName || !body?.jobName || !body?.jobData) {
      ctx.status = 400;
      ctx.body = { error: 'queueName and jobData are required' };

      return;
    }

    const queue = await getQueueByName(params.queueName.toString());

    if (!queue) {
      ctx.status = 404;
      ctx.body = { error: `queue "${params.queueName}" not found` };

      return;
    }

    const addedJob = await queue.add(body.jobName.toString(), body.jobData, body.jobOptions || undefined);

    ctx.status = 201;
    ctx.body = { message: 'Job created', job: addedJob };
  });

  queuesRouter.get('getJob', '/:queueName/:jobId', async (ctx, next) => {
    const params = ctx.params;

    if (!params?.queueName || !params?.jobId) {
      ctx.status = 400;
      ctx.body = { error: 'queueName and jobId are required' };

      return;
    }

    const queue = await getQueueByName(params.queueName.toString());

    if (!queue) {
      ctx.status = 404;
      ctx.body = { error: `queue "${params.queueName}" not found` };

      return;
    }

    const job = await queue.getJob(params.jobId.toString());

    if (!job) {
      ctx.status = 404;
      ctx.body = { error: `jobId "${params.jobId}" not found` };

      return;
    }

    ctx.body = { job };
  });

  router.use(queuesRouter.routes(), queuesRouter.allowedMethods());

  router.get('homepage', '/', (ctx, next) => {
    ctx.body = { hello: 'world' };
  });

  return router;
}
