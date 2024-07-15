export const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  password: process.env.REDIS_PASSWORD,
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  db: parseInt(process.env.REDIS_DB || '0', 10),
};
