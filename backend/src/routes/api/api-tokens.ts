import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import { Static, Type } from '@sinclair/typebox';
import { DbManager } from '../../database/database';
import { requireAuthentication } from '../../guards';

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
}
