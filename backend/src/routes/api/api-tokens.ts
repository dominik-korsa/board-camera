import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import { Static, Type } from '@sinclair/typebox';
import { DbManager } from '../../database/database';
import { requireAuthentication } from '../../guards';
import { EmptyReply, emptyReplySchema } from './common';

export function registerAPITokens(apiInstance: FastifyInstance, dbManager: DbManager) {
  const generateTokenBodySchema = Type.Object({
    name: Type.String(),
  });
  type GenerateTokenBody = Static<typeof generateTokenBodySchema>;
  const generateTokenReplySchema = Type.Object({
    token: Type.String(),
  });
  type GenerateTokenReply = Static<typeof generateTokenReplySchema>;
  apiInstance.post<{
    Body: GenerateTokenBody,
    Reply: GenerateTokenReply,
  }>('/api-tokens/generate', {
    schema: {
      body: generateTokenBodySchema,
      response: {
        200: generateTokenReplySchema,
      },
      security: [
        { sessionCookie: [] },
      ],
      tags: ['internal'],
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, false);
    try {
      let tokenId;
      do {
        tokenId = nanoid(15);
        // eslint-disable-next-line no-await-in-loop
      } while ((await dbManager.apiTokensCollection.findOne({ tokenId })) !== null);
      const keySecret = nanoid(15);
      const token = `${tokenId}:${keySecret}`;
      const hash = await bcrypt.hash(token, 8);
      await dbManager.apiTokensCollection.insertOne({
        tokenId,
        tokenHash: hash,
        ownerId: user._id,
        createdOn: new Date(),
        name: request.body.name,
      });
      return { token };
    } catch (error) {
      apiInstance.log.error(error);
      throw apiInstance.httpErrors.internalServerError();
    }
  });

  const listTokensReplySchema = Type.Object({
    tokens: Type.Array(Type.Object({
      tokenId: Type.String(),
      name: Type.String(),
      createdOn: Type.String({
        format: 'date-time',
      }),
    })),
  });
  type ListTokensReplySchema = Static<typeof listTokensReplySchema>;
  apiInstance.get<{
    Reply: ListTokensReplySchema,
  }>('/api-tokens/list', {
    schema: {
      response: {
        200: listTokensReplySchema,
      },
      security: [
        { sessionCookie: [] },
      ],
      tags: ['internal'],
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, false);
    const tokens = await dbManager.apiTokensCollection.find({
      ownerId: user._id,
    }).map((token) => ({
      tokenId: token.tokenId,
      name: token.name,
      createdOn: token.createdOn.toISOString(),
    })).toArray();
    return {
      tokens,
    };
  });

  const revokeTokenBodySchema = Type.Union([
    Type.Object({
      type: Type.Literal('id'),
      value: Type.String({
        pattern: '^[A-Za-z0-9_-]+$',
      }),
    }),
    Type.Object({
      type: Type.Literal('token'),
      value: Type.String({
        pattern: '^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$',
      }),
    }),
  ]);
  type RevokeTokenBody = Static<typeof revokeTokenBodySchema>;
  apiInstance.post<{
    Body: RevokeTokenBody,
    Reply: EmptyReply,
  }>('/api-tokens/revoke', {
    schema: {
      body: revokeTokenBodySchema,
      response: {
        200: emptyReplySchema,
      },
      security: [
        { sessionCookie: [] },
      ],
      tags: ['internal'],
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, false);
    let tokenId: string;
    if (request.body.type === 'token') [tokenId] = request.body.value.split(':');
    else tokenId = request.body.value;
    const token = await dbManager.apiTokensCollection.findOne({
      tokenId,
    });
    if (token === null) throw apiInstance.httpErrors.notFound('Token not found');
    if (!token.ownerId.equals(user._id)) throw apiInstance.httpErrors.forbidden();
    await dbManager.apiTokensCollection.deleteOne({
      tokenId,
    });
    return {};
  });
}
