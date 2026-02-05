import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      // For short-lived serverless functions, flush immediately
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

/** Capture a PostHog event and flush to ensure delivery in serverless environments. */
export async function capturePostHogEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}) {
  const client = getPostHogClient();
  client.capture(params);
  await client.flush();
}

/** Identify a user in PostHog and flush to ensure delivery in serverless environments. */
export async function identifyPostHogUser(params: {
  distinctId: string;
  properties?: Record<string, unknown>;
}) {
  const client = getPostHogClient();
  client.identify(params);
  await client.flush();
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}
