// Update the queue name as needed.
// Queue can have differently named jobs, but they all share the same worker.
export const QUEUE_NAME = 'example';

// How many jobs to execute concurrently.
// See here for more details: https://docs.bullmq.io/guide/parallelism-and-concurrency#bullmq-concurrency
export const CONCURRENT_JOBS = parseInt(process.env.WORKER_CONCURRENT_JOBS || '1', 10);

// How many completed jobs to keep.
// See here for more details: https://docs.bullmq.io/guide/workers/auto-removal-of-jobs#keep-a-certain-number-of-jobs
export const MAX_COMPLETED_JOBS_TO_KEEP = 1000;

// How many failed jobs to keep.
// See here for more details: https://docs.bullmq.io/guide/workers/auto-removal-of-jobs#keep-a-certain-number-of-jobs
export const MAX_FAILED_JOBS_TO_KEEP = 5000;

// How many times to retry a job before marking it as failed.
// See here for more details: https://docs.bullmq.io/guide/retrying-failing-jobs
export const JOB_RETRY_ATTEMPTS = 3;
