import { FindOneAndUpdateOption, UpdateQuery } from "mongodb";
import db, { mdb } from "..";
import Snowflake from "../../util/Snowflake";
import Functions from "../../util/Functions";
import { RATINGS } from "../../util/Constants";
import config from "../../config";

export type ImageProperties = WithoutFunctions<Image>;
export { Image };
export default class Image {
	static DEFAULTS: Nullable<ImageProperties> = {
		id: null,
		uploader: null,
		album: null,
		rating: RATINGS.UNKNOWN,
		file: {
			originalName: null,
			md5: null,
			type: null
		}
	};

	/** the id of the image */
	id: string;
	/** the id of the uploader of this image */
	uploader: string;
	/** the id of the album this image belongs to */
	album: string;
	/** the rating of this image */
	rating: typeof RATINGS[keyof typeof RATINGS];
	file: {
		/** the original name of the file */
		originalName: string;
		/** the md5 of the file */
		md5: string;
		/** the type of the file */
		type: keyof typeof config["mimes"];
	};
	constructor(id: string, data: ImageProperties) {
		this.id = id;
		this.load(data);
	}

	private load(data: ImageProperties) {
		delete (data as any)._id;
		Object.assign(
			this,
			Functions.mergeObjects(
				data,
				Image.DEFAULTS
			)
		);
	}

	static async get(id: string) { return db.get("images", { id }); }
	static async create(data: Omit<Nullable<DeepPartial<ImageProperties>>, "id">) {
		const id = Snowflake.generate();

		return db.collection("images").insertOne(
			Functions.mergeObjects<any, any>(
				{
					...data,
					id
				},
				this.DEFAULTS
			)
		).then(({ ops: [v] }) => new Image(id, v));
	}

	async refresh() {
		const r = await db.collection("images").findOne({ id: this.id });
		if (r === null) throw new TypeError("Unexpected null on refresh");
		this.load.call(this, r);
		return this;
	}

	async mongoEdit<T = ImageProperties>(d: UpdateQuery<T>, opt?: FindOneAndUpdateOption<T>) {
		const j = await db.collection<T>("images").findOneAndUpdate({ id: this.id } as any, d, opt);
		await this.refresh();
		return j;
	}

	async edit(data: DeepPartial<ImageProperties>) {
		if ((data as any)._id) delete (data as any)._id;
		await mdb.collection("images").findOneAndUpdate({
			id: this.id
		}, {
			$set: Functions.mergeObjects(
				data,
				this
			)
		});

		return this.refresh();
	}

	decodeId() { return Snowflake.decode(this.id); }

	// need to do a function because it gets included into properties
	getExt() { return config.mimes[this.file.type]; }

	getViewURL() { return `${config.web.baseURL()}/images/${this.id}`; }
	getFileURL() { return `${config.web.imageURL(this.album)}/${this.id}.${this.getExt()}`; }

	/**
	 * Convert this image object image a JSON representation.
	 */
	toJSON(): PublicImage & { createdAt: string; } {
		const t = Functions.toJSON(
			this,
			[
				"id",
				"uploader",
				"album",
				"rating",
				"file"
			],
			[],
			false
		);
		Object.defineProperty(t, "createdAt", {
			value: new Date(Snowflake.decode(this.id).timestamp).toISOString()
		});
		return t as typeof t & { createdAt: string; };
	}
}

export type PublicImage = Pick<Image, "id">;
