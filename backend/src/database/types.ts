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
