import { Job, Queue, SandboxedJob, Worker } from 'bullmq';
import type { QueueOptions, WorkerOptions } from 'bullmq';
import { pathToFileURL } from 'url';
import { DefaultWorkerExport } from '../../types';
import { redisConnection } from '../redis';
import {
  CONCURRENT_JOBS,
  JOB_RETRY_ATTEMPTS,
  MAX_COMPLETED_JOBS_TO_KEEP,
  MAX_FAILED_JOBS_TO_KEEP,
  QUEUE_NAME,
} from './config';
import processor from './processor';

const queueOptions: QueueOptions = {
  connection: {
    ...redisConnection,
    // Do not reconnect to the queue upon redis failure
    // See https://docs.bullmq.io/patterns/failing-fast-when-redis-is-down
    enableOfflineQueue: false,
  },
  defaultJobOptions: {
    attempts: JOB_RETRY_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
  },
};

const createQueue = () => new Queue(QUEUE_NAME, queueOptions);

const workerOptions: WorkerOptions = {
  autorun: false,
  connection: redisConnection,
  concurrency: CONCURRENT_JOBS,
  removeOnFail: { count: MAX_FAILED_JOBS_TO_KEEP },
  removeOnComplete: { count: MAX_COMPLETED_JOBS_TO_KEEP },
};

const createWorker = () => {
  const isCompiledJs = __filename.endsWith('.js');
  const processorUrl = pathToFileURL(__dirname + '/processor.js');

  // Launch processor in a separate thread, but only for the production/compiled JS code
  const worker = isCompiledJs
    ? new Worker(QUEUE_NAME, processorUrl, workerOptions)
    : new Worker(QUEUE_NAME, async (job) => processor(job as unknown as SandboxedJob), workerOptions);

  worker.on('progress', (job: Job, progress: number | object) => {
    if (typeof progress === 'number') {
      console.log(`Job ${job.id} is ${progress}% ready!`);
    } else {
      console.log(`Job ${job.id} update: ${JSON.stringify(progress)}`);
    }
  });

  worker.on('completed', (job: Job, returnvalue: any) => {
    // Do something with the return value.
  });

  worker.on('error', (err: any) => {
    // Log the error
    console.error(err);
  });

  worker.on('failed', (job?: Job, err?: Error) => {
    // Log the failed job
    console.error(
      `Failed job #${job?.id || 'n/a'}! Tried ${job?.attemptsMade || '0'}/${job?.opts.attempts || '0'} times.`
    );
    console.error(err);
  });

  // Launch the worker
  worker.run();

  return worker;
};

export default {
  createQueue,
  createWorker,
  queueName: QUEUE_NAME,
} satisfies DefaultWorkerExport;
