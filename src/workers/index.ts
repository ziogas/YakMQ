import type { Queue, Worker } from 'bullmq';
import { glob } from 'fast-glob';
import { DefaultWorkerExport } from '../types';

const allQueues: Queue[] = [];
const allWorkers: Worker[] = [];

export async function importAllWorkers() {
  const workersToLoad = await glob(`${__dirname}/*/worker.?s`);

  const importedWorkerObjects = await Promise.all(workersToLoad?.map((worker) => import(worker)) || []);

  // Handle transpiled ES6 modules, they're nested in a "default" property
  const importedWorkers: DefaultWorkerExport[] = importedWorkerObjects.map(
    (importedWorkerObject) =>
      importedWorkerObject?.default?.default || importedWorkerObject?.default || importedWorkerObject
  );
  return importedWorkers;
}

export async function getAllQueues() {
  const importedWorkers = await importAllWorkers();

  return importedWorkers.map((worker) => worker.createQueue());
}

export async function getQueueByName(queueName: string) {
  const importedWorkers = await importAllWorkers();
  const worker = importedWorkers.find((w) => w.queueName === queueName);

  return worker?.createQueue();
}

export async function launchAllWorkers() {
  const importedWorkers = await importAllWorkers();

  for await (const importedWorker of importedWorkers) {
    const { createWorker, createQueue, queueName } = importedWorker;

    console.log(`🚀 [${process.env.NODE_ENV}] Launching worker for queue "${queueName}"`);

    allQueues.push(createQueue());
    allWorkers.push(createWorker());

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function exitHandler(evtOrExitCodeOrError: number | string | Error) {
  try {
    for await (const worker of allWorkers) {
      console.log(`🚀 [${process.env.NODE_ENV}] Shutting down the worker "${worker.qualifiedName}"`);
      await worker.close();
    }
  } catch (e) {
    console.error('EXIT HANDLER ERROR', e);
  }

  process.exit(isNaN(+evtOrExitCodeOrError) ? 1 : +evtOrExitCodeOrError);
}

function bindExitHandler() {
  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'SIGTERM'].forEach((evt) => process.on(evt, exitHandler));
}

if (require.main === module) {
  launchAllWorkers().then(() => bindExitHandler());
}
