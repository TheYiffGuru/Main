import * as fs from "fs-extra";
import config from "../../config";
import Logger from "../Logger";

type ValidTemplates = "confirm";

interface UnparsedTemplate {
	subject: string;
	body: string;
}

interface ParsedTemplate {
	content: {
		subject: string;
		body: string;
	},
	location: string;
}

export default class Templater {
	private static TEMPLATES: Map<ValidTemplates, ParsedTemplate> = new Map();
	private static get dir() { return `${config.dir.base}/src/util/email/templates`; }

	static init() {
		fs
			.readdirSync(this.dir)
			.map(f => {
				const { subject, body } = fs.readJsonSync(`${this.dir}/${f}/info.json`) as UnparsedTemplate;

				return [
					f,
					{
						content: {
							subject: this.parseInfo(subject, f),
							body: this.parseInfo(body, f)
						},
						location: `${this.dir}/${f}`
					}
				] as [name: ValidTemplates, info: ParsedTemplate];
			})
			.map(([name, info]) => this.TEMPLATES.set(name, info));
	}

	private static parseInfo(str: string, name: string) {
		const [, v] = str.match(/^FILE:(.*)$/) ?? [];
		if (v) {
			if (!fs.existsSync(`${this.dir}/${name}/${v}`)) {
				Logger.error("MailTemplater->parseInfo", `Failed to fetch file "${v}" (${this.dir}/${name}/${v}) for template "${name}"`);
				return `INTERNAL ERROR: Failed to fetch file "${this.dir}/${name}/${v}". Please contact a web administrator.`;
			} else return fs.readFileSync(`${this.dir}/${name}/${v}`).toString();
		} else return str;
	}

	static parseString(str: string, replacers: {
		[k: string]: any;
	}) {
		let v = String(str);
		Object.entries(replacers).map(([key, value]) => v = v.replace(new RegExp(`(%${key}%)`, "g"), value));
		return v;
	}

	static get(key: ValidTemplates) {
		return this.TEMPLATES.get(key);
	}
}

Templater.init();
