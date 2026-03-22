#!/usr/bin/env node

import { connectStdio } from "@kajidog/mcp-core";
import { getServer } from "./server.js";

connectStdio(getServer()).catch(() => {
  process.exit(1);
});
