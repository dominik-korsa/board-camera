import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { Static, Type } from '@sinclair/typebox';
import { WithoutId } from 'mongodb';
import { DbManager } from '../database/database';
import { requireAuthentication } from '../guards';
import { DbRootFolder } from '../database/types';

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
        200: createFolderReplySchema,
      },
    },
  }, async (request) => {
    const user = await requireAuthentication(server, request, dbManager, true);
    let shortId: string;
    do {
      shortId = nanoid(10);
      // eslint-disable-next-line no-await-in-loop
    } while ((await dbManager.foldersCollection.findOne({ shortId })) !== null);
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
        },
      };
      const result = await dbManager.foldersCollection.insertOne(newFolder);
      const folder: DbRootFolder = { ...newFolder, _id: result.insertedId };
      await dbManager.updateFolderCache(folder);
      return result.insertedId;
    });
    if (insertedId === undefined) throw new Error('insertedId is undefined');
    return {
      shortId,
    };
  });
}
