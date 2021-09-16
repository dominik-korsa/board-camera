import {FastifyInstance} from "fastify";
import {DatabaseManager} from "../database/database";
import {requireAuthentication} from "../guards";
import {nanoid} from "nanoid";
import bcrypt from 'bcrypt';

export function registerAPITokens(server: FastifyInstance, dbManager: DatabaseManager) {
    server.post('/api/api-tokens/generate', async (request, reply) => {
        const user = await requireAuthentication(request, dbManager, false);
        try {
            let tokenId;
            do {
                tokenId = nanoid(15)
            } while ((await dbManager.apiTokensCollection.findOne({tokenId})) !== null)
            const keySecret = nanoid(15);
            const token = `${tokenId}:${keySecret}`;
            const hash = await bcrypt.hash(token, 8);
            await dbManager.apiTokensCollection.insertOne({
                tokenId: tokenId,
                tokenHash: hash,
                ownerId: user._id,
            });
            reply.send({
                token,
            });
        } catch (error) {
            console.error(error);
            throw server.httpErrors.internalServerError();
        }
    })
}