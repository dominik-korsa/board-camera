import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { Static, Type } from '@sinclair/typebox';
import { WithoutId } from 'mongodb';
import { DbManager } from '../../database/database';
import { requireAuthentication } from '../../guards';
import { DbChildFolder, DbFolder, DbRootFolder } from '../../database/types';
import { hasRole } from '../../rules';
import { FolderParams, folderParamsSchema } from './common';

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

export default function registerFolders(apiInstance: FastifyInstance, dbManager: DbManager) {
  const createFolderBodySchema = Type.Object({
    name: Type.String(),
  });
  type CreateFolderBody = Static<typeof createFolderBodySchema>;
  const createFolderReplySchema = Type.Object({
    shortId: Type.String(),
  });
  type CreateFolderReply = Static<typeof createFolderReplySchema>;
  apiInstance.post<{
    Body: CreateFolderBody,
    Reply: CreateFolderReply,
  }>('/create-root-folder', {
    schema: {
      body: createFolderBodySchema,
      response: {
        200: createFolderReplySchema,
      },
      security: [
        { apiTokenHeader: [] },
        { sessionCookie: [] },
      ],
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, true);
    let shortId: string;
    do {
      shortId = nanoid(10);
      // eslint-disable-next-line no-await-in-loop
    } while ((await dbManager.foldersCollection.findOne({ shortId })) !== null);
    await dbManager.withSession(async (session) => {
      await session.withTransaction(async () => {
        const newFolder: WithoutId<DbRootFolder> = {
          parentFolderId: null,
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
      });
    });
    return {
      shortId,
    };
  });

  apiInstance.post<{
    Params: FolderParams,
    Body: CreateFolderBody,
    Reply: CreateFolderReply,
  }>('/folders/:folderShortId/create-folder', {
    schema: {
      params: folderParamsSchema,
      body: createFolderBodySchema,
      response: {
        200: createFolderReplySchema,
      },
      security: [
        { apiTokenHeader: [] },
        { sessionCookie: [] },
      ],
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, true);
    const folder = await dbManager.foldersCollection.findOne({
      shortId: request.params.folderShortId,
    });
    if (!folder) throw apiInstance.httpErrors.notFound('Folder not found');
    if (!hasRole(folder, user._id, 'editor')) throw apiInstance.httpErrors.forbidden();
    let shortId: string;
    do {
      shortId = nanoid(10);
      // eslint-disable-next-line no-await-in-loop
    } while ((await dbManager.foldersCollection.findOne({ shortId })) !== null);
    await dbManager.withSession(async (session) => {
      await session.withTransaction(async () => {
        const newFolder: WithoutId<DbChildFolder> = {
          parentFolderId: folder._id,
          rules: [],
          shortId,
          name: request.body.name.trim(),
          cache: {
            userRecursiveRole: {},
            shareRootFor: [],
          },
        };
        const result = await dbManager.foldersCollection.insertOne(newFolder);
        const childFolder: DbChildFolder = { ...newFolder, _id: result.insertedId };
        await dbManager.updateFolderCache(childFolder);
      });
    });
    return {
      shortId,
    };
  });

  const listUserFoldersReplySchema = Type.Object({
    ownedFolders: Type.Array(folderSchema),
    sharedFolders: Type.Array(folderSchema),
  });
  type ListUserFoldersReply = Static<typeof listUserFoldersReplySchema>;
  apiInstance.get<{
    Reply: ListUserFoldersReply,
  }>('/list-user-folders', {
    schema: {
      response: {
        200: listUserFoldersReplySchema,
      },
      security: [
        { apiTokenHeader: [] },
        { sessionCookie: [] },
      ],
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, true);
    const ownedFolders = await dbManager.foldersCollection.find({
      parentFolderId: null,
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
    capturedOn: Type.String(),
  });
  type Image = Static<typeof imageSchema>;
  const folderInfoReplySchema = Type.Object({
    subfolders: Type.Array(folderSchema),
    images: Type.Array(imageSchema),
    name: Type.String(),
    parentFolderShortId: Type.Union([Type.String(), Type.Null()]),
    viewer: Type.Object({
      isRootAndOwner: Type.Boolean(),
      role: Type.Union(['admin', 'owner', 'editor', 'contributor', 'viewer'].map((x) => Type.Literal(x))),
    }),
  });
  type FolderInfoReply = Static<typeof folderInfoReplySchema>;
  apiInstance.get<{
    Params: FolderParams,
    Reply: FolderInfoReply,
  }>('/folders/:folderShortId/info', {
    schema: {
      params: folderParamsSchema,
      response: {
        200: folderInfoReplySchema,
      },
      security: [
        { apiTokenHeader: [] },
        { sessionCookie: [] },
      ],
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, true);
    const folder = await dbManager.foldersCollection.findOne({
      shortId: request.params.folderShortId,
    });
    if (!folder) throw apiInstance.httpErrors.notFound('Folder not found');
    if (!hasRole(folder, user._id, 'viewer')) throw apiInstance.httpErrors.forbidden();
    let isRootAndOwner: boolean;
    let parentFolderShortId: string | null;
    if (folder.parentFolderId === null) {
      isRootAndOwner = folder.ownerId.equals(user._id);
      parentFolderShortId = null;
    } else {
      isRootAndOwner = false;
      const parentFolder = await dbManager.foldersCollection.findOne(folder.parentFolderId);
      if (parentFolder === null) throw apiInstance.httpErrors.internalServerError('Cannot find parent folder');
      parentFolderShortId = parentFolder.shortId;
    }
    const subfolders = await dbManager.foldersCollection.find({
      parentFolderId: folder._id,
    }).map(mapFolder).toArray();
    const images = await dbManager.imagesCollection.find({
      folderId: folder._id,
    }).map((image): Image => ({
      shortId: image.shortId,
      capturedOn: image.capturedOnDay,
    })).toArray();
    return {
      subfolders,
      images,
      name: folder.name,
      parentFolderShortId,
      viewer: {
        isRootAndOwner,
        role: folder.cache.userRecursiveRole[user._id.toHexString()],
      },
    };
  });

  const renameFolderBodySchema = Type.Object({
    name: Type.String(),
  });
  type RenameFolderBody = Static<typeof renameFolderBodySchema>;
  apiInstance.post<{
    Params: FolderParams,
    Body: RenameFolderBody,
  }>('/folders/:folderShortId/rename', {
    schema: {
      params: folderParamsSchema,
      body: renameFolderBodySchema,
      security: [
        { apiTokenHeader: [] },
        { sessionCookie: [] },
      ],
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, true);
    const folder = await dbManager.foldersCollection.findOne({
      shortId: request.params.folderShortId,
    });
    if (!folder) throw apiInstance.httpErrors.notFound('Folder not found');
    if (!hasRole(folder, user._id, 'editor')) throw apiInstance.httpErrors.forbidden();
    await dbManager.foldersCollection.updateOne({ _id: folder._id }, {
      $set: {
        name: request.body.name.trim(),
      },
    });
    return {};
  });
}
