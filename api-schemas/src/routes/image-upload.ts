import { Static, Type } from '@sinclair/typebox';

export const uploadImageBodySchema = Type.Object({
  capturedOn: Type.String({
    format: 'date',
  }),
});
export type UploadImageBody = Static<typeof uploadImageBodySchema>;
export const uploadImageReplySchema = Type.Object({
  shortId: Type.String(),
});
export type UploadImageReply = Static<typeof uploadImageReplySchema>;
