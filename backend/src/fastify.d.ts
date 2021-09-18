import 'fastify';

declare module 'fastify' {
  // see https://github.com/fastify/fastify-swagger/issues/468
  interface FastifySchema {
    produces?: string[];
  }
}
