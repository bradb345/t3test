import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { conversations, messages, notifications, user } from "~/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createAndEmitNotification, notificationEmitter } from "~/server/notification-emitter";

// Find conversation between two users
async function findConversation(userId1: number, userId2: number) {
  const participant1Id = Math.min(userId1, userId2);
  const participant2Id = Math.max(userId1, userId2);

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.participant1Id, participant1Id),
        eq(conversations.participant2Id, participant2Id)
      )
    )
    .limit(1);

  return conversation;
}

// GET: Fetch messages between current user and specified user
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const otherUserId = parseInt(params.userId);
    if (isNaN(otherUserId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [otherUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, otherUserId))
      .limit(1);

    if (!otherUser) {
      return NextResponse.json(
        { error: "Conversation user not found" },
        { status: 404 }
      );
    }

    const conversation = await findConversation(currentUser.id, otherUserId);

    if (!conversation) {
      return NextResponse.json({
        otherUser: {
          id: otherUser.id,
          name: `${otherUser.first_name} ${otherUser.last_name}`,
          image: otherUser.image_url,
        },
        messages: [],
      });
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt));

    const formattedMessages = conversationMessages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      status: msg.status,
      createdAt: msg.createdAt,
      isFromCurrentUser: msg.fromUserId === currentUser.id,
      attachments: msg.attachments ? (JSON.parse(msg.attachments) as { name: string; url: string; type: string; size: number }[]) : null,
    }));

    return NextResponse.json({
      otherUser: {
        id: otherUser.id,
        name: `${otherUser.first_name} ${otherUser.last_name}`,
        image: otherUser.image_url,
      },
      messages: formattedMessages,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// POST: Reply to conversation
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const toUserId = parseInt(params.userId);
    if (isNaN(toUserId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (toUserId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot send a message to yourself" },
        { status: 400 }
      );
    }

    const [recipient] = await db
      .select()
      .from(user)
      .where(eq(user.id, toUserId))
      .limit(1);

    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      content: string;
      type?: string;
      attachments?: { name: string; url: string; type: string; size: number }[];
    };

    if (!body.content?.trim() && (!body.attachments || body.attachments.length === 0)) {
      return NextResponse.json(
        { error: "Message or attachment is required" },
        { status: 400 }
      );
    }

    // Find or create conversation
    let conversation = await findConversation(currentUser.id, toUserId);

    if (!conversation) {
      const participant1Id = Math.min(currentUser.id, toUserId);
      const participant2Id = Math.max(currentUser.id, toUserId);

      [conversation] = await db
        .insert(conversations)
        .values({
          participant1Id,
          participant2Id,
          type: body.type ?? "general",
        })
        .returning();
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
          eq(notifications.userId, toUserId),
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
        notificationEmitter.emitNotification(toUserId, updated);
      }
    } else {
      await createAndEmitNotification({
        userId: toUserId,
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

    return NextResponse.json(
      {
        success: true,
        message: {
          id: newMessage?.id,
          content: newMessage?.content,
          status: newMessage?.status,
          createdAt: newMessage?.createdAt,
          isFromCurrentUser: true,
          attachments: newMessage?.attachments ? (JSON.parse(newMessage.attachments) as { name: string; url: string; type: string; size: number }[]) : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error sending reply:", error);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}

// PATCH: Mark messages as read
export async function PATCH(
  _request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const otherUserId = parseInt(params.userId);
    if (isNaN(otherUserId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conversation = await findConversation(currentUser.id, otherUserId);

    if (conversation) {
      // Mark all messages from other user in this conversation as read
      await db
        .update(messages)
        .set({ status: "read" })
        .where(
          and(
            eq(messages.conversationId, conversation.id),
            eq(messages.fromUserId, otherUserId),
            eq(messages.status, "unread")
          )
        );

      // Mark any unread new_message notifications from this sender as read
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, currentUser.id),
            eq(notifications.type, "new_message"),
            eq(notifications.read, false),
            sql`${notifications.data}::jsonb->>'fromUserId' = ${String(otherUserId)}`
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}
