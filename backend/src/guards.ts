import {FastifyRequest} from "fastify";
import {DatabaseManager} from "./database/database";
import {DbApiToken, DbUser} from "./database/types";
import {ObjectId} from "mongodb";
import bcrypt from 'bcrypt';

export class InvalidApiTokenError extends Error {
    constructor() { super('InvalidApiTokenError'); }
}

export async function getAndVerifyApiToken(rawToken: string, dbManager: DatabaseManager): Promise<DbApiToken> {
    let token = rawToken.trim();
    const parts = rawToken.split(':');
    if (parts.length !== 2) throw new InvalidApiTokenError();
    const apiToken = await dbManager.apiTokensCollection.findOne({
        tokenId: parts[0],
    });
    if (!apiToken) throw new InvalidApiTokenError();
    if (!await bcrypt.compare(token, apiToken.tokenHash)) throw new InvalidApiTokenError();
    return apiToken;
}

export async function requireAuthentication(request: FastifyRequest, dbManager: DatabaseManager, allowToken: boolean): Promise<DbUser> {
    let rawToken = request.headers['x-api-token'];
    if (Array.isArray(rawToken)) rawToken = rawToken[0];
    if (rawToken) {
        if (!allowToken) throw request.server.httpErrors.unauthorized('API tokens are not accepted for this resource');
        let apiToken: DbApiToken;
        try {
           apiToken = await getAndVerifyApiToken(rawToken, dbManager);
        } catch (error) {
            if (!(error instanceof InvalidApiTokenError)) console.error(error);
            throw request.server.httpErrors.unauthorized('Invalid API token');
        }
        const user = await dbManager.usersCollection.findOne(apiToken.ownerId);
        if (user === null) throw request.server.httpErrors.unauthorized();
        return user;
    } else {
        const userId: string = request.session.get('user-id');
        if (!userId) throw request.server.httpErrors.unauthorized();
        const user = await dbManager.usersCollection.findOne(ObjectId.createFromHexString(userId));
        if (!user) {
            request.session.set('user-id', undefined);
            throw request.server.httpErrors.unauthorized();
        }
        return user;
    }
}
