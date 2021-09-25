export interface ApiViewer {
  email: string;
  name: string;
  avatarUrl: string;
}
export type GetViewerReply = ApiViewer | null;
