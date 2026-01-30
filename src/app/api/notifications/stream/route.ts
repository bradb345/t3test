import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { notificationEmitter } from "~/server/notification-emitter";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [dbUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.auth_id, userId))
    .limit(1);

  if (!dbUser) {
    return new Response("User not found", { status: 404 });
  }

  const dbUserId = dbUser.id;
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const unsubscribe = notificationEmitter.subscribe(
        dbUserId,
        (notification: unknown) => {
          try {
            controller.enqueue(
              encoder.encode(
                `event: notification\ndata: ${JSON.stringify(notification)}\n\n`
              )
            );
          } catch {
            // Stream closed
          }
        }
      );

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 30000);

      cleanup = () => {
        unsubscribe();
        clearInterval(keepalive);
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
