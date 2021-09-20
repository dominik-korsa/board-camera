import fastify, { FastifyRequest } from 'fastify';
import FastifySensible from 'fastify-sensible';
import { IncomingMessage } from 'http';
import FastifySecureSession from 'fastify-secure-session';
import fsPromises from 'fs/promises';
import { parseMultipart } from './utils';
import { connectDb } from './database/database';
import registerAuth from './routes/auth';
import { config } from './config';
import { ApiPlugin } from './routes/register-api';

async function main() {
  const dbManager = await connectDb();
  const server = fastify({ logger: true });
  server.register(FastifySensible);
  server.register(FastifySecureSession, {
    key: await fsPromises.readFile('/run/secrets/session-key'),
    cookie: {
      httpOnly: true,
      secure: false, // TODO: Remove in production
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      path: '/',
    },
  });
  server.decorateRequest('files', null);
  server.addContentTypeParser('multipart/form-data', (request: FastifyRequest, payload: IncomingMessage, done) => {
    parseMultipart(request, payload)
      .then((result) => {
        request.files = result.files;
        done(null, result.fields);
      })
      .catch((error) => done(error, undefined));
  });
  server.addHook('preHandler', async (request, reply) => {
    const { schema } = reply.context;
    if (schema?.files === undefined) return;
    const fileFields = new Set<string>();
    if (request.files !== null) {
      Object.keys(request.files).forEach((field) => fileFields.add(field));
    }
    schema.files.forEach((field) => {
      if (!fileFields.has(field)) throw server.httpErrors.badRequest(`Missing "${field}" file field`);
    });
  });

  server.log.info('DB connected');
  await dbManager.updateAllFolderCaches();
  await registerAuth(server, dbManager);
  server.register(ApiPlugin, {
    prefix: '/api',
    dbManager,
  });
  server.get('/', (request, reply) => {
    reply.type('text/html');
    if (request.session.get('user-id') === undefined) {
      reply.send('<a href="/auth/sign-in/google">Sign in with google</a>');
    } reply.send('<a href="/auth/sign-out">Sign out</a>');
  });
  await server.listen(config.port, '0.0.0.0');
  server.log.info('Fastify ready');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
