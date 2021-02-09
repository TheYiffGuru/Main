/// <reference path="../util/@types/Database.d.ts" />
import { Collection, MongoClient, WithId, FilterQuery } from "mongodb";
import config from "../config";
import Logger from "../util/Logger";
import Timers from "../util/Timers";
import deasync from "deasync";
import IORedis from "ioredis";
import {
	Album, AlbumProperties,
	Image, ImageProperties,
	User, UserProperties
} from "./models";


export type Names = "album" | "image" | "user";
export type CollectionNames = `${Names}s`;

class Database {
	static connection: MongoClient;
	static r: IORedis.Redis;
	private constructor() {
		throw new TypeError("This class may not be instantiated, use static methods.");
	}

	static init() {
		const r = this.r = new IORedis(config.services.redis.port, config.services.redis.host, {
			password: config.services.redis.password,
			db: config.services.redis.db,
			enableReadyCheck: true,
			autoResendUnfulfilledCommands: true,
			connectionName: "YiffyGraphics"
		});

		r
			.on("connect", () => Logger.debug("Redis", `Connected to redis://${config.services.redis.host}:${config.services.redis.port} (db: ${config.services.redis.db})`))


		try {
			const t = new Timers(false);
			t.start("connect");
			Logger.debug("Database", `Connecting to mongodb://${config.services.db.host}:${config.services.db.port}?retryWrites=true&w=majority (SSL: ${config.services.db.options.ssl ? "Yes" : "No"})`);
			this.connection = deasync(MongoClient.connect)(`mongodb://${config.services.db.host}:${config.services.db.port}/?retryWrites=true&w=majority`, config.services.db.options);
			t.end("connect");
			Logger.debug("Database", `Connected to mongodb://${config.services.db.host}:${config.services.db.port}?retryWrites=true&w=majority (SSL: ${config.services.db.options.ssl ? "Yes" : "No"}) in ${t.calc("connect")}ms`);
		} catch (e) {
			Logger.error("Database", `Error connecting to MongoDB instance (mongodb://${config.services.db.host}:${config.services.db.port}?retryWrites=true&w=majority, SSL: ${config.services.db.options.ssl ? "Yes" : "No"})\nReason: ${e?.stack || e}`);
			return; // don't need to rethrow it as it's already logged
		}
	}

	static get Redis() { return this.r; }
	static get mongo() { return this.connection; }
	static get mdb() { return this.mongo.db(config.services.db.db); }

	static async executeRedisQuery<K extends keyof IORedis.Commands, V = string>(cmd: K, ...args: Parameters<IORedis.Commands[K]>): Promise<V | null> {
		const start = performance.now();
		let v: V;
		try {
			v = await this.r.send_command(cmd, ...args as any);
		} catch (e) {
			Logger.error("Redis", e);
			return null;
		}
		const end = performance.now();
		Logger.error(["Redis", `${cmd.toUpperCase()} ${args[0]}`], parseFloat((end - start).toFixed(3)));
		return v || null;
	}

	static collection(col: "albums"): Collection<WithId<AlbumProperties>>;
	static collection(col: "images"): Collection<WithId<ImageProperties>>;
	static collection(col: "users"): Collection<WithId<UserProperties>>;
	static collection<T = any>(col: string): Collection<T>;
	static collection(col: string) {
		// I cannot be bothered to overengineer these types
		return this.mdb.collection(col);
	}

	static async get(type: Plural<"album">, data: FilterQuery<Database.GetAlbumOptions>): Promise<Album | null>;
	static async get(type: Plural<"image">, data: FilterQuery<Database.GetImageOptions>): Promise<Image | null>;
	static async get(type: Plural<"user">, data: FilterQuery<Database.GetUserOptions>): Promise<User | null>;
	static async get(type: Names | CollectionNames, data: object) {
		switch (type) {
			case "album": case "albums": return this.collection("albums").findOne(data).then(d => d ? new Album(d.id, d) : null);
			case "image": case "images": return this.collection("images").findOne(data).then(d => d ? new Image(d.id, d) : null);
			case "user": case "users": return this.collection("users").findOne(data).then(d => d ? new User(d.id, d) : null);
			default: return null;
		}
	}

	static async create(type: Plural<"album">, data: Database.CreateAlbumOptions): Promise<Album | null>;
	static async create(type: Plural<"image">, data: Database.CreateImageOptions): Promise<Image | null>;
	static async create(type: Plural<"user">, data: Database.CreateUserOptions): Promise<User | null>;
	static async create(type: Names | CollectionNames, data: object) {
		switch (type) {
			case "album": case "albums": return Album.create(data);
			case "image": case "images": return Image.create(data);
			case "user": case "users": return User.create(data);
			default: return null;
		}
	}
}

Database.init();

const { mongo, mdb } = Database;

export {
	Database as db,
	mdb,
	mongo
};
export default Database;
