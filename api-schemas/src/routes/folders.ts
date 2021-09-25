import { Static, Type } from '@sinclair/typebox';
import { recursiveRoleSchema } from '../common';

export const folderSchema = Type.Object({
  shortId: Type.String(),
  name: Type.String(),
});
export type Folder = Static<typeof folderSchema>;

export const createFolderBodySchema = Type.Object({
  name: Type.String(),
});
export type CreateFolderBody = Static<typeof createFolderBodySchema>;
export const createFolderReplySchema = Type.Object({
  shortId: Type.String(),
});
export type CreateFolderReply = Static<typeof createFolderReplySchema>;

export const listUserFoldersReplySchema = Type.Object({
  ownedFolders: Type.Array(folderSchema),
  sharedFolders: Type.Array(folderSchema),
});
export type ListUserFoldersReply = Static<typeof listUserFoldersReplySchema>;

export const imageSchema = Type.Object({
  shortId: Type.String(),
  capturedOn: Type.String({
    format: 'date',
  }),
});
export type Image = Static<typeof imageSchema>;
export const folderInfoReplySchema = Type.Object({
  subfolders: Type.Array(folderSchema),
  images: Type.Array(imageSchema),
  name: Type.String(),
  parentFolderShortId: Type.Union([Type.String(), Type.Null()]),
  viewer: Type.Object({
    isRootAndOwner: Type.Boolean(),
    role: recursiveRoleSchema,
  }),
});
export type FolderInfoReply = Static<typeof folderInfoReplySchema>;

export const renameFolderBodySchema = Type.Object({
  name: Type.String(),
});
export type RenameFolderBody = Static<typeof renameFolderBodySchema>;

export const folderAncestorsReplySchema = Type.Object({
  self: folderSchema,
  ancestors: Type.Array(folderSchema, {
    description: 'In order: parent, grandparent, great-grandparent (...)',
  }),
});
export type FolderAncestorsReply = Static<typeof folderAncestorsReplySchema>;
