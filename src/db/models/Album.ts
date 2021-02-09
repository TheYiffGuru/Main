import { FindOneAndUpdateOption, UpdateQuery } from "mongodb";
import db, { mdb } from "..";
import Snowflake from "../../util/Snowflake";
import Functions from "../../util/Functions";
import Image from "./Image";
import { EXTERNAL_LINK_TYPES } from "../../util/Constants";

export type AlbumProperties = WithoutFunctions<Album>;
export { Album };
export default class Album {
	static DEFAULTS: Nullable<AlbumProperties> = {
		id: null,
		title: null,
		tags: [],
		creator: null,
		artist: null,
		vanity: null,
		images: [],
		externalLinks: []
	};

	/** the id of the album */
	id: string;
	/** the tile of this album */
	title: string;
	/** the combined tags of all the images in this album */
	tags: string[];
	/** the id of the creator of this album */
	creator: string;
	/** the id of the artist of this album  - null shows "Anyonymous" / "Unknown" */
	artist: string | null;
	/** the vanity url of this album */
	vanity: string | null;
	/** the images in this album, see Image.ts */
	images: {
		/** the id of the image */
		id: string;
		/** the position of the image -- I know arrays are sorted, and shouldn't change, but this makes sure */
		pos: number;
		/** the id of the user that added the image */
		addedBy: string;
	}[];
	/** The external services this album is located at */
	externalLinks: {
		type: (typeof EXTERNAL_LINK_TYPES)[number];
		info: string;
	}[];
	constructor(id: string, data: AlbumProperties) {
		this.id = id;
		this.load(data);
	}

	private load(data: AlbumProperties) {
		delete (data as any)._id;
		Object.assign(
			this,
			Functions.mergeObjects(
				data,
				Album.DEFAULTS
			)
		);
	}

	static async get(id: string) { return db.get("albums", { id }); }
	static async create(data: Omit<Nullable<DeepPartial<AlbumProperties>>, "id">) {
		const id = Snowflake.generate();

		return db.collection("albums").insertOne(
			Functions.mergeObjects<any, any>(
				{
					...data,
					id
				},
				this.DEFAULTS
			)
		).then(({ ops: [v] }) => new Album(id, v));
	}

	async refresh() {
		const r = await db.collection("albums").findOne({ id: this.id });
		if (r === null) throw new TypeError("Unexpected null on refresh");
		this.load.call(this, r);
		return this;
	}

	async mongoEdit<T = AlbumProperties>(d: UpdateQuery<T>, opt?: FindOneAndUpdateOption<T>) {
		const j = await db.collection<T>("albums").findOneAndUpdate({ id: this.id } as any, d, opt);
		await this.refresh();
		return j;
	}

	async edit(data: DeepPartial<AlbumProperties>) {
		if ((data as any)._id) delete (data as any)._id;
		await mdb.collection("albums").findOneAndUpdate({
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

	async getImages(): Promise<(Image & Album["images"][number])[] & { order: (dir?: "desc" | "asc") => Image[]; }> {
		const img: ThenReturnType<Album["getImages"]> = await Promise.all(
			this.images.map(async ({ id }) => db.get("images", { id }))
		).then(img => (img.filter(v => v !== null) as Image[]).map(v => Object.assign(v, this.images.find(i => i.id === v.id)))) as any;
		if (!img.order) Object.defineProperty(img, "order", {
			value(this: typeof img, dir?: "desc" | "asc") { return this.sort((a, b) => dir === "desc" ? b.pos - a.pos : a.pos - b.pos); }
		});

		return img;
	}

	async getArtist() { return this.artist === null ? null : db.get("user", { id: this.artist }); }

	/**
	 * Convert this album object image a JSON representation.
	 */
	toJSON(): PublicAlbum & { createdAt: string; } {
		const t = Functions.toJSON(
			this,
			[
				"id",
				"title",
				"tags",
				"creator",
				"vanity",
				"images",
				"externalLinks",
				"artist"
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

export type PublicAlbum = Pick<Album, "id">;
