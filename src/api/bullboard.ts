import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { KoaAdapter } from '@bull-board/koa';
import { getAllQueues } from '../workers';

export async function getBullboardPlugin() {
  const serverAdapter = new KoaAdapter();
  const allQueues = await getAllQueues();

  createBullBoard({
    queues: allQueues.map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
  });

  serverAdapter.setBasePath('/ui');

  return serverAdapter.registerPlugin();
}
