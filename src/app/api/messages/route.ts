import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { conversations, messages, user } from "~/server/db/schema";
import { eq, or, desc, sql, and } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { trackServerEvent } from "~/lib/posthog-events/server";

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

    // Get all conversations where user is a participant
    const userConversations = await db
      .select({
        conversation: conversations,
      })
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1Id, currentUser.id),
          eq(conversations.participant2Id, currentUser.id)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    // Build response with other user info and unread counts
    const conversationList = await Promise.all(
      userConversations.map(async ({ conversation }) => {
        const otherUserId =
          conversation.participant1Id === currentUser.id
            ? conversation.participant2Id
            : conversation.participant1Id;

        // Get other user info
        const [otherUser] = await db
          .select()
          .from(user)
          .where(eq(user.id, otherUserId))
          .limit(1);

        // Get last message
        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Get unread count (messages from other user that are unread)
        const [unreadResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conversation.id),
              eq(messages.fromUserId, otherUserId),
              eq(messages.status, "unread")
            )
          );

        if (!otherUser || !lastMessage) return null;

        return {
          userId: otherUser.id,
          userName: `${otherUser.first_name} ${otherUser.last_name}`,
          userImage: otherUser.image_url,
          lastMessage: {
            id: lastMessage.id,
            subject: conversation.subject,
            content: lastMessage.content,
            status: lastMessage.status,
            createdAt: lastMessage.createdAt,
            isFromCurrentUser: lastMessage.fromUserId === currentUser.id,
          },
          unreadCount: Number(unreadResult?.count ?? 0),
        };
      })
    );

    return NextResponse.json({
      conversations: conversationList.filter(Boolean),
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
      subject: string;
      content: string;
      type?: string;
      propertyId?: number;
    };

    if (!body.toUserId) {
      return NextResponse.json(
        { error: "Recipient is required" },
        { status: 400 }
      );
    }
    if (!body.subject?.trim()) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }
    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
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

    // Find or create conversation
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
          subject: body.subject.trim(),
          type: body.type ?? "general",
          propertyId: body.propertyId ?? null,
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
        content: body.content.trim(),
        status: "unread",
      })
      .returning();

    // Update conversation lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversation.id));

    // Send notification to recipient
    await createAndEmitNotification({
      userId: body.toUserId,
      type: "new_message",
      title: "New Message",
      message: `${currentUser.first_name} ${currentUser.last_name} sent you a message: "${body.subject}"`,
      data: JSON.stringify({
        messageId: newMessage?.id,
        fromUserId: currentUser.id,
        fromUserName: `${currentUser.first_name} ${currentUser.last_name}`,
      }),
      actionUrl: "/messages",
    });

    // Track message sent event in PostHog
    await trackServerEvent(clerkUserId, "message_sent", {
      message_id: newMessage?.id,
      message_type: body.type ?? "general",
      has_property_context: !!body.propertyId,
      message_body: body.content.trim(),
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
