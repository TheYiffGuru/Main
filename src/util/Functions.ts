import crypto from "crypto";
import * as fs from "fs-extra";
import { USER_FLAGS } from "./Constants";

type JSONReturn<K extends object, N extends Array<keyof K>, O extends Array<keyof K>, T extends boolean = false> = {
	[F in (T extends false ? N[number] : (N[number] | O[number]))]: K[F];
};

export default class Functions {
	private constructor() { }

	/**
	 * Merge two objects into one
	 * @param {A} a - The object to merge properties on to
	 * @param {B} b - The object to merge properties from
	 * @template A
	 * @template B
	 */
	static mergeObjects<A extends object, B extends object>(a: A, b: B) {
		// avoid references
		const obj = JSON.parse(JSON.stringify(a)) as A & B;
		// I hate this, but I would much rather do that than rewrite this function
		const c = obj as any;
		const d = a as any;
		const e = b as any;
		for (const k of Object.keys(b)) {
			// handling arrays is a tricky thing since we can't just merge them because of duplicates, so we'll just assume arrays will be zero length if they're "wrong"
			if (Array.isArray(e[k])) c[k] = d[k] && d[k]?.length !== 0 ? d[k] : e[k];
			else if (typeof e[k] === "object" && e[k] !== null) {
				if (typeof d[k] !== "object" || d[k] === null) d[k] = {};
				c[k] = this.mergeObjects(d[k], e[k]);
			} else c[k] = typeof d[k] === "undefined" ? e[k] : d[k];
		}
		return obj;
	}

	/**
	 * Sanitize console output to remove special characters.
	 *
	 * @static
	 * @param {string} str - The string to sanitize-
	 * @returns {string}
	 * @memberof Internal
	 * @example Internal.consoleSanitize("someString");
	 */
	static consoleSanitize(str: string) {
		if (typeof str !== "string") str = (str as any).toString();
		return str.replace(/\u001B\[[0-9]{1,2}m/g, "");
	}

	/**
	 * first letter of every word uppercase.
	 *
	 * @static
	 * @param {string} str - The string to perform the operation on.
	 * @returns {string}
	 * @memberof Strings
	 * @example Strings.ucwords("some string of words");
	 */
	static ucwords(str: string) {
		return str.toString().toLowerCase().replace(/^(.)|\s+(.)/g, (r) => r.toUpperCase());
	}

	static md5Hash(text: string) {
		return crypto.createHash("md5").update(text.toLowerCase()).digest("hex");
	}

	static md5File(file: string) {
		const BUFFER_SIZE = 8192;
		const fd = fs.openSync(file, "r");
		const hash = crypto.createHash("md5");
		const buffer = Buffer.alloc(BUFFER_SIZE);

		try {
			let bytesRead;

			do {
				bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE, null);
				hash.update(buffer.slice(0, bytesRead));
			} while (bytesRead === BUFFER_SIZE);
		} finally {
			fs.closeSync(fd);
		}

		return hash.digest("hex");
	}

	static toJSON<K extends object, N extends Array<keyof K>, O extends Array<keyof K>, T extends boolean = false>(
		self: K,
		publicProperties: N,
		privateProperties: O,
		priv?: T
	): JSONReturn<K, N, O, T> {
		const props: (N[number] | (N[number] & O[number]))[] = [...publicProperties];
		if (priv) props.push(...privateProperties!);

		const p = props
			.map(v => ({
				[v]: self[v]
			}))
			.reduce((a, b) => ({ ...a, ...b })) as JSONReturn<K, N, O, T>;
		return p;
	}

	static calcUserFlags(flags: number) {
		return Object.entries(USER_FLAGS).map(([f, v]) => ({
			[f]: (flags & v) !== 0
		})).reduce((a, b) => ({ ...a, ...b }), {}) as {
				[K in keyof typeof USER_FLAGS]: boolean;
			};
	}
}
