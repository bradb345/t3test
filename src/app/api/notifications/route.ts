import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { notifications, user } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/notifications - Get user's notifications
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user's database ID
    const [dbUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, userId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // Get notifications for the user
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, dbUser.id))
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    const unreadCount = userNotifications.filter(n => !n.read).length;

    return NextResponse.json({
      notifications: userNotifications.map(n => ({
        ...n,
        data: n.data ? (JSON.parse(n.data) as Record<string, unknown>) : null,
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { notificationIds?: number[]; markAllRead?: boolean };

    // Get the user's database ID
    const [dbUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, userId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (body.markAllRead) {
      // Mark all notifications as read
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, dbUser.id),
            eq(notifications.read, false)
          )
        );
    } else if (body.notificationIds && body.notificationIds.length > 0) {
      // Mark specific notifications as read
      for (const id of body.notificationIds) {
        await db
          .update(notifications)
          .set({ read: true })
          .where(
            and(
              eq(notifications.id, id),
              eq(notifications.userId, dbUser.id)
            )
          );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
