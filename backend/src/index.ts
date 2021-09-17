import fastify, { FastifyRequest } from 'fastify';
import FastifySensible from 'fastify-sensible';
import { IncomingMessage } from 'http';
import FastifySecureSession from 'fastify-secure-session';
import fsPromises from 'fs/promises';
import { parseMultipart } from './utils';
import registerFolders from './routes/folders';
import { connectDb } from './database/database';
import registerAuth from './routes/auth';
import { config } from './config';
import { registerAPITokens } from './routes/api-tokens';
import { registerImageUpload } from './routes/image-upload';
import { registerImageDownload } from './routes/get-image';

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
  server.addContentTypeParser('multipart/form-data', (request: FastifyRequest, payload: IncomingMessage, done) => {
    parseMultipart(request, payload)
      .then((data) => done(null, data))
      .catch((error) => done(error, undefined));
  });

  server.log.info('DB connected');
  await dbManager.updateAllFolderCaches();
  await registerAuth(server, dbManager);
  registerFolders(server, dbManager);
  registerAPITokens(server, dbManager);
  registerImageUpload(server, dbManager);
  registerImageDownload(server, dbManager);
  server.get('/', (request, reply) => {
    reply.send('Witaj!');
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
