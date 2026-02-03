import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { messages, user } from "~/server/db/schema";
import { eq, or, desc, sql } from "drizzle-orm";
import { createAndEmitNotification } from "~/server/notification-emitter";

// GET: Fetch user's conversations (grouped by other user)
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Get all messages where user is sender or recipient
    const allMessages = await db
      .select({
        message: messages,
        otherUser: user,
      })
      .from(messages)
      .innerJoin(
        user,
        sql`CASE
          WHEN ${messages.fromUserId} = ${currentUser.id} THEN ${messages.toUserId} = ${user.id}
          ELSE ${messages.fromUserId} = ${user.id}
        END`
      )
      .where(
        or(
          eq(messages.fromUserId, currentUser.id),
          eq(messages.toUserId, currentUser.id)
        )
      )
      .orderBy(desc(messages.createdAt));

    // Group by other user
    const conversationsMap = new Map<
      number,
      {
        userId: number;
        userName: string;
        userImage: string | null;
        lastMessage: {
          id: number;
          subject: string;
          content: string;
          status: string;
          createdAt: Date;
          isFromCurrentUser: boolean;
        };
        unreadCount: number;
      }
    >();

    for (const row of allMessages) {
      const otherUserId = row.otherUser.id;
      const isFromCurrentUser = row.message.fromUserId === currentUser.id;

      if (!conversationsMap.has(otherUserId)) {
        // Count unread messages from this user
        const unreadCount = allMessages.filter(
          (m) =>
            m.otherUser.id === otherUserId &&
            m.message.fromUserId === otherUserId &&
            m.message.status === "unread"
        ).length;

        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          userName: `${row.otherUser.first_name} ${row.otherUser.last_name}`,
          userImage: row.otherUser.image_url,
          lastMessage: {
            id: row.message.id,
            subject: row.message.subject,
            content: row.message.content,
            status: row.message.status,
            createdAt: row.message.createdAt,
            isFromCurrentUser,
          },
          unreadCount,
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST: Send a new message
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const body = (await request.json()) as {
      toUserId: number;
      subject: string;
      content: string;
      type?: string;
      propertyId?: number;
      unitId?: number;
    };

    // Validate required fields
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

    // Check recipient exists
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

    // Cannot send to self
    if (body.toUserId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot send message to yourself" },
        { status: 400 }
      );
    }

    // Create the message
    const [newMessage] = await db
      .insert(messages)
      .values({
        fromUserId: currentUser.id,
        toUserId: body.toUserId,
        subject: body.subject.trim(),
        content: body.content.trim(),
        type: body.type ?? "general",
        status: "unread",
        propertyId: body.propertyId ?? null,
      })
      .returning();

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
