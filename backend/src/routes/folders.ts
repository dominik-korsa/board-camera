import { FastifyInstance } from "fastify";
import { nanoid } from 'nanoid';
import path from "path";
import fse from "fs-extra";
import { DatabaseManager } from "../database/database";
import { MultipartData } from "../utils";
import analyseImage from "../lib/analyse";
import {requireAuthentication} from "../guards";
import {config} from "../config";

export default function registerFolders(server: FastifyInstance, dbManager: DatabaseManager) {
    // server.post('/api/folders/create', async (request, reply) => {
    //    const user = await requireAuthentication(request, dbManager, true);
    //
    // });

    server.post('/api/folders/:folderId/upload', async (request, reply) => {
        await requireAuthentication(request, dbManager, true);
        const data = request.body as MultipartData;
        // TODO: Perform verification
        const file = data.files.file;
        if (!file) throw server.httpErrors.badRequest('Missing "file"');
        let filePath;
        do {
            filePath = path.join(config.storagePath, `${nanoid(12)}${path.extname(file.filename)}`);
        } while (await fse.pathExists(filePath))
        await fse.writeFile(filePath, file.data);
        const capturedOn = data.fields.capturedOn;
        if (!capturedOn || typeof capturedOn !== 'string') throw server.httpErrors.badRequest('Missing "capturedOn"');
        if (isNaN(Date.parse(capturedOn))) throw server.httpErrors.badRequest('Invalid date');
        const { insertedId } = await dbManager.imagesCollection.insertOne({
            path: filePath,
            boards: null,
            capturedOnDate: capturedOn,
            uploadedOnDateTime: new Date().toISOString(),
        });
        reply.send('ok');
        analyseImage(insertedId, dbManager, [[0, 1, 2, 3]])
            .catch(console.error);
    });
}