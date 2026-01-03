---
"@kajidog/connpass-mcp-server": minor
"@kajidog/connpass-api-client": minor
---

feat: v0.3.0 - Add schedule widget and shared components

### New Features

#### Schedule Widget
- Add new `connpass-schedule` widget for displaying event schedules
- Support date range filtering with `ym` and `ymd` parameters
- New ScheduleView component with agenda-style layout

#### Shared Components & Utilities  
- Add `packages/widgets/src/shared/` directory with reusable components
- New `AgendaCard` shared component for consistent event display
- Add `Badge` component for participant count display
- Add OpenAI types for ChatGPT widget integration (`openai.ts`)
- Add `use-openai-global` hook for OpenAI SDK integration
- Add shared `normalize-tool-output` utility for consistent data handling

#### Widget Metadata & Configuration
- Add widget metadata for CSP (Content Security Policy) headers
- Add `resource_domains` configuration (media.connpass.com)
- Dynamic widget category mapping for improved widget handling

### Improvements

#### HttpClient & Rate Limiting
- Refactor rate limiting logic for improved request handling
- Better error handling and retry mechanisms

#### UI/UX Enhancements
- Enhanced loading state in Carousel component
- Improved DetailView layout for better user experience
- Update owner label handling in AgendaCard and DetailView

#### React Widget (from previous release)
- React 19, Vite, and Tailwind CSS based widget system
- Replace vanilla JS widget with React-based implementation
- Add @kajidog/connpass-widgets as devDependency

### Documentation
- Update README with new widget information
- Add new screenshots for schedule widget
