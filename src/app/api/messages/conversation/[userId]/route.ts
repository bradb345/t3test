import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { messages, user } from "~/server/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";

// GET: Fetch messages between current user and specified user
export async function GET(_request: NextRequest, props: { params: Promise<{ userId: string }> }) {
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

    // Get current user's DB ID
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get other user's info
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

    // Get all messages between the two users
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.fromUserId, currentUser.id),
            eq(messages.toUserId, otherUserId)
          ),
          and(
            eq(messages.fromUserId, otherUserId),
            eq(messages.toUserId, currentUser.id)
          )
        )
      )
      .orderBy(desc(messages.createdAt));

    // Format messages with sender info
    const formattedMessages = conversationMessages.map((msg) => ({
      id: msg.id,
      subject: msg.subject,
      content: msg.content,
      type: msg.type,
      status: msg.status,
      createdAt: msg.createdAt,
      isFromCurrentUser: msg.fromUserId === currentUser.id,
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
export async function POST(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
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

    // Get current user's DB ID
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent sending messages to yourself
    if (toUserId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot send a message to yourself" },
        { status: 400 }
      );
    }

    // Check recipient exists
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
      subject: string;
      content: string;
      type?: string;
    };

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Create the message
    const [newMessage] = await db
      .insert(messages)
      .values({
        fromUserId: currentUser.id,
        toUserId,
        subject: body.subject?.trim() || "Re: Conversation",
        content: body.content.trim(),
        type: body.type ?? "reply",
        status: "unread",
      })
      .returning();

    // Send notification to recipient
    await createAndEmitNotification({
      userId: toUserId,
      type: "new_message",
      title: "New Message",
      message: `${currentUser.first_name} ${currentUser.last_name} replied to your conversation`,
      data: JSON.stringify({
        messageId: newMessage?.id,
        fromUserId: currentUser.id,
        fromUserName: `${currentUser.first_name} ${currentUser.last_name}`,
      }),
      actionUrl: "/messages",
    });

    return NextResponse.json(
      {
        success: true,
        message: {
          id: newMessage?.id,
          subject: newMessage?.subject,
          content: newMessage?.content,
          type: newMessage?.type,
          status: newMessage?.status,
          createdAt: newMessage?.createdAt,
          isFromCurrentUser: true,
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
export async function PATCH(_request: NextRequest, props: { params: Promise<{ userId: string }> }) {
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

    // Get current user's DB ID
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.auth_id, clerkUserId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Mark all messages from other user as read
    await db
      .update(messages)
      .set({ status: "read" })
      .where(
        and(
          eq(messages.fromUserId, otherUserId),
          eq(messages.toUserId, currentUser.id),
          eq(messages.status, "unread")
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}
