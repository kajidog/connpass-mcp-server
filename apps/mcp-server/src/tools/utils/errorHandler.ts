import {
  ConnpassApiError,
  ConnpassError,
  ConnpassRateLimitError,
  ConnpassTimeoutError,
  ConnpassValidationError,
} from "@kajidog/connpass-api-client";
import { z } from "zod";

interface ToolErrorResponse {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `'${issue.path.join(".")}': ` : "";
      return `${path}${issue.message}`;
    })
    .join("; ");
}

export function formatToolError(error: unknown): ToolErrorResponse {
  let message: string;

  if (error instanceof ConnpassRateLimitError) {
    message =
      "Rate limit exceeded. Please wait a moment before retrying this request.";
  } else if (error instanceof ConnpassTimeoutError) {
    message =
      "The Connpass API request timed out. Try again, or use narrower search filters to reduce response size.";
  } else if (error instanceof ConnpassValidationError) {
    message = `${error.message} Please fix the parameters and try again.`;
  } else if (error instanceof ConnpassApiError) {
    const status = error.statusCode;
    if (status === 401 || status === 403) {
      message =
        "Authentication failed. The Connpass API key may be invalid or missing.";
    } else if (status === 404) {
      message = `Resource not found: ${error.message}`;
    } else {
      message = `Connpass API error (HTTP ${status}): ${error.message}`;
    }
  } else if (error instanceof ConnpassError) {
    message = error.message;
  } else if (error instanceof z.ZodError) {
    message = `Invalid input parameters: ${formatZodIssues(error)}. Please check the parameter types and values.`;
  } else if (error instanceof Error) {
    message = `An unexpected error occurred: ${error.message}`;
  } else {
    message = "An unknown error occurred. Please try again.";
  }

  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

export function withErrorHandling<T>(
  handler: (args: Record<string, unknown>) => Promise<T>,
): (args: Record<string, unknown>) => Promise<T | ToolErrorResponse> {
  return async (args: Record<string, unknown>) => {
    try {
      return await handler(args);
    } catch (error: unknown) {
      console.error("[Tool Error]", error);
      return formatToolError(error);
    }
  };
}
