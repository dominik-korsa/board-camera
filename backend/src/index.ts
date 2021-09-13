import { connectDb } from "./database/database";
import fastify, { FastifyRequest } from "fastify";
import config from "./config";
import registerUpload from "./routes/upload";
import FastifySensible from 'fastify-sensible';
import { parseMultipart } from "./utils";
import { IncomingMessage } from "http";

async function main() {
    const dbManager = await connectDb();
    const server = fastify({ logger: true });
    server.register(FastifySensible);
    server.addContentTypeParser('multipart/form-data', (request: FastifyRequest, payload: IncomingMessage, done) => {
        parseMultipart(request, payload)
            .then((data) => done(null, data))
            .catch(error => done(error, undefined));
    });

    console.log('DB connected');
    registerUpload(server, dbManager);
    await server.listen(config.port, '0.0.0.0');
    console.log('Fastify ready');
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
