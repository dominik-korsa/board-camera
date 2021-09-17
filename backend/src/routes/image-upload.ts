import {Static, Type} from "@sinclair/typebox";
import {requireAuthentication} from "../guards";
import {MultipartData} from "../utils";
import {hasRole} from "../rules";
import path from "path";
import {config} from "../config";
import {nanoid} from "nanoid";
import fse from "fs-extra";
import analyseImage from "../lib/analyse";
import {FastifyInstance} from "fastify";
import {DbManager} from "../database/database";
import {DbImageBoard} from "../database/types";

export function registerImageUpload(server: FastifyInstance, dbManager: DbManager) {
    const uploadImageReplySchema = Type.Object({
        shortId: Type.String(),
    });
    type UploadImageReply = Static<typeof uploadImageReplySchema>;
    server.post<{
        Params: {
            folderShortId: string;
        },
        Reply: UploadImageReply,
    }>('/api/folders/:folderShortId/upload-image', {
        schema: {
            response: {
                200: uploadImageReplySchema,
            }
        }
    }, async (request) => {
        const user = await requireAuthentication(request, dbManager, true);
        const data = request.body as MultipartData;
        const file = data.files.file;
        if (!file) throw server.httpErrors.badRequest('Missing "file"');
        const supportedTypes = ['image/bmp', 'image/jpeg', 'image/png', 'image/webp'];
        if (!supportedTypes.includes(file.mimeType)) throw server.httpErrors.unsupportedMediaType(`Unsupported media type. Supported formats: ${supportedTypes.map((x) => `"${x}"`).join(', ')}`)
        if (!data.fields.capturedOn || typeof data.fields.capturedOn !== 'string') {
            throw server.httpErrors.badRequest('Missing "capturedOn"');
        }
        if (isNaN(Date.parse(data.fields.capturedOn))) throw server.httpErrors.badRequest('Invalid date');
        const folder = await dbManager.foldersCollection.findOne({
            shortId: request.params.folderShortId,
        });
        if (folder === null) throw server.httpErrors.notFound(`Folder not found`);
        if (!hasRole(folder, user._id, 'editor')) throw server.httpErrors.forbidden();

        let filePath;
        do {
            filePath = path.join(config.storagePath, `${nanoid(12)}${path.extname(file.filename)}`);
        } while (await fse.pathExists(filePath))
        await fse.writeFile(filePath, file.data);
        let shortId: string;
        do {
            shortId = nanoid(10);
        } while ((await dbManager.imagesCollection.findOne({ shortId })) !== null)
        let boards: DbImageBoard[] | null = null;
        try {
            boards = await analyseImage(filePath, dbManager, [[0, 1, 2, 3]]);
        } catch (error) {
            console.error(error);
        }
        await dbManager.imagesCollection.insertOne({
            shortId,
            path: filePath,
            boards,
            capturedOnDate: data.fields.capturedOn,
            uploadedOnDateTime: new Date().toISOString(),
            folderId: folder._id,
            uploaderId: user._id,
            mimeType: file.mimeType,
        });
        return {
            shortId,
        }
    });
}
