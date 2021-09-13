import { Collection, Db, MongoClient } from "mongodb";
import {DbImage} from "./types";
import config from "../config";

export class DatabaseManager {
    private db: Db;
    public imagesCollection: Collection<DbImage>;

    constructor(client: MongoClient) {
        this.db = client.db();
        this.imagesCollection = this.db.collection<DbImage>('images');
    }
}

export async function connectDb() {
    const client = new MongoClient(config.mongodbUrl);
    await client.connect();
    return new DatabaseManager(client);
}
