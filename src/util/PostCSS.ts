import { promises as fs } from "fs";
import Logger from "./Logger";
import postcss from "postcss";
import { join } from "path";

/**
 * PostCSS utility
 * @author August [<cutie@floofy.dev>]
 */
export default class PostCSS {
  /**
   * Compiles all stylesheets and places them in src/public/styles
   */
  static async compileStyles() {
    const ROOT_DIR = join(__dirname, '..', 'public', 'styles');
    const MAIN_STYLESHEET = join(__dirname, '..', 'public', 'scss', 'style.scss');
    const GOTO_STYLESHEET = join(__dirname, '..', 'public', 'styles', 'style.css');

    Logger.debug("PostCSS", `Now loading styles in '${ROOT_DIR}'...`);

    const css = await fs.readFile(MAIN_STYLESHEET, { encoding: 'utf-8' });
    const processor = postcss([
      require('autoprefixer'),
      require('postcss-import'),
      require('tailwindcss')
    ]);

    Logger.warn("PostCSS", `Using v${processor.version} of PostCSS`);

    const result = await processor.process(css, { 
      from: MAIN_STYLESHEET, 
      to: GOTO_STYLESHEET
    });

    const warnings = result.warnings();

    Logger.debug("PostCSS ~ Compiled", `Compiled successfully(?) with ${warnings.length} warnings`);
    for (let i = 0; i < warnings.length; i++) {
      const warning = warnings[i];
      Logger.log(`PostCSS ~ Compilation ~ Warning #${i + 1}`, warning.toString());
    }

    await fs.writeFile(GOTO_STYLESHEET, result.css);
  }
}
