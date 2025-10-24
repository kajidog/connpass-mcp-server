# Connpass Apps UI

OpenAI Apps SDK-based UI for Connpass MCP Server.

This package provides a React-based widget interface that integrates with the Connpass MCP Server via OpenAI's Apps SDK.

## Features

- **Event Carousel**: Display multiple events in a horizontal scrollable carousel
- **Event Fullscreen**: Detailed view of a single event with all information
- **Event Agenda**: Organized view of today's and upcoming events
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Automatically adapts to user's color scheme preference

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Deployment

### Cloudflare Pages

1. Build the app:
   ```bash
   pnpm build
   ```

2. Deploy to Cloudflare Pages:
   ```bash
   npx wrangler pages deploy dist --project-name=connpass-apps-ui
   ```

3. Or use the Cloudflare Pages dashboard:
   - Connect your Git repository
   - Set build command: `cd packages/apps-ui && pnpm build`
   - Set build output directory: `packages/apps-ui/dist`

### Other Platforms

The built files in `dist/` can be deployed to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

## Integration with MCP Server

After deploying, update the MCP server's widget URI to point to your deployed URL:

```typescript
// In packages/mcp-server/src/widgets/connpass-events.ts
export const CONNPASS_EVENTS_WIDGET_URI = "https://your-app.pages.dev";
```

## Architecture

- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe code
- **Vite**: Fast build tool and dev server
- **OpenAI Apps SDK**: Integration with ChatGPT

## Component Structure

```
src/
├── components/
│   ├── EventCarousel.tsx    # Horizontal event list
│   ├── EventCard.tsx         # Individual event card
│   ├── EventFullscreen.tsx   # Detailed event view
│   ├── EventAgenda.tsx       # Agenda layout
│   └── EmptyState.tsx        # Loading/empty states
├── types.ts                  # TypeScript definitions
├── utils.ts                  # Helper functions
├── App.tsx                   # Main app component
└── main.tsx                  # Entry point
```

## License

MIT
