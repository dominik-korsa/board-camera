import { Static, Type } from '@sinclair/typebox';

export const folderParamsSchema = Type.Object({
  folderShortId: Type.String(),
});
export type FolderParams = Static<typeof folderParamsSchema>;

export const imageParamsSchema = Type.Intersect([
  folderParamsSchema,
  Type.Object({
    imageShortId: Type.String(),
  }),
]);
export type ImageParams = Static<typeof imageParamsSchema>;

export const emptyReplySchema = Type.Object({});
export type EmptyReply = Static<typeof emptyReplySchema>;
