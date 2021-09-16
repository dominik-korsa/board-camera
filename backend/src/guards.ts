import {FastifyRequest} from "fastify";
import {DatabaseManager} from "./database/database";
import {DbUser} from "./database/types";
import {ObjectId} from "mongodb";

export async function requireAuthentication(request: FastifyRequest, dbManager: DatabaseManager): Promise<DbUser> {
    const userId: string = request.session.get('user-id');
    if (!userId) throw request.server.httpErrors.unauthorized();
    const user = await dbManager.usersCollection.findOne(ObjectId.createFromHexString(userId));
    if (!user) {
        request.session.set('user-id', undefined);
        throw request.server.httpErrors.unauthorized();
    }
    return user;
}
