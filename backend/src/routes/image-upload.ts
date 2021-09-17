import { Static, Type } from '@sinclair/typebox';
import path from 'path';
import { nanoid } from 'nanoid';
import fse from 'fs-extra';
import { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { requireAuthentication } from '../guards';
import { mapObject, MultipartData } from '../utils';
import { hasRole } from '../rules';
import { config } from '../config';
import analyseImage from '../analyse';
import { DbManager } from '../database/database';
import { DbImageBoard } from '../database/types';

export function registerImageUpload(server: FastifyInstance, dbManager: DbManager) {
  const uploadImageReplySchema = Type.Object({
    shortId: Type.String(),
  });
  type UploadImageReply = Static<typeof uploadImageReplySchema>;
  server.post<{
    Params: {
      folderShortId: string;
    },
    Reply: UploadImageReply,
  }>('/api/folders/:folderShortId/upload-image', {
    schema: {
      response: {
        200: uploadImageReplySchema,
      },
    },
  }, async (request) => {
    const user = await requireAuthentication(server, request, dbManager, true);
    const data = request.body as MultipartData;
    const { file } = data.files;
    if (!file) throw server.httpErrors.badRequest('Missing "file"');
    const supportedTypes = ['image/bmp', 'image/jpeg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.mimeType)) throw server.httpErrors.unsupportedMediaType(`Unsupported media type. Supported formats: ${supportedTypes.map((x) => `"${x}"`).join(', ')}`);
    if (!data.fields.capturedOn || typeof data.fields.capturedOn !== 'string') {
      throw server.httpErrors.badRequest('Missing "capturedOn"');
    }
    if (Number.isNaN(Date.parse(data.fields.capturedOn))) throw server.httpErrors.badRequest('Invalid date');
    const folder = await dbManager.foldersCollection.findOne({
      shortId: request.params.folderShortId,
    });
    if (folder === null) throw server.httpErrors.notFound('Folder not found');
    if (!hasRole(folder, user._id, 'editor')) throw server.httpErrors.forbidden();

    let folderPath: string;
    do {
      folderPath = path.join(config.storagePath, `${nanoid(12)}`);
      // eslint-disable-next-line no-await-in-loop
    } while (await fse.pathExists(folderPath));
    await fse.ensureDir(folderPath);
    const rawPath = path.join(folderPath, `raw${path.extname(file.filename)}`);
    const fullPath = path.join(folderPath, 'full.webp');
    const getTransform = (name: string, width: number, height: number) => {
      const filePath = path.join(folderPath, `${name}.webp`);
      return {
        filePath,
        execute: async () => sharp(file.data)
          .rotate()
          .resize({
            width,
            height,
            fit: 'outside',
            withoutEnlargement: true,
          })
          .toFile(filePath),
      };
    };
    const transforms: Record<'small' | 'medium' | 'large', ReturnType<typeof getTransform>> = {
      small: getTransform('small', 426, 240),
      medium: getTransform('medium', 854, 480),
      large: getTransform('large', 1920, 1080),
    };

    let boards: DbImageBoard[] | null = null;
    await Promise.all([
      fse.writeFile(rawPath, file.data),
      async () => {
        try {
          boards = await analyseImage(file.data, dbManager, [[0, 1, 2, 3]]);
        } catch (error) { server.log.error(error); }
      },
      sharp(file.data).rotate().toFile(fullPath),
      Promise.all(Object.values(transforms).map((x) => x.execute())),
    ]);

    let shortId: string;
    do {
      shortId = nanoid(10);
      // eslint-disable-next-line no-await-in-loop
    } while ((await dbManager.imagesCollection.findOne({ shortId })) !== null);
    await dbManager.imagesCollection.insertOne({
      shortId,
      boards,
      capturedOnDate: data.fields.capturedOn,
      uploadedOnDateTime: new Date().toISOString(),
      folderId: folder._id,
      uploaderId: user._id,
      rawFile: {
        path: rawPath,
        mimeType: file.mimeType,
      },
      compressedFilePaths: {
        full: fullPath,
        ...mapObject(transforms, (x) => x.filePath),
      },
    });
    return {
      shortId,
    };
  });
}
