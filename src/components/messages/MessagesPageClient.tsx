"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "~/components/ui/card";
import { Loader2, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";
import { MessageInput } from "./MessageInput";

interface Conversation {
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

interface Message {
  id: number;
  subject: string;
  content: string;
  type: string;
  status: string;
  createdAt: Date;
  isFromCurrentUser: boolean;
}

interface ConversationData {
  otherUser: {
    id: number;
    name: string;
    image: string | null;
  };
  messages: Message[];
}

export function MessagesPageClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [conversationData, setConversationData] =
    useState<ConversationData | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/messages");
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      const data = (await response.json()) as { conversations: Conversation[] };
      setConversations(data.conversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Fetch conversation messages
  const fetchConversation = useCallback(async (userId: number) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages/conversation/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch conversation");
      }
      const data = (await response.json()) as ConversationData;
      setConversationData(data);

      // Mark messages as read
      await fetch(`/api/messages/conversation/${userId}`, {
        method: "PATCH",
      });

      // Update unread count in conversations list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.userId === userId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedUserId) {
      void fetchConversation(selectedUserId);
    }
  }, [selectedUserId, fetchConversation]);

  const handleSelectConversation = (userId: number) => {
    setSelectedUserId(userId);
    setConversationData(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedUserId || !conversationData) return;

    try {
      const response = await fetch(
        `/api/messages/conversation/${selectedUserId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: "Re: Conversation",
            content,
            type: "reply",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = (await response.json()) as { message: Message };

      // Add new message to the thread
      setConversationData((prev) =>
        prev
          ? {
              ...prev,
              messages: [data.message, ...prev.messages],
            }
          : null
      );

      // Update last message in conversations list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.userId === selectedUserId
            ? {
                ...conv,
                lastMessage: {
                  id: data.message.id,
                  subject: data.message.subject,
                  content: data.message.content,
                  status: data.message.status,
                  createdAt: data.message.createdAt,
                  isFromCurrentUser: true,
                },
              }
            : conv
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  const handleBack = () => {
    setSelectedUserId(null);
    setConversationData(null);
  };

  if (isLoadingConversations) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              void fetchConversations();
            }}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="mx-auto h-[calc(100vh-200px)] max-w-5xl overflow-hidden">
      <div className="flex h-full">
        {/* Conversation List - hidden on mobile when a conversation is selected */}
        <div
          className={cn(
            "w-full flex-shrink-0 border-r md:w-80",
            selectedUserId && "hidden md:block"
          )}
        >
          <div className="flex h-14 items-center border-b px-4">
            <h2 className="font-semibold">Messages</h2>
          </div>
          <div className="h-[calc(100%-56px)] overflow-y-auto">
            <ConversationList
              conversations={conversations}
              selectedUserId={selectedUserId}
              onSelectConversation={handleSelectConversation}
            />
          </div>
        </div>

        {/* Message Thread */}
        <div
          className={cn(
            "flex flex-1 flex-col",
            !selectedUserId && "hidden md:flex"
          )}
        >
          {selectedUserId && conversationData ? (
            <>
              {/* Header */}
              <div className="flex h-14 items-center gap-3 border-b px-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <p className="font-semibold">{conversationData.otherUser.name}</p>
                </div>
              </div>

              {/* Messages */}
              {isLoadingMessages ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <MessageThread
                  messages={conversationData.messages}
                  otherUser={conversationData.otherUser}
                />
              )}

              {/* Input */}
              <MessageInput onSend={handleSendMessage} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-muted-foreground">
              <div>
                <MessageSquare className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-4 font-medium">Select a conversation</p>
                <p className="text-sm">
                  Choose a conversation from the list to start messaging.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
