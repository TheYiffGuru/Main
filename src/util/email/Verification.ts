import path from "path";
import * as fs from "fs-extra";
import config from "../../config";

import crypto from "crypto";
import Logger from "../Logger";

interface Entry {
	user: string;
	token: string;
	expire: string;
}

export default class Verification {
	static readonly FILE = `${config.dir.base}/src/config/extra/email-verification.json`;
	// 24 hours
	static readonly EXPIRE_TIME = 8.64e+7;
	private static ENTRIES: Map<string, Entry> = new Map();
	static lastSave: string = new Date().toISOString();
	static interval: NodeJS.Timeout;

	static init() {
		if (!fs.existsSync(this.FILE)) {
			fs.mkdirpSync(path.dirname(this.FILE));
			fs.writeFileSync(this.FILE, JSON.stringify([]));
		}

		(fs.readJSONSync(this.FILE) as [key: string, value: Entry][]).map(([a, b]) => this.ENTRIES.set(a, b));

		this.interval = setInterval(() => {
			for (const [email, { expire }] of this.ENTRIES.entries()) {
				if (new Date(expire).getTime() < Date.now()) this.remove(email, "TIMEOUT");
			}
		}, 1e3);
	}

	static save() {
		fs.writeFileSync(this.FILE, JSON.stringify(
			Array.from(
				this.ENTRIES.entries()
			)
		));
		this.lastSave = new Date().toISOString();
	}

	static get has() { return this.ENTRIES.has.bind(this.ENTRIES); }
	static get get() { return this.ENTRIES.get.bind(this.ENTRIES); }
	static getEmailFromToken(token: string) { return Array.from(this.ENTRIES).find(([email, value]) => value.token === token)?.[0]; }

	static add(email: string, user: string, token?: string) {
		Logger.debug(`MailerVerification->add`, `Added a verification token for "${email}" (U-${user})`);
		if (!token) token = this.generateToken();
		const e = this.ENTRIES.set(email, {
			user,
			token,
			expire: new Date(Date.now() + this.EXPIRE_TIME).toISOString()
		}).get(email)!;
		this.save();
		return e;
	}

	static remove(email: string, reason?: "TIMEOUT" | "USED") {
		const v = this.ENTRIES.get(email);
		Logger.debug(`MailerVerification->remove`, `Removed the verification token for "${email}" (U-${v?.user || "Unknown"}, Reason: ${reason})`);
		const i = this.ENTRIES.delete(email);
		this.save();
		return i;
	}

	static generateToken() { return crypto.randomBytes(64).toString("hex"); }
}

Verification.init();
