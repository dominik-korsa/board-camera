import { ObjectId } from 'mongodb';

export interface Pos {
  x: number;
  y: number;
}

export interface DbImageBoard {
  ratio: number;
  topLeft: Pos;
  topRight: Pos;
  bottomRight: Pos;
  bottomLeft: Pos;
  mmWidth: number;
  mmHeight: number;
}

export type DbCompressedImageSize = 'full' | 'small' | 'medium' | 'large';
export interface DbImage {
  _id: ObjectId;
  shortId: string;
  rawFile: {
    path: string;
    mimeType: string;
  }
  compressedFilePaths: Record<DbCompressedImageSize, string>;
  capturedOnDay: string;
  uploadedOn: Date;
  boards: DbImageBoard[] | null;
  uploaderId: ObjectId;
  folderId: ObjectId;
}

export interface DbUser {
  _id: ObjectId;
  googleId: string;
  googleRefreshToken: string;
  email: string;
}

export interface DbApiToken {
  _id: ObjectId,
  tokenId: string;
  tokenHash: string;
  ownerId: ObjectId;
  name: string;
  createdOn: Date;
}

export type Role = 'viewer' | 'contributor' | 'editor' | 'admin';
export type RecursiveRole = Role | 'owner';

export interface DbFolderRule {
  userId: ObjectId;
  role: Role;
}

export interface DbFolderCache {
  shareRootFor: ObjectId[];
  userRecursiveRole: Record<string, RecursiveRole>;
}

export interface DbFolderCommon {
  _id: ObjectId,
  rules: DbFolderRule[];
  name: string;
  shortId: string;
  cache: DbFolderCache;
}

export interface DbRootFolder extends DbFolderCommon {
  ownerId: ObjectId;
  parentFolderId: null;
}

export interface DbChildFolder extends DbFolderCommon {
  parentFolderId: ObjectId;
}

export type DbFolder = DbRootFolder | DbChildFolder;
