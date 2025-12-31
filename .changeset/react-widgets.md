---
"@kajidog/connpass-mcp-server": minor
---

feat: replace vanilla JS widget with React-based widget

- Add new `packages/widgets` package with React 19, Vite, and Tailwind CSS
- Remove old vanilla JS widget (connpass-events.html)
- Remove copy-widgets.cjs build script
- Update mcp-server to load React widget from widgets package
- Update Dockerfile to include widgets package in build
