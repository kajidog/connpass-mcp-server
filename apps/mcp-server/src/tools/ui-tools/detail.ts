import { z } from "zod";
import { withErrorHandling } from "../utils/errorHandler.js";
import { registerAppToolIfEnabled } from "../utils/registration.js";
import { connpassResourceUri } from "../utils/resource.js";
import { fetchEventDetail } from "../utils/shared.js";
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
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      _meta: {
        ui: {
          resourceUri: connpassResourceUri,
          visibility: ["app"],
        },
      },
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const { eventId } = UIEventDetailInputSchema.parse(args ?? {});
      const { formatted, presentations } = await fetchEventDetail(
        connpassClient,
        eventId,
      );

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
    }),
  );
}
