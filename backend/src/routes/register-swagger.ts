import { FastifyInstance } from 'fastify';
import FastifySwagger from 'fastify-swagger';

export default function registerSwagger(server: FastifyInstance) {
  server.register(FastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true,
    openapi: {
      info: {
        version: process.env.npm_package_version ?? 'unknown',
        license: {
          name: 'MIT',
          url: 'https://github.com/dominik-korsa/board-camera/blob/main/LICENSE',
        },
        title: 'Board Camera',
        contact: {
          name: 'Dominik Korsa',
          url: 'https://github.com/dominik-korsa',
          email: 'dominik.korsa@gmail.com',
        },
      },
      tags: [
        {
          name: 'internal',
          description: 'These endpoints don\'t accept x-api-token header authorization and have CORS enabled',
        },
      ],
      components: {
        securitySchemes: {
          apiTokenHeader: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-token',
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
