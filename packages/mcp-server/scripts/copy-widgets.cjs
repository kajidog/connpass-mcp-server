#!/usr/bin/env node

const { mkdirSync, copyFileSync, readdirSync, statSync } = require("node:fs");
const { resolve, dirname } = require("node:path");

const root = dirname(__dirname);
const srcDir = resolve(root, "src/widgets");
const distDir = resolve(root, "dist/widgets");

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function copyWidgets() {
  ensureDir(distDir);
  const entries = readdirSync(srcDir);
  entries
    .filter((entry) => entry.endsWith(".html"))
    .forEach((entry) => {
      const source = resolve(srcDir, entry);
      if (!statSync(source).isFile()) {
        return;
      }
      const destination = resolve(distDir, entry);
      copyFileSync(source, destination);
    });
}

copyWidgets();
