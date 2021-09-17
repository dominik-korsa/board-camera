import {FastifyInstance, FastifyRequest} from "fastify";
import {requireAuthentication} from "../guards";
import {hasRole} from "../rules";
import fse from "fs-extra";
import {DbManager} from "../database/database";
import {DbCompressedImageSize} from "../database/types";

type ImageParams = {
    folderShortId: string;
    imageShortId: string;
}

export function registerImageDownload(server: FastifyInstance, dbManager: DbManager) {
    const getImage = async (request: FastifyRequest<{ Params: ImageParams }>) => {
        const user = await requireAuthentication(request, dbManager, true);
        const folder = await dbManager.foldersCollection.findOne({
            shortId: request.params.folderShortId,
        });
        if (folder === null) throw server.httpErrors.notFound(`Folder not found`);
        if (!hasRole(folder, user._id, 'viewer')) throw server.httpErrors.forbidden();
        const image = await dbManager.imagesCollection.findOne({
            shortId: request.params.imageShortId,
            folderId: folder._id,
        });
        if (image === null) throw server.httpErrors.notFound('Image not found');
        return image;
    };

    server.get<{
        Params: ImageParams,
    }>('/api/folders/:folderShortId/images/:imageShortId/raw', async (request, reply) => {
        const image = await getImage(request);
        reply.type(image.rawFile.mimeType).send(fse.createReadStream(image.rawFile.path));
    });

    const sizes: DbCompressedImageSize[] = ['full', 'small', 'medium', 'large'];
    sizes.map((size) => {
        server.get<{
            Params: ImageParams,
        }>(`/api/folders/:folderShortId/images/:imageShortId/${size}.webp`, async (request, reply) => {
            const image = await getImage(request);
            reply.type('image/webp').send(fse.createReadStream(image.compressedFilePaths[size]));
        });
    })
}
