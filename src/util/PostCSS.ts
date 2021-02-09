import { promises as fs } from "fs";
import Logger from "./Logger";
import postcss, { Warning } from "postcss";
import config from "../config";


/**
 * PostCSS utility
 * @author August [<cutie@floofy.dev>]
 */
export default class PostCSS {
	static IN_DIR = `${config.dir.static}/scss`;
	static OUT_DIR = `${config.dir.static}/styles`;
	/**
	 * Compiles all stylesheets and places them in src/public/styles
	 */
	static async compileStyles() {
		Logger.debug("PostCSS", `Loading styles in "${PostCSS.OUT_DIR}".`);

		const files = await fs.readdir(this.IN_DIR);
		const processor = postcss([
			require("autoprefixer"),
			require("postcss-import"),
			require("tailwindcss")
		]);

		Logger.info("PostCSS", `Using v${processor.version}`);

		for (let i = 0; i < files.length; i++) {
			const css = await fs.readFile(`${this.IN_DIR}/${files[i]}`, { encoding: "utf-8" });
			const from = `${this.IN_DIR}/${files[i]}`;
			const to = `${this.OUT_DIR}/${files[i].replace(/\.scss/, ".css")}`;
			const result = await processor.process(css, {
				from,
				to
			});

			const warnings = result.warnings();

			Logger.debug("PostCSS->Compile", `Compiled "${files[i]}" into "${files[i].replace(/\.scss/, ".css")}" with ${warnings.length} warning${warnings.length === 1 ? "" : "s"} `);
			for (let ii = 0; ii < warnings.length; ii++) Logger.warn(["PostCSS->Compile", files[i]], `Warning #${ii + 1} - ${warnings[ii].toString()} `);
			await fs.writeFile(to, result.css);
		}
	}
}
