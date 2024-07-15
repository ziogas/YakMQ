import type { Context } from 'koa';
import koajwt from 'koa-jwt';

export function getAuthMiddleware(secret: string) {
  return koajwt({
    secret,
    cookie: 'token',
    getToken: (ctx: Context, opts: koajwt.Options) => {
      // Check if the token is passed via query string as ?token=xxx
      // If so, set the cookie to the token value
      // That way bullboard can have auth token passed via query string
      if (ctx.query && ctx.query.token) {
        ctx.cookies.set('token', ctx.query.token.toString(), {
          httpOnly: true,
          overwrite: true,
        });
      }

      return ctx.query.token?.toString() || null;
    },
    algorithms: ['HS256'],
  });
}
