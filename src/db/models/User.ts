import { FindOneAndUpdateOption, UpdateQuery } from "mongodb";
import db, { mdb } from "..";
import { BCRYPT_ROUNDS } from "../../util/Constants";
import Snowflake from "../../util/Snowflake";
import bcrypt from "bcrypt";
import Identicon from "identicon.js";
import Functions from "../../util/Functions";
import crypto from "crypto";

export type UserProperties = WithoutFunctions<User>;
export { User };
export default class User {
	static DEFAULTS: Nullable<UserProperties> = {
		id: null,
		flags: 0,
		handle: null,
		email: null,
		name: null,
		avatar: null,
		password: null,
		emailVerified: false,
		externalLinks: [],
		apiKey: null
	};

	/** the id of the user */
	id: string;
	/** the account flags this user has */
	flags: number;
	/** the handle of this user */
	handle: string;
	/** the email of this user */
	email: string | null;
	/** the (user)name of this user */
	name: string;
	/** the avatar of this user */
	avatar: string | null;
	/** the bcrypt hashed password of this user*/
	password: string | null;
	/** if the user has verified the email on their account */
	emailVerified: boolean;
	/** The external services this user has linked on their account */
	externalLinks: {
		type: string;
		url: string;
	}[];
	/** An api key associated with this account. */
	apiKey: string | null;
	constructor(id: string, data: UserProperties) {
		this.id = id;
		this.load(data);
	}

	private load(data: UserProperties) {
		delete (data as any)._id;
		Object.assign(
			this,
			Functions.mergeObjects(
				data,
				User.DEFAULTS
			)
		);
	}

	static async get(id: string) { return db.get("users", { id }); }
	static async create(data: Omit<Nullable<DeepPartial<UserProperties>>, "id">) {
		const id = Snowflake.generate();

		return db.collection("users").insertOne(
			Functions.mergeObjects<any, any>(
				{
					...data,
					id
				},
				this.DEFAULTS
			)
		).then(({ ops: [v] }) => new User(id, v));
	}

	async refresh() {
		const r = await db.collection("users").findOne({ id: this.id });
		if (r === null) throw new TypeError("Unexpected null on refresh");
		this.load.call(this, r);
		return this;
	}

	async mongoEdit<T = UserProperties>(d: UpdateQuery<T>, opt?: FindOneAndUpdateOption<T>) {
		const j = await db.collection<T>("users").findOneAndUpdate({ id: this.id } as any, d, opt);
		await this.refresh();
		return j;
	}

	async edit(data: DeepPartial<UserProperties>) {
		if ((data as any)._id) delete (data as any)._id;
		await mdb.collection("users").findOneAndUpdate({
			id: this.id
		}, {
			$set: Functions.mergeObjects(
				data,
				this
			)
		});

		return this.refresh();
	}

	getIdenticon(size = 128) {
		return `data:image/png;base64,${new Identicon(Functions.md5Hash(this.email!), size).toString()}`;
	}

	decodeId() { return Snowflake.decode(this.id); }

	checkPassword(pwd: string) {
		if (this.password === null) return false;
		return bcrypt.compareSync(pwd, this.password);
	}

	setPassword(pwd: string) {
		return this.edit({
			password: bcrypt.hashSync(pwd, BCRYPT_ROUNDS)
		});
	}

	async resetApiKey() {
		await this.edit({
			apiKey: crypto.randomBytes(16).toString("hex")
		});
		return this.apiKey!;
	}

	/**
	 * Convert this user object into a JSON representation.
	 * @param {boolean} [privateProps=false] - If we should return more private properties. 
	 */
	toJSON(privateProps: true): PrivateUser & { createdAt: string; };
	toJSON(privateProps?: false): PublicUser & { createdAt: string; };
	toJSON(privateProps = false) {
		const t = Functions.toJSON(
			this,
			[
				"id",
				"avatar",
				"flags",
				"handle",
				"name",
				"externalLinks"
			],
			[
				"email",
				"emailVerified"
			],
			privateProps
		);
		Object.defineProperty(t, "createdAt", {
			value: new Date(Snowflake.decode(this.id).timestamp).toISOString()
		});
		return t as typeof t & { createdAt: string; };
	}
}

export type PublicUser = Pick<User, "id" | "avatar" | "flags" | "handle" | "name">;
export type PrivateUser = Pick<User, keyof PublicUser | "email" | "emailVerified">;
