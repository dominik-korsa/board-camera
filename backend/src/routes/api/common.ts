import { Static, TSchema, Type } from '@sinclair/typebox';
import { recursiveRoles, roles } from '../../database/types';

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

export const roleSchema = Type.Union(roles.map((x) => Type.Literal(x)));
export const recursiveRoleSchema = Type.Union(recursiveRoles.map((x) => Type.Literal(x)));

export function nullable<T extends TSchema>(type: T) {
  return Type.Union([type, Type.Null()]);
}
