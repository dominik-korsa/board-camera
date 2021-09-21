import { FastifyInstance } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { DbManager } from '../../database/database';
import {
  FolderParams, folderParamsSchema, nullable, recursiveRoleSchema, roleSchema,
} from './common';
import { requireAuthentication } from '../../guards';
import { hasRole } from '../../rules';
import { DbFolderRule } from '../../database/types';

export function registerRules(apiInstance: FastifyInstance, dbManager: DbManager) {
  const getRuleItemSchema = Type.Object({
    email: Type.String({
      format: 'idn-email',
    }),
    role: roleSchema,
  });
  type GetRuleItem = Static<typeof getRuleItemSchema>;
  const mapRule = (rule: DbFolderRule): GetRuleItem => ({
    email: rule.email,
    role: rule.role,
  });

  const getRulesReplySchema = Type.Object({
    rules: Type.Array(getRuleItemSchema),
  });
  type GetRulesReply = Static<typeof getRulesReplySchema>;
  apiInstance.get<{
    Params: FolderParams,
    Reply: GetRulesReply,
  }>('/folders/:folderShortId/rules', {
    schema: {
      params: folderParamsSchema,
      response: {
        200: getRulesReplySchema,
      },
      security: [
        { apiTokenHeader: [] },
        { sessionCookie: [] },
      ],
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, true);
    const folder = await dbManager.foldersCollection.findOne({
      shortId: request.params.folderShortId,
    });
    if (!folder) throw apiInstance.httpErrors.notFound('Folder not found');
    if (!hasRole(folder, user, 'admin')) throw apiInstance.httpErrors.forbidden();
    return {
      rules: folder.rules.map(mapRule),
    };
  });

  const modifyRulesBodySchema = Type.Object({
    changes: Type.Record(Type.String({
      format: 'idn-email',
    }), nullable(roleSchema)),
  });
  type ModifyRulesBody = Static<typeof modifyRulesBodySchema>;
  const modifyRulesReplySchema = Type.Object({
    viewerNewRole: nullable(recursiveRoleSchema),
  });
  type ModifyRulesReply = Static<typeof modifyRulesReplySchema>;
  apiInstance.patch<{
    Params: FolderParams,
    Body: ModifyRulesBody,
    Reply: ModifyRulesReply,
  }>('/folders/:folderShortId/rules', {
    schema: {
      params: folderParamsSchema,
      body: modifyRulesBodySchema,
      response: {
        200: modifyRulesReplySchema,
      },
      security: [
        { apiTokenHeader: [] },
        { sessionCookie: [] },
      ],
    },
  }, async (request) => {
    const user = await requireAuthentication(request, dbManager, true);
    const folder = await dbManager.foldersCollection.findOne({
      shortId: request.params.folderShortId,
    });
    if (!folder) throw apiInstance.httpErrors.notFound('Folder not found');
    if (!hasRole(folder, user, 'admin')) throw apiInstance.httpErrors.forbidden();

    await dbManager.withTransaction(async () => {
      let rules = folder.rules.map((rule) => ({ ...rule }));
      Object.entries(request.body.changes).forEach(([email, role]) => {
        if (role === null) {
          rules = rules.filter((rule) => rule.email === email);
        } else {
          const currentRule = rules.find((rule) => rule.email === email);
          if (currentRule === undefined) rules.push({ email, role });
          else currentRule.role = role;
        }
      });
      await dbManager.foldersCollection.updateOne({
        _id: folder._id,
      }, {
        $set: {
          rules,
        },
      });
      await dbManager.updateFolderCache({
        ...folder,
        rules,
      });
    });
    const newFolder = await dbManager.foldersCollection.findOne({
      _id: folder._id,
    });
    if (newFolder === null) {
      apiInstance.log.error('Cannot find folder after modifying rules');
      throw apiInstance.httpErrors.internalServerError();
    }
    return {
      rules: newFolder.rules.map(mapRule),
      viewerNewRole: newFolder.cache.userRecursiveRole[user.email] ?? null,
    };
  });
}
