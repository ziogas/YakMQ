import { bodyParser } from '@koa/bodyparser';
import { Queue } from 'bullmq';
import jwt from 'jsonwebtoken';
import Koa from 'koa';
import request from 'supertest';
import { getAuthMiddleware } from '../../../src/api/auth';
import { getBullboardPlugin } from '../../../src/api/bullboard';
import { getRouter } from '../../../src/api/routes';
import * as workers from '../../../src/workers';

jest.mock('../../../src/workers');
const mockedWorkers = jest.mocked(workers);

const allQueues = [new Queue('test')];
mockedWorkers.getAllQueues.mockResolvedValue(allQueues);
mockedWorkers.getQueueByName.mockImplementation((name: string) =>
  Promise.resolve(allQueues.find((queue) => queue.name === name))
);

describe('api/index.ts', () => {
  let app: Koa;
  let validToken: string;
  let expiredToken: string;

  beforeAll(async () => {
    app = new Koa();
    app.use(bodyParser());
    app.use(getAuthMiddleware(process.env.JWT_SECRET || ''));

    app.use(await getBullboardPlugin());
    app.use(getRouter().routes());
    app.use(getRouter().allowedMethods());

    validToken = jwt.sign({ user: 'test' }, process.env.JWT_SECRET || '', { expiresIn: '10min' });
    expiredToken = jwt.sign({ user: 'test' }, process.env.JWT_SECRET || '', { expiresIn: '-10min' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await Promise.all(
      allQueues.map(async (queue) => {
        await queue.clean(0, 10, 'wait');
        await queue.close();
      })
    );
  });

  const makeRequest = (method: 'get' | 'post', url: string, token?: string, body?: object) => {
    const req = request(app.callback())[method](url).set('Accept', 'application/json');

    if (token) req.set('Authorization', `Bearer ${token}`);
    if (body) req.send(body);

    return req;
  };

  it('should respond with 401 when token is missing', async () => {
    await makeRequest('get', '/').expect(401);
  });

  it('should respond with 401 when token is expired', async () => {
    await makeRequest('get', '/', expiredToken).expect(401);
  });

  it('should respond with 401 for invalid token format', async () => {
    await makeRequest('get', '/', 'invalid-token').expect(401);
  });

  it('should respond with 200 when token is valid', async () => {
    const response = await makeRequest('get', '/', validToken).expect(200);
    expect(response.body).toEqual({ hello: 'world' });
  });

  it('should respond with 401 when bullboard token is not there', async () => {
    await makeRequest('get', '/ui').expect(401);
  });

  it('should load bullboard', async () => {
    await makeRequest('get', '/ui', validToken).expect(200);
  });

  it('should load bullboard with token param', async () => {
    await makeRequest('get', `/ui?token=${validToken}`).expect(200);
  });

  it('should list all the queues', async () => {
    const response = await makeRequest('get', '/queues', validToken).expect(200);
    expect(response.body).toEqual({
      queues: [
        {
          counts: {
            active: 0,
            completed: 0,
            delayed: 0,
            failed: 0,
            paused: 0,
            prioritized: 0,
            waiting: 0,
            'waiting-children': 0,
          },
          name: 'test',
          qualifiedName: 'bull:test',
        },
      ],
    });
  });

  it('should respond with 404 for non-existing queue', async () => {
    await makeRequest('post', '/queues/not-found', validToken, { jobName: 'jobtest', jobData: { foo: 'bar' } }).expect(
      404
    );
  });

  it('should respond with 400 when body is missing in POST request', async () => {
    await makeRequest('post', '/queues/test', validToken).expect(400);
  });

  it('should add a job to the queue', async () => {
    const response = await makeRequest('post', '/queues/test', validToken, {
      jobName: 'jobtest',
      jobData: { foo: 'bar' },
    }).expect(201);

    expect(response.body).toEqual({
      job: {
        attemptsMade: 0,
        attemptsStarted: 0,
        data: { foo: 'bar' },
        delay: 0,
        id: expect.any(String),
        name: 'jobtest',
        opts: { attempts: 0, delay: 0 },
        progress: 0,
        queueQualifiedName: 'bull:test',
        returnvalue: null,
        stacktrace: null,
        timestamp: expect.any(Number),
      },
      message: 'Job created',
    });
  });

  it('should respond with 404 for non-existing queue', async () => {
    await makeRequest('get', '/queues/not-found', validToken).expect(404);
  });

  it('should list all the jobs in a queue', async () => {
    const response = await makeRequest('get', '/queues/test', validToken).expect(200);
    expect(response.body).toEqual({
      jobs: [
        {
          attemptsMade: 0,
          attemptsStarted: 0,
          data: { foo: 'bar' },
          delay: 0,
          id: expect.any(String),
          name: 'jobtest',
          opts: { attempts: 0, delay: 0 },
          progress: 0,
          queueQualifiedName: 'bull:test',
          returnvalue: null,
          stacktrace: [],
          timestamp: expect.any(Number),
        },
      ],
    });
  });

  it('should respond with 404 when queue does not exist', async () => {
    await makeRequest('get', '/queues/not-found/something', validToken).expect(404);
  });

  it('should respond with 404 when job does not exist', async () => {
    await makeRequest('get', '/queues/test/not-found', validToken).expect(404);
  });

  it('should get a job from the queue', async () => {
    const allJobs = await makeRequest('get', '/queues/test', validToken);
    expect(allJobs.body.jobs).toHaveLength(1);
    expect(allJobs.body.jobs?.[0]?.id).not.toBeUndefined();

    const response = await makeRequest('get', `/queues/test/${allJobs.body.jobs[0].id}`, validToken).expect(200);
    expect(response.body).toEqual({
      job: {
        attemptsMade: 0,
        attemptsStarted: 0,
        data: { foo: 'bar' },
        delay: 0,
        id: expect.any(String),
        name: 'jobtest',
        opts: { attempts: 0, delay: 0 },
        progress: 0,
        queueQualifiedName: 'bull:test',
        returnvalue: null,
        stacktrace: [],
        timestamp: expect.any(Number),
      },
    });
  });
});
