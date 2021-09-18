import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import { Static, Type } from '@sinclair/typebox';
import { DbManager } from '../../database/database';
import { requireAuthentication } from '../../guards';

export function registerAPITokens(apiInstance: FastifyInstance, dbManager: DbManager) {
  const generateTokenReplySchema = Type.Object({
    token: Type.String(),
  });
  type GenerateTokenReply = Static<typeof generateTokenReplySchema>;
  apiInstance.post<{
    Reply: GenerateTokenReply,
  }>('/api-tokens/generate', {
    schema: {
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
      });
      return { token };
    } catch (error) {
      apiInstance.log.error(error);
      throw apiInstance.httpErrors.internalServerError();
    }
  });
}
