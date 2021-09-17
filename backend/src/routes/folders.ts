import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { Static, Type } from '@sinclair/typebox';
import { WithoutId } from 'mongodb';
import { DbManager } from '../database/database';
import { requireAuthentication } from '../guards';
import { DbFolder, DbRootFolder } from '../database/types';
import { hasRole } from '../rules';

const folderSchema = Type.Object({
  shortId: Type.String(),
  name: Type.String(),
});
type Folder = Static<typeof folderSchema>;
function mapFolder(folder: DbFolder): Folder {
  return {
    name: folder.name,
    shortId: folder.shortId,
  };
}

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
    const user = await requireAuthentication(request, dbManager, true);
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

  const listUserFoldersReplySchema = Type.Object({
    ownedFolders: Type.Array(folderSchema),
    sharedFolders: Type.Array(folderSchema),
  });
  type ListUserFoldersReply = Static<typeof listUserFoldersReplySchema>;
  server.get<{
    Reply: ListUserFoldersReply,
  }>('/api/list-user-folders', {
    schema: {
      response: {
        200: listUserFoldersReplySchema,
      },
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, true);
    const ownedFolders = await dbManager.foldersCollection.find({
      parentFolder: null,
      ownerId: user._id,
    }).map(mapFolder).toArray();
    const sharedFolders = await dbManager.foldersCollection.find({
      cache: {
        shareRootFor: { $elemMatch: user._id },
      },
    }).map(mapFolder).toArray();
    return {
      ownedFolders,
      sharedFolders,
    };
  });

  const imageSchema = Type.Object({
    shortId: Type.String(),
    capturedOnDate: Type.String(),
  });
  type Image = Static<typeof imageSchema>;
  const folderContentsReplySchema = Type.Object({
    subfolders: Type.Array(folderSchema),
    images: Type.Array(imageSchema),
  });
  type FolderContentsReply = Static<typeof folderContentsReplySchema>;
  server.get<{
    Params: { folderShortId: string },
    Reply: FolderContentsReply,
  }>('/api/folders/:folderShortId/contents', {
    schema: {
      response: {
        200: folderContentsReplySchema,
      },
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, true);
    const folder = await dbManager.foldersCollection.findOne({
      shortId: request.params.folderShortId,
    });
    if (!folder) throw server.httpErrors.notFound('Folder not found');
    if (!hasRole(folder, user._id, 'viewer')) throw server.httpErrors.forbidden();
    const subfolders = await dbManager.foldersCollection.find({
      parentFolder: folder._id,
    }).map(mapFolder).toArray();
    const images = await dbManager.imagesCollection.find({
      folderId: folder._id,
    }).map((image): Image => ({
      shortId: image.shortId,
      capturedOnDate: image.capturedOnDate,
    })).toArray();
    return {
      subfolders,
      images,
    };
  });
}
