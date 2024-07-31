[![Tests][tests-shield]][tests-url]
[![MIT License][license-shield]][license-url]
[![Issues][issues-shield]][issues-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

# YakMQ

YakMQ is a boilerplate for job/task queues based on [BullMQ]. It includes a private API endpoint for adding jobs, integrates with [BullBoard] for monitoring, and features standardized workers. The project is Dockerized for easy deployment.

## Getting Started

### Clone the Repository

1. Clone the repository to your local machine.
2. Copy the `.env.sample` file to `.env`.
3. Update the values in the `.env` file to match your configuration.

```sh
git clone git@github.com:ziogas/YakMQ.git
cd yakmq
cp .env.sample .env # don't forget to update the values
```

You can create separate `.env` files for different environments, such as `.env.development` and `.env.production`. These environment-specific files will override and extend the settings in the main `.env` file.


### Install the dependencies

To install the dependencies, use [Yarn](https://yarnpkg.com/) with corepack enabled:

```sh
corepack enable
yarn install
```

### Adding Your Workers

1. **Copy Example Worker:**
   - Duplicate the example worker directory from `src/workers/example` to `src/workers/your-queue`.

2. **Configure Your Queue:**
   - Modify `src/workers/your-queue/config.ts` to set up your specific queue configuration.

3. **Implement Your Processor:**
   - Edit `src/workers/your-queue/processor.ts` to define the processing logic for your queue items/jobs.

### Create Auth Secret

To secure the API endpoint, a JWT secret key is required. Generate the secret key using the following command:

```sh
node -e "console.log(require('crypto').randomBytes(256).toString('base64'))"
```

Store the generated key as `JWT_SECRET` in your `.env.development` and `.env.production` files. Ensure that each environment has a unique key for added security.

## Running The Code

### 👉 Option A; Docker way

Start the local Redis server and app in **development** mode:

```sh
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up redis api workers
```

Start the local Redis server and app in **production** mode (pass `-d` param to detach from the process):

```sh
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker compose -f docker/docker-compose.yml up -d redis api workers
```


### 👉 Option B; Running directly on your machine:

Make sure you have Redis running in the background and Node 20+ on your system. Then, install the dependencies:

```sh
yarn install
```

Run in development mode with the server reload:

```sh
yarn dev
```

Run it in production mode:

```sh
yarn build && yarn start
```

## API Auth

The API uses JWT (JSON Web Token) for authentication. To access the API, include the token in the `Authorization` header.

### Generating a JWT Token

1. **Secret Key**: The token should be generated using the `JWT_SECRET` key from your `.env.production` or `.env.development` files.
2. **Algorithm**: Use the `HS256` algorithm for token generation.

Here is an example of how to generate a token using Node.js:

```js
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { user: 'local' },
  process.env.JWT_SECRET,
  { expiresIn: '15min' }
);
```

**NEVER** generate tokens on the client-side, as it exposes the secret key. Always generate tokens on the server-side and pass them to the client or perform backend-backend requests.

## API Endpoints

#### GET `/queues`

Returns a list of all available queues. Example output:


```json
{
  "queues": [
    {
      "counts": {
        "active": 0,
        "completed": 2,
        "delayed": 0,
        "failed": 3,
        "paused": 0,
        "prioritized": 0,
        "waiting": 0,
        "waiting-children": 0
      },
      "name": "example",
      "qualifiedName": "bull:example"
    }
  ]
}
```

#### GET `/queues/:queueName`

Returns the jobs belonging to that queue. Example output:

```json
{
  "jobs": [{
      "attemptsMade": 1,
      "attemptsStarted": 1,
      "data": {
        "foo": "bar"
      },
      "delay": 0,
      "finishedOn": 1720707331168,
      "id": "1",
      "name": "firstone",
      "opts": {
        "attempts": 3,
        "backoff": {
            "delay": 30000,
            "type": "exponential"
        },
        "delay": 0
      },
      "processedOn": 1720707324521,
      "progress": {
        "msg": "[example] done..."
      },
      "queueQualifiedName": "bull:example",
      "returnvalue": {
        "succeeded": true
      },
      "stacktrace": [],
      "timestamp": 1720707324520
  }]
}
```

#### POST `/queues/:queueName`

Adds a new job to the queue. Pass `jobName`, `jobData`, and `jobOptions` (optionally) as POST data. Example output:

```json
{
  "job": {
    "attemptsMade": 0,
    "attemptsStarted": 0,
    "data": "{}",
    "delay": 0,
    "id": "1",
    "name": "test",
    "opts": {
      "attempts": 3,
      "backoff": {
        "delay": 30000,
        "type": "exponential"
      },
      "delay": 0
    },
    "progress": 0,
    "queueQualifiedName": "bull:example",
    "returnvalue": null,
    "stacktrace": null,
    "timestamp": 1720786712253
  },
  "message": "Job created"
}
```

#### GET `/queues/:queueName/:jobId`

Returns the job details. Example output:

```json
{
  "job": {
    "attemptsMade": 0,
    "attemptsStarted": 0,
    "data": "{}",
    "delay": 0,
    "id": "6",
    "name": "test",
    "opts": {
      "attempts": 3,
      "backoff": {
        "delay": 30000,
        "type": "exponential"
      },
      "delay": 0
    },
    "progress": 0,
    "queueQualifiedName": "bull:example",
    "returnvalue": null,
    "stacktrace": [],
    "timestamp": 1720786712253
  }
}
```

For the rest of the operations, you can manually use BullBoard.

## BullBoard

To enable the [BullBoard] dashboard, follow these steps:

1. Set the `BULLBOARD=true` environment variable in your `.env` file.
2. Start the API. The dashboard will be accessible at `http://localhost:3000/ui`.
3. To access the dashboard, append the `?token` query string with a valid JWT token to the URL. This token will be stored in cookies.

You can generate a valid JWT token using the following command:

```sh
node \
  --env-file=.env --env-file=.env.development \ # or .env.production!
  -e "console.log(require('jsonwebtoken').sign({ user: 'local' }, process.env.JWT_SECRET, { expiresIn: '60min' }))" # any valid expiration time
```

To access BullBoard, append `?token={GENERATED_TOKEN}` to the URL. For example: `http://localhost:3000/ui?token={GENERATED_TOKEN}`.

Ensure the token's expiration time is:
- Long enough to be practical.
- Short enough to maintain security.

⚠️ For programmatic API access, ensure that your application code dynamically generates a JWT token.

## Scaling

To scale the application, consider the following approaches:

1. **Multiple Instances**: Run multiple instances of the app on different servers. Ensure all instances use the same Redis instance.
2. **Increase Concurrency**: Set the `CONCURRENT_JOBS` constant in each worker's configuration to a value higher than 1. Alternatively, set a global environment variable `WORKER_CONCURRENT_JOBS`.
3. **Combination**: Use a combination of both methods for optimal scaling (recommended).

For more details, refer to:
- [BullMQ Worker Concurrency](https://docs.bullmq.io/guide/workers/concurrency)
- [BullMQ Parallelism and Concurrency](https://docs.bullmq.io/guide/parallelism-and-concurrency#bullmq-concurrency)

## Support

This code is provided "as-is" without any warranty or official support. However, if you have questions or need assistance, you have several options:

1. **GitHub Issues**: Open a [GitHub issue][issues-url] for any bugs or feature requests.
2. **Email**: Contact me directly at [arminas@ini.lt][email].
3. **LinkedIn**: If you have professional inquiries and are interested in hiring me on an hourly basis, please connect with me on [LinkedIn][linkedin-url].

I will do my best to help you out!

## License

[MIT][license-url], attribution is nice but not required.


[BullMQ]: https://docs.bullmq.io/
[BullBoard]: https://github.com/felixmosh/bull-board
[issues-shield]: https://img.shields.io/github/issues/ziogas/yakmq.svg?style=for-the-badge
[issues-url]: https://github.com/ziogas/yakmq/issues
[license-shield]: https://img.shields.io/github/license/ziogas/yakmq.svg?style=for-the-badge
[license-url]: https://github.com/ziogas/yakmq/blob/main/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/arminaszukauskas
[email]: mailto:arminas@ini.lt
[tests-shield]: https://img.shields.io/github/actions/workflow/status/ziogas/yakmq/test.yml?branch=master&label=tests&style=for-the-badge
[tests-url]: https://github.com/ziogas/yakmq/actions/workflows/test.yml
