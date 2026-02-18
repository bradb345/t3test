import type { ClientEventMap } from "~/lib/posthog-events";

/** Minimal interface matching the posthog-js client (avoids importing the full type). */
interface PostHogLike {
  capture(event: string, properties?: Record<string, unknown>): void;
}

/**
 * Fire a typed client-side PostHog event.
 * Accepts the PostHog instance (from `usePostHog()` or the default import).
 */
export function trackClientEvent<E extends keyof ClientEventMap>(
  posthog: PostHogLike | null | undefined,
  event: E,
  properties: ClientEventMap[E],
): void {
  posthog?.capture(event, properties as Record<string, unknown>);
}
