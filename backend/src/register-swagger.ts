import { FastifyInstance } from 'fastify';
import FastifySwagger from 'fastify-swagger';

export default function registerSwagger(server: FastifyInstance) {
  server.register(FastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true,
    openapi: {
      components: {
        securitySchemes: {
          apiKeyHeader: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
          },
          sessionCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: 'session',
          },
        },
      },
    },
  });
}
