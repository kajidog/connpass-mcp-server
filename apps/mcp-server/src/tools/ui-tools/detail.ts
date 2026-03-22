import { z } from "zod";
import {
  formatEvent,
  formatPresentationsResponse,
} from "../utils/formatting.js";
import { registerAppToolIfEnabled } from "../utils/registration.js";
import { connpassResourceUri } from "../utils/resource.js";
import type { ToolDeps } from "../utils/types.js";

const UIEventDetailInputSchema = z.object({
  eventId: z.number().int().positive(),
});

export function registerUIEventDetailTool(deps: ToolDeps): void {
  const { server, connpassClient } = deps;

  registerAppToolIfEnabled(
    server,
    "_get_event_detail",
    {
      title: "Get Event Detail (UI)",
      description: "Internal: fetch full event details for the detail view",
      inputSchema: UIEventDetailInputSchema,
      _meta: {
        ui: {
          resourceUri: connpassResourceUri,
          visibility: ["app"],
        },
      },
    },
    async (args: Record<string, unknown>) => {
      const { eventId } = UIEventDetailInputSchema.parse(args ?? {});

      const [eventsResponse, presentationsResponse] = await Promise.all([
        connpassClient.searchEvents({
          eventId: [eventId],
          count: 1,
        }),
        connpassClient.getEventPresentations(eventId).catch(() => undefined),
      ]);

      const event = eventsResponse.events[0];
      if (!event) {
        throw new Error(`Event with ID ${eventId} not found.`);
      }

      const formatted = formatEvent(event);
      const presentations = presentationsResponse
        ? formatPresentationsResponse(presentationsResponse)
        : undefined;
      const detailEvent = presentations?.presentations?.length
        ? { ...formatted, presentations: presentations.presentations }
        : formatted;

      return {
        content: [{ type: "text" as const, text: JSON.stringify(detailEvent) }],
        structuredContent: {
          kind: "event-detail",
          data: {
            event: detailEvent,
            presentations,
          },
        },
      };
    },
  );
}
