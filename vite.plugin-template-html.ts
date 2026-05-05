import type { Plugin } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface ConfigJson {
  title: string;
  description: string;
  organization_name: string;
  og_url: string;
  og_image: string;
  theme_color: string;
}

/**
 * Substitutes %PLACEHOLDER% strings in index.html with values from
 * public/data/config.json. Run `contributor-network build` first so
 * config.json exists.
 */
export function templateHtml(): Plugin {
  return {
    name: "template-index-html",
    transformIndexHtml(html) {
      const configPath = resolve(process.cwd(), "public/data/config.json");
      let config: ConfigJson;
      try {
        config = JSON.parse(readFileSync(configPath, "utf8"));
      } catch (err) {
        throw new Error(
          `template-index-html: could not read ${configPath}. ` +
            `Run \`contributor-network build\` before \`npm run build\`.`,
        );
      }
      const replacements: Record<string, string> = {
        "%TITLE%": `The ${config.organization_name} Contributor Network`,
        "%DESCRIPTION%": config.description,
        "%OG_URL%": config.og_url,
        "%OG_IMAGE%": config.og_image,
        "%THEME_COLOR%": config.theme_color,
        "%ORGANIZATION_NAME%": config.organization_name,
      };
      return Object.entries(replacements).reduce(
        (acc, [key, value]) => acc.replaceAll(key, value),
        html,
      );
    },
  };
}
