import { FastifyInstance } from "fastify";
import { nanoid } from 'nanoid';
import path from "path";
import fse from "fs-extra";
import { DbManager } from "../database/database";
import { MultipartData } from "../utils";
import analyseImage from "../lib/analyse";
import {requireAuthentication} from "../guards";
import {config} from "../config";
import {Static, Type} from '@sinclair/typebox';
import {WithoutId} from "mongodb";
import {DbRootFolder} from "../database/types";
import {hasRole} from "../rules";

export default function registerFolders(server: FastifyInstance, dbManager: DbManager) {
    const createFolderBodySchema = Type.Object({
       name: Type.String(),
    });
    type CreateFolderBody = Static<typeof createFolderBodySchema>;
    const createFolderReplySchema = Type.Object({
        shortId: Type.String(),
    });
    type CreateFolderReply = Static<typeof createFolderReplySchema>;
    server.post<{
        Body: CreateFolderBody,
        Reply: CreateFolderReply,
    }>('/api/create-root-folder', {
        schema: {
            body: createFolderBodySchema,
            response: {
                200: createFolderReplySchema
            }
        }
    }, async (request) => {
        const user = await requireAuthentication(request, dbManager, true);
        let shortId: string;
        do {
            shortId = nanoid(10);
        } while ((await dbManager.foldersCollection.findOne({ shortId })) !== null)
        const insertedId = await dbManager.withSession(async () => {
            const newFolder: WithoutId<DbRootFolder> = {
                parentFolder: null,
                ownerId: user._id,
                rules: [],
                shortId,
                name: request.body.name.trim(),
                cache: {
                    userRecursiveRole: {},
                    shareRootFor: [],
                }
            };
            const result = await dbManager.foldersCollection.insertOne(newFolder);
            const folder: DbRootFolder = {...newFolder, _id: result.insertedId};
            await dbManager.updateFolderCache(folder);
            return result.insertedId;
        });
        if (insertedId === undefined) throw new Error('insertedId is undefined');
        return {
            shortId,
        }
    });

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
        if (!folder) throw server.httpErrors.notFound(`Folder not found`);
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
        const { insertedId } = await dbManager.imagesCollection.insertOne({
            shortId,
            path: filePath,
            boards: null,
            capturedOnDate: data.fields.capturedOn,
            uploadedOnDateTime: new Date().toISOString(),
            folderId: folder._id,
            uploaderId: user._id,
            mimeType: file.mimeType,
        });
        analyseImage(insertedId, dbManager, [[0, 1, 2, 3]])
            .catch(console.error);
        return {
            shortId,
        }
    });
}
