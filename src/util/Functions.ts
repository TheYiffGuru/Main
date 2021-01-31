import crypto from "crypto";
import * as fs from "fs-extra";

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
		// I hate the amount of ignores here, but I would much rather do that than rewrite this function
		for (const k of Object.keys(b)) {
			// handling arrays is a tricky thing since we can't just merge them because of duplicates, so we'll just assume arrays will be zero length if they're "wrong"
			// @ts-ignore
			if (Array.isArray(b[k])) obj[k] = a[k] && a[k]?.length !== 0 ? a[k] : b[k];
			// @ts-ignore
			else if (typeof b[k] === "object" && b[k] !== null) {
				// @ts-ignore
				if (typeof a[k] !== "object" || a[k] === null) a[k] = {};
				// @ts-ignore
				obj[k] = this.mergeObjects(a[k], b[k]);
				// @ts-ignore
			} else obj[k] = typeof a[k] === "undefined" ? b[k] : a[k];
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
}
