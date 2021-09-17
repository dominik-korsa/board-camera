import { FastifyInstance } from "fastify";
import { nanoid } from 'nanoid';
import fse from "fs-extra";
import { DbManager } from "../database/database";
import {requireAuthentication} from "../guards";
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

    server.get<{
        Params: {
            folderShortId: string;
            imageShortId: string;
        },
    }>('/api/folders/:folderShortId/images/:imageShortId/raw', async (request, reply) => {
        const user = await requireAuthentication(request, dbManager, true);
        const folder = await dbManager.foldersCollection.findOne({
            shortId: request.params.folderShortId,
        });
        if (folder === null) throw server.httpErrors.notFound(`Folder not found`);
        if (!hasRole(folder, user._id, 'viewer')) throw server.httpErrors.forbidden();
        const image = await dbManager.imagesCollection.findOne({
            shortId: request.params.imageShortId,
            folderId: folder._id,
        });
        if (image === null) throw server.httpErrors.notFound('Image not found');
        reply.type(image.mimeType).send(fse.createReadStream(image.path));
    });
}
