import {ObjectId} from "mongodb";

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

export interface DbImage {
    _id: ObjectId;
    path: string;
    capturedOnDate: string;
    uploadedOnDateTime: string;
    boards: DbImageBoard[] | null;
}

export interface DbUser {
    _id: ObjectId;
    googleId: string;
    googleRefreshToken: string;
}

export interface DbApiToken {
    _id: ObjectId,
    tokenId: string;
    tokenHash: string;
    ownerId: ObjectId;
}

export interface DbFolderRule {
    users: ObjectId[];
    role: 'viewer' | 'uploader' | 'editor' | 'admin';
}

export interface DbFolderCommon {
    rules: DbFolderRule[];
    name: string;
    shortId: string;
}

export interface DbRootFolder extends DbFolderCommon {
    owner: ObjectId;
    parentFolder: null;
}

export interface DbChildFolder extends DbFolderCommon {
    parentFolder: ObjectId;
}

export type DbFolder = DbRootFolder | DbChildFolder;
