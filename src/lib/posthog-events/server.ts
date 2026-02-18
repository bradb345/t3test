import { capturePostHogEvent } from "~/lib/posthog-server";
import type { ServerEventMap } from "~/lib/posthog-events";

/**
 * Fire a typed server-side PostHog event.
 * Non-blocking (returns a void promise) — callers should use `void trackServerEvent(…)`.
 */
export function trackServerEvent<E extends keyof ServerEventMap>(
  distinctId: string,
  event: E,
  properties: ServerEventMap[E],
): Promise<void> {
  return capturePostHogEvent({ distinctId, event, properties });
}
