import {
  ClientSession, Collection, Db, MongoClient,
} from 'mongodb';
import {
  DbApiToken, DbFolder, DbFolderCache, DbImage, DbUser, RecursiveRole,
} from './types';
import { config } from '../config';
import { compareRoles } from '../rules';

export class DbManager {
  private client: MongoClient;

  private db: Db;

  public imagesCollection: Collection<DbImage>;

  public usersCollection: Collection<DbUser>;

  public apiTokensCollection: Collection<DbApiToken>;

  public foldersCollection: Collection<DbFolder>;

  constructor(client: MongoClient) {
    this.client = client;
    this.db = this.client.db();
    this.imagesCollection = this.db.collection<DbImage>('images');
    this.usersCollection = this.db.collection<DbUser>('users');
    this.apiTokensCollection = this.db.collection<DbApiToken>('api-tokens');
    this.foldersCollection = this.db.collection<DbFolder>('folders');
  }

  async init() {
    await this.imagesCollection.createIndex({
      folderId: 1,
      shortId: 1,
    }, { unique: true });
    await this.imagesCollection.createIndex({ shortId: 1 });

    await this.usersCollection.createIndex({ googleId: 1 }, { unique: true });

    await this.apiTokensCollection.createIndex({ tokenId: 1 }, { unique: true });

    await this.foldersCollection.createIndex({ shortId: 1 }, { unique: true });
    await this.foldersCollection.createIndex({ ownerId: 1 });
    await this.foldersCollection.createIndex({ parentFolderId: 1 });
    await this.foldersCollection.createIndex({ 'cache.shareRootFor': 1 });
  }

  async updateFolderCache(folder: DbFolder): Promise<void> {
    if (folder.parentFolderId === null) return this.updateFolderCacheLoop(folder, {});
    const parent = await this.foldersCollection.findOne(folder.parentFolderId);
    if (!parent) throw new Error(`Cannot find parent folder of ${folder.shortId}`);
    return this.updateFolderCacheLoop(folder, parent.cache.userRecursiveRole);
  }

  private async updateFolderCacheLoop(
    folder: DbFolder,
    parentUserRecursiveRole: Record<string, RecursiveRole>,
  ) {
    const newCache: DbFolderCache = {
      shareRootFor: [],
      userRecursiveRole: {},
    };
    Object.entries(parentUserRecursiveRole).forEach(([key, value]) => {
      newCache.userRecursiveRole[key] = value;
    });
    if (folder.parentFolderId === null) newCache.userRecursiveRole[folder.ownerId.toHexString()] = 'owner';
    folder.rules.forEach((rule) => {
      const prevRole = newCache.userRecursiveRole[rule.userId.toHexString()];
      if (prevRole === undefined) newCache.shareRootFor.push(rule.userId);
      if (compareRoles(rule.role, prevRole) > 0) {
        newCache.userRecursiveRole[rule.userId.toHexString()] = rule.role;
      }
    });
    await this.foldersCollection.updateOne({
      _id: folder._id,
    }, {
      $set: { cache: newCache },
    });
    await Promise.all(
      await this.foldersCollection.find({
        parentFolderId: folder._id,
      }).map((childFolder) => this.updateFolderCache(childFolder))
        .toArray(),
    );
  }

  async updateAllFolderCaches() {
    await Promise.all(
      await this.foldersCollection.find({ parentFolderId: null })
        .map((folder) => this.updateFolderCache(folder))
        .toArray(),
    );
  }

  async withSession<T, Args extends unknown[]>(
    fn: (session: ClientSession, ...args: Args) => Promise<T>,
    ...args: Args
  ): Promise<T> {
    const session = this.client.startSession({
      causalConsistency: true,
    });
    try {
      const result = await fn(session, ...args);
      await session.endSession();
      return result;
    } catch (error) {
      await session.endSession();
      throw error;
    }
  }
}

export async function connectDb() {
  const client = new MongoClient(config.mongodbUrl);
  await client.connect();
  const manager = new DbManager(client);
  await manager.init();
  return manager;
}
