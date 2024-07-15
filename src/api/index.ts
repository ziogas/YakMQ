import { bodyParser } from '@koa/bodyparser';
import Koa from 'koa';
import { getAuthMiddleware } from './auth';
import { getBullboardPlugin } from './bullboard';
import { getRouter } from './routes';

if (!process.env.JWT_SECRET) {
  console.error('❌ [ERROR] JWT_SECRET is missing');
  process.exit(1);
}

const generateTokenHelpCommand = `node \\\n  --env-file=.env --env-file=.env.${process.env.NODE_ENV === 'development' ? 'development' : 'production'} \\\n  -e "console.log(require('jsonwebtoken').sign({ user: 'local' }, process.env.JWT_SECRET, { expiresIn: '60min' }))"`;

const port = process.env.PORT || 3000;
const app = new Koa();

app.use(getAuthMiddleware(process.env.JWT_SECRET));

function startApiServer() {
  const router = getRouter();
  app.use(bodyParser());

  app.use(async (ctx, next) => {
    await next();
    console.log(`🚀 [${process.env.NODE_ENV}] ${ctx.method} ${ctx.url} - ${ctx.status}`);
    ctx.set('X-Matched-Route', ctx._matchedRoute);
  });

  app.use(router.routes()).use(router.allowedMethods());

  app.listen(port, () => {
    console.log(`🚀 [${process.env.NODE_ENV}] API Server is running on http://localhost:${port}/`);
    console.log(
      `\n🔐 [${process.env.NODE_ENV}] To generate an auth token, run the following command: \n${generateTokenHelpCommand}\n\n🔐 ^ Use this token exclusively for accessing BullBoard by appending ?token={GENERATED_TOKEN} to the URL.\n🔐 For programmatic API access, generate a JWT token dynamically within your programming language.`
    );
  });
}

if (process.env.BULLBOARD) {
  getBullboardPlugin()
    .then((bullboardPlugin) => {
      console.log(`🚀 [${process.env.NODE_ENV}] Attaching the BullBoard to http://localhost:${port}/ui`);
      console.log(`🚀 [${process.env.NODE_ENV}] Read more on https://github.com/felixmosh/bull-board`);

      app.use(bullboardPlugin);
    })
    .then(startApiServer);
} else {
  startApiServer();
}
