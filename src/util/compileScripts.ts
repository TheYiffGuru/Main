import Typescript from "typescript";
import tsconfig from "../../tsconfig.json";
import * as fs from "fs-extra";
import path from "path";
import Logger from "./Logger";
import config from "../config";

const dir = `${config.dir.base}/src/public/scripts`;

const l = fs.readdirSync(dir);
for (const f of l) {
	const fL = `${dir}/${f.replace(/\.ts/, ".js")}`;
	const mL = `${dir}/${f.replace(/\.ts/, ".js.map")}`;
	if (!f.endsWith(".ts")) {
		console.log(`Skipping compilation of "${f}" due to it not being a typescript file.`);
		continue;
	}

	if (fs.existsSync(fL)) fs.unlinkSync(fL);
	const t = Typescript.transpileModule(fs.readFileSync(`${dir}/${f}`).toString(), {
		compilerOptions: {
			allowJs: true,
			target: Typescript.ScriptTarget.ESNext,
			module: Typescript.ModuleKind.CommonJS,
			charset: "UTF-8",
			newLine: Typescript.NewLineKind.LineFeed,
			strict: true,
			strictPropertyInitialization: false,
			sourceMap: false
		}
	});
	// ts dumb dumb
	fs.writeFileSync(fL, t.outputText.replace('Object.defineProperty(exports, "__esModule", { value: true });', ""));
	Logger.log("compileScripts", `Successfully compiled the script "${f}"`);
}
