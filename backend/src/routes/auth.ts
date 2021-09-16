import { FastifyInstance } from "fastify";
import config from "../config";
import { DatabaseManager } from "../database/database";
import {GenerateAuthUrlOpts, OAuth2Client} from "google-auth-library";
import {getGoogleKeys} from "../auth";

export default async function registerAuth(server: FastifyInstance, dbManager: DatabaseManager) {
    const keys = await getGoogleKeys();
    const client = new OAuth2Client(
        keys.web.client_id,
        keys.web.client_secret,
        new URL('auth/google-callback', config.baseUrl).toString(),
    );

    const generateAuthUrl = (retry: boolean, sub?: string) => {
        const opts: GenerateAuthUrlOpts = {
            scope: ['https://www.googleapis.com/auth/userinfo.profile', 'openid'],
            access_type: 'offline',
            prompt: retry ? 'consent' : `select_account`,
            login_hint: sub,
        };
        return client.generateAuthUrl(opts);
    };

    server.get('/auth/sign-in/google', async (request, reply) => {
        if (request.session.get('user-id')) {
            reply.redirect('/')
            return
        }
        reply.redirect(generateAuthUrl(false));
    });

    server.get<{
        Querystring: Record<string, unknown>
    }>('/auth/google-callback', async (request, reply) => {
        if (typeof request.query.code !== 'string') throw server.httpErrors.badRequest('Missing code param');
        const { tokens } = await client.getToken(request.query.code);
        if (!tokens.id_token) {
            console.error('Missing id_token');
            throw server.httpErrors.internalServerError();
        }
        const loginTicket = await client.verifyIdToken({
            idToken: tokens.id_token,
        });
        const id = loginTicket.getUserId();
        if (id === null) throw server.httpErrors.internalServerError('Cannot get user id');
        const user = await dbManager.usersCollection.findOne({
            googleId: id,
        });
        let userId;
        if (user) userId = user._id;
        else {
            if (!tokens.refresh_token) {
                console.log('Account not found in database, but refresh token is missing. Redirecting...');
                reply.redirect(generateAuthUrl(true, loginTicket.getPayload()?.sub));
                return;
            }
            const {insertedId} = await dbManager.usersCollection.insertOne({
                googleId: id,
                googleRefreshToken: tokens.refresh_token,
            });
            userId = insertedId;
        }
        request.session.set('user-id', userId.toHexString());
        reply.redirect('/');
    });

    server.get('/auth/sign-out', (request, reply) => {
        request.session.set('user-id', undefined);
        reply.redirect('/');
    });
}
