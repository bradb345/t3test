import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { conversations, messages, notifications, user } from "~/server/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { createAndEmitNotification, notificationEmitter } from "~/server/notification-emitter";
import { trackServerEvent } from "~/lib/posthog-events/server";
import { validateAttachments } from "~/lib/attachments";

// GET: Fetch user's conversations list
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all conversations with other user info, last message, and unread counts in a single query
    const otherUser = sql`CASE
      WHEN ${conversations.participant1Id} = ${currentUser.id} THEN ${conversations.participant2Id}
      ELSE ${conversations.participant1Id}
    END`;

    const conversationRows = await db.execute(sql`
      SELECT
        c.id AS conversation_id,
        c.type,
        c.property_id,
        c.last_message_at,
        u.id AS other_user_id,
        u.first_name AS other_first_name,
        u.last_name AS other_last_name,
        u.image_url AS other_image_url,
        lm.id AS last_message_id,
        lm.content AS last_message_content,
        lm.status AS last_message_status,
        lm.created_at AS last_message_created_at,
        lm.from_user_id AS last_message_from_user_id,
        COALESCE(unread.cnt, 0) AS unread_count
      FROM ${conversations} c
      JOIN ${user} u ON u.id = ${otherUser}
      LEFT JOIN LATERAL (
        SELECT m.id, m.content, m.status, m.created_at, m.from_user_id
        FROM ${messages} m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt
        FROM ${messages} m2
        WHERE m2.conversation_id = c.id
          AND m2.from_user_id != ${currentUser.id}
          AND m2.status = 'unread'
      ) unread ON true
      WHERE c.participant1_id = ${currentUser.id} OR c.participant2_id = ${currentUser.id}
      ORDER BY c.last_message_at DESC
    `);

    const conversationList = conversationRows.rows
      .filter((row) => row.last_message_id != null)
      .map((row) => ({
        userId: row.other_user_id as number,
        userName: `${row.other_first_name as string} ${row.other_last_name as string}`,
        userImage: row.other_image_url as string | null,
        lastMessage: {
          id: row.last_message_id as number,
          content: row.last_message_content as string,
          status: row.last_message_status as string,
          createdAt: row.last_message_created_at as string,
          isFromCurrentUser: (row.last_message_from_user_id as number) === currentUser.id,
        },
        unreadCount: Number(row.unread_count ?? 0),
      }));

    return NextResponse.json({
      conversations: conversationList,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST: Send a new message (creates conversation if needed)
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      toUserId: number;
      content: string;
      type?: string;
      propertyId?: number;
      attachments?: { name: string; url: string; type: string; size: number }[];
    };

    if (!body.toUserId) {
      return NextResponse.json(
        { error: "Recipient is required" },
        { status: 400 }
      );
    }
    if (!body.content?.trim() && (!body.attachments || body.attachments.length === 0)) {
      return NextResponse.json(
        { error: "Message or attachment is required" },
        { status: 400 }
      );
    }

    if (body.attachments?.length) {
      const attachmentError = validateAttachments(body.attachments);
      if (attachmentError) {
        return NextResponse.json({ error: attachmentError }, { status: 400 });
      }
    }

    const [recipient] = await db
      .select()
      .from(user)
      .where(eq(user.id, body.toUserId))
      .limit(1);

    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    if (body.toUserId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot send message to yourself" },
        { status: 400 }
      );
    }

    // Ensure participant1Id < participant2Id for uniqueness
    const participant1Id = Math.min(currentUser.id, body.toUserId);
    const participant2Id = Math.max(currentUser.id, body.toUserId);

    // Find or create conversation (using onConflictDoNothing to handle races)
    let [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.participant1Id, participant1Id),
          eq(conversations.participant2Id, participant2Id)
        )
      )
      .limit(1);

    if (!conversation) {
      [conversation] = await db
        .insert(conversations)
        .values({
          participant1Id,
          participant2Id,
          type: body.type ?? "general",
          propertyId: body.propertyId ?? null,
        })
        .onConflictDoNothing()
        .returning();

      // If another request created it concurrently, re-select
      if (!conversation) {
        [conversation] = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.participant1Id, participant1Id),
              eq(conversations.participant2Id, participant2Id)
            )
          )
          .limit(1);
      }
    }

    if (!conversation) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    // Create the message
    const [newMessage] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        fromUserId: currentUser.id,
        content: body.content?.trim() ?? "",
        status: "unread",
        attachments: body.attachments?.length ? JSON.stringify(body.attachments) : null,
      })
      .returning();

    // Update conversation lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversation.id));

    // Upsert notification: update existing unread new_message notification from this sender, or create one
    const senderName = `${currentUser.first_name} ${currentUser.last_name}`;
    const [existingNotification] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, body.toUserId),
          eq(notifications.type, "new_message"),
          eq(notifications.read, false),
          sql`${notifications.data}::jsonb->>'fromUserId' = ${String(currentUser.id)}`
        )
      )
      .limit(1);

    if (existingNotification) {
      const [updated] = await db
        .update(notifications)
        .set({
          message: `${senderName} sent you a new message`,
          data: JSON.stringify({
            messageId: newMessage?.id,
            fromUserId: currentUser.id,
            fromUserName: senderName,
          }),
          createdAt: new Date(),
        })
        .where(eq(notifications.id, existingNotification.id))
        .returning();
      if (updated) {
        notificationEmitter.emitNotification(body.toUserId, updated);
      }
    } else {
      await createAndEmitNotification({
        userId: body.toUserId,
        type: "new_message",
        title: "New Message",
        message: `${senderName} sent you a message`,
        data: JSON.stringify({
          messageId: newMessage?.id,
          fromUserId: currentUser.id,
          fromUserName: senderName,
        }),
        actionUrl: "/messages",
      });
    }

    // Track message sent event in PostHog
    await trackServerEvent(clerkUserId, "message_sent", {
      message_id: newMessage?.id,
      message_type: body.type ?? "general",
      has_property_context: !!body.propertyId,
      has_attachments: !!body.attachments?.length,
      attachment_count: body.attachments?.length ?? 0,
      message_body: body.content?.trim() ?? "",
      source: "api",
    });

    return NextResponse.json(
      { success: true, message: newMessage },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
