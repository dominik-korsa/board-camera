import { connectDb } from "./database/database";
import fastify, { FastifyRequest } from "fastify";
import registerFolders from "./routes/folders";
import FastifySensible from 'fastify-sensible';
import { parseMultipart } from "./utils";
import { IncomingMessage } from "http";
import FastifySecureSession from 'fastify-secure-session';
import fsPromises from "fs/promises";
import registerAuth from "./routes/auth";
import {config} from "./config";
import {registerAPITokens} from "./routes/api-tokens";

async function main() {
    const dbManager = await connectDb();
    const server = fastify({ logger: true });
    server.register(FastifySensible);
    server.register(FastifySecureSession, {
        key: await fsPromises.readFile('/run/secrets/session-key'),
        cookie: {
            httpOnly: true,
            secure: false, // TODO: Remove in production
            expires: new Date(Date.now() + 1000*60*60*24*365),
            path: '/',
        }
    });
    server.addContentTypeParser('multipart/form-data', (request: FastifyRequest, payload: IncomingMessage, done) => {
        parseMultipart(request, payload)
            .then((data) => done(null, data))
            .catch(error => done(error, undefined));
    });

    console.log('DB connected');
    await registerAuth(server, dbManager);
    registerFolders(server, dbManager);
    registerAPITokens(server, dbManager);
    server.get('/', (request, reply) => {
        reply.send('Witaj!')
    })
    await server.listen(config.port, '0.0.0.0');
    console.log('Fastify ready');
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
