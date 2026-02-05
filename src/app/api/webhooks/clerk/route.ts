import { Webhook } from "svix";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { capturePostHogEvent, identifyPostHogUser } from "~/lib/posthog-server";

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = (await req.json()) as unknown;
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET ?? "");

  let evt: WebhookEvent | null = null;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, image_url, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;
    const isNewUser = eventType === "user.created";

    // Upsert user data
    await db
      .insert(user)
      .values({
        auth_id: id,
        email: email ?? "",
        first_name: first_name ?? "",
        last_name: last_name ?? "",
        image_url: image_url,
      })
      .onConflictDoUpdate({
        target: [user.auth_id],
        set: {
          email: email ?? "",
          first_name: first_name ?? "",
          last_name: last_name ?? "",
          image_url: image_url,
        },
      });

    // Identify user with PostHog
    await identifyPostHogUser({
      distinctId: id,
      properties: {
        email: email ?? undefined,
        first_name: first_name ?? undefined,
        last_name: last_name ?? undefined,
        name: first_name && last_name ? `${first_name} ${last_name}` : undefined,
      },
    });

    // Track signup event for new users
    if (isNewUser) {
      await capturePostHogEvent({
        distinctId: id,
        event: "user_signed_up",
        properties: {
          email: email,
          source: "clerk_webhook",
        },
      });
    }
  }

  return new Response("", { status: 200 });
}
