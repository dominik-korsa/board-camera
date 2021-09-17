import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import { DbManager } from '../database/database';
import { requireAuthentication } from '../guards';

export function registerAPITokens(server: FastifyInstance, dbManager: DbManager) {
  server.post('/api/api-tokens/generate', async (request) => {
    const user = await requireAuthentication(server, request, dbManager, false);
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
      server.log.error(error);
      throw server.httpErrors.internalServerError();
    }
  });
}
