import { Queue, Worker } from 'bullmq';

export type DefaultWorkerExport = {
  queueName: string;
  createQueue: () => Queue;
  createWorker: () => Worker;
};
