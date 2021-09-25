import { FastifyInstance } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { DbManager } from '../../database/database';
import { nullable } from './common';
import { getAuthenticatedUser } from '../../guards';
import { getUserInfo } from '../../auth-utils';

export function registerUserInfo(apiInstance: FastifyInstance, dbManager: DbManager) {
  const getViewerReplySchema = nullable(Type.Object({
    name: Type.String(),
    email: Type.String(),
    avatarUrl: Type.String(),
  }));
  type GetViewerReply = Static<typeof getViewerReplySchema>;
  apiInstance.get<{
    Reply: GetViewerReply,
  }>('/viewer', {
    schema: {
      response: {
        200: getViewerReplySchema,
      },
    },
  }, async (request) => {
    const authenticatedUser = await getAuthenticatedUser(request, dbManager, true);
    if (authenticatedUser === null) return null;
    const userInfo = await getUserInfo(authenticatedUser.user, true);
    return {
      email: authenticatedUser.user.email,
      name: userInfo.name,
      avatarUrl: userInfo.picture,
    };
  });
}
