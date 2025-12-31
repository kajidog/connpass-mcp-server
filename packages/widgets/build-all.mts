import { build, type InlineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fg from "fast-glob";
import path from "node:path";
import fs from "node:fs";
import tailwindcss from "@tailwindcss/vite";

const entries = fg.sync("src/**/index.{tsx,jsx}");
const outDir = "dist";

const PER_ENTRY_CSS_GLOB = "**/*.{css,pcss,scss,sass}";
const PER_ENTRY_CSS_IGNORE = "**/*.module.*".split(",").map((s) => s.trim());
const GLOBAL_CSS_LIST = [path.resolve("src/index.css")];

const builtNames: string[] = [];

function wrapEntryPlugin(
  virtualId: string,
  entryFile: string,
  cssPaths: string[]
): Plugin {
  return {
    name: `virtual-entry-wrapper:${entryFile}`,
    resolveId(id) {
      if (id === virtualId) return id;
    },
    load(id) {
      if (id !== virtualId) {
        return null;
      }

      const cssImports = cssPaths
        .map((css) => `import ${JSON.stringify(css)};`)
        .join("\n");

      return `
    ${cssImports}
    export * from ${JSON.stringify(entryFile)};

    import * as __entry from ${JSON.stringify(entryFile)};
    export default (__entry.default ?? __entry.App);

    import ${JSON.stringify(entryFile)};
  `;
    },
  };
}

fs.rmSync(outDir, { recursive: true, force: true });

for (const file of entries) {
  const name = path.basename(path.dirname(file));

  const entryAbs = path.resolve(file);
  const entryDir = path.dirname(entryAbs);

  const perEntryCss = fg.sync(PER_ENTRY_CSS_GLOB, {
    cwd: entryDir,
    absolute: true,
    dot: false,
    ignore: PER_ENTRY_CSS_IGNORE,
  });

  const globalCss = GLOBAL_CSS_LIST.filter((p) => fs.existsSync(p));

  const cssToInclude = [...globalCss, ...perEntryCss].filter((p) =>
    fs.existsSync(p)
  );

  const virtualId = `\0virtual-entry:${entryAbs}`;

  const createConfig = (): InlineConfig => ({
    plugins: [
      wrapEntryPlugin(virtualId, entryAbs, cssToInclude),
      tailwindcss(),
      react(),
      {
        name: "remove-manual-chunks",
        outputOptions(options) {
          if ("manualChunks" in options) {
            delete (options as Record<string, unknown>).manualChunks;
          }
          return options;
        },
      },
    ],
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
      target: "es2022",
    },
    build: {
      target: "es2022",
      outDir,
      emptyOutDir: false,
      chunkSizeWarningLimit: 2000,
      minify: "esbuild",
      cssCodeSplit: false,
      rollupOptions: {
        input: virtualId,
        output: {
          format: "es",
          entryFileNames: `${name}.js`,
          inlineDynamicImports: true,
          assetFileNames: (info) =>
            (info.name || "").endsWith(".css")
              ? `${name}.css`
              : `[name]-[hash][extname]`,
        },
        preserveEntrySignatures: "allow-extension",
        treeshake: true,
      },
    },
  });

  console.group(`Building ${name}`);
  await build(createConfig());
  console.groupEnd();
  builtNames.push(name);
  console.log(`Built ${name}`);
}

// Generate self-contained HTML with inlined JS/CSS
for (const name of builtNames) {
  const jsPath = path.join(outDir, `${name}.js`);
  const cssPath = path.join(outDir, `${name}.css`);

  const jsContent = fs.existsSync(jsPath)
    ? fs.readFileSync(jsPath, "utf-8")
    : "";
  const cssContent = fs.existsSync(cssPath)
    ? fs.readFileSync(cssPath, "utf-8")
    : "";

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${cssContent}</style>
</head>
<body>
  <div id="${name}-root"></div>
  <script type="module">${jsContent}</script>
</body>
</html>
`;

  const htmlPath = path.join(outDir, `${name}.html`);
  fs.writeFileSync(htmlPath, html, { encoding: "utf8" });
  console.log(`Generated ${htmlPath}`);

  // Clean up separate JS/CSS files since they're inlined
  if (fs.existsSync(jsPath)) fs.unlinkSync(jsPath);
  if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath);
}

console.log("Build complete!");
