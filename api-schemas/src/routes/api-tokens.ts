import { Static, Type } from '@sinclair/typebox';
import { trimmedStringSchema } from '../common';

const tokenNameSchema = trimmedStringSchema({
  maxLength: 64,
});
export const generateTokenBodySchema = Type.Object({
  name: tokenNameSchema,
});
export type GenerateTokenBody = Static<typeof generateTokenBodySchema>;
export const generateTokenReplySchema = Type.Object({
  token: Type.String(),
});
export type GenerateTokenReply = Static<typeof generateTokenReplySchema>;

export const listTokensReplySchema = Type.Object({
  tokens: Type.Array(Type.Object({
    tokenId: Type.String(),
    name: Type.String(),
    createdOn: Type.String({
      format: 'date-time',
    }),
  })),
});
export type ListTokensReplySchema = Static<typeof listTokensReplySchema>;
