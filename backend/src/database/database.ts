import { Collection, Db, MongoClient } from "mongodb";
import {DbApiToken, DbImage, DbUser} from "./types";
import {config} from "../config";

export class DatabaseManager {
    private db: Db;
    public imagesCollection: Collection<DbImage>;
    public usersCollection: Collection<DbUser>;
    public apiTokensCollection: Collection<DbApiToken>;

    constructor(client: MongoClient) {
        this.db = client.db();
        this.imagesCollection = this.db.collection<DbImage>('images');
        this.usersCollection = this.db.collection<DbUser>('users');
        this.apiTokensCollection = this.db.collection<DbApiToken>('api-tokens');
    }

    async init() {
        await this.usersCollection.createIndex({
            googleId: 1,
        }, {
            unique: true,
        });
        await this.apiTokensCollection.createIndex({
            tokenId: 1,
        }, {
            unique: true,
        });
    }
}

export async function connectDb() {
    const client = new MongoClient(config.mongodbUrl);
    await client.connect();
    const manager = new DatabaseManager(client);
    await manager.init();
    return manager;
}
