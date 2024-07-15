import { SandboxedJob } from 'bullmq';

export default async function processor(job: SandboxedJob) {
  job.log(`job started on ${new Date().toISOString()}`);

  job.updateProgress(0);

  // Dummy delay to simulate processing, minimum 1s maximum 10s
  await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 10000) + 1000));

  job.updateProgress(50);

  // Dummy delay to simulate processing, minimum 1s maximum 10s
  await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 10000) + 1000));

  job.updateProgress(100);

  return { succeeded: true };
}
