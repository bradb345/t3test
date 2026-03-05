"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, MessageSquare, ArrowLeft } from "lucide-react";
import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";
import { MessageInput, type Attachment } from "./MessageInput";

interface Conversation {
  userId: number;
  userName: string;
  userImage: string | null;
  lastMessage: {
    id: number;
    content: string;
    status: string;
    createdAt: Date;
    isFromCurrentUser: boolean;
  };
  unreadCount: number;
}

interface Message {
  id: number;
  content: string;
  status: string;
  createdAt: Date;
  isFromCurrentUser: boolean;
  attachments?: { name: string; url: string; type: string; size: number }[] | null;
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

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/messages");
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      const data = (await response.json()) as {
        conversations: Conversation[];
      };
      setConversations(data.conversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

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

  const handleSendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!selectedUserId || !conversationData) return;

    try {
      const response = await fetch(
        `/api/messages/conversation/${selectedUserId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, attachments }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = (await response.json()) as { message: Message };

      setConversationData((prev) =>
        prev
          ? {
              ...prev,
              messages: [data.message, ...prev.messages],
            }
          : null
      );

      setConversations((prev) =>
        prev.map((conv) =>
          conv.userId === selectedUserId
            ? {
                ...conv,
                lastMessage: {
                  id: data.message.id,
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
      <div className="flex h-[70vh] items-center justify-center rounded-xl border bg-card shadow">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center rounded-xl border bg-card shadow">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setIsLoadingConversations(true);
            void fetchConversations();
          }}
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[70vh] overflow-hidden rounded-xl border bg-card shadow">
      {/* Conversation List */}
      <div
        className={cn(
          "flex w-full flex-shrink-0 flex-col border-r md:w-80 lg:w-96",
          selectedUserId && "hidden md:flex"
        )}
      >
        <div className="flex h-14 flex-shrink-0 items-center border-b px-4">
          <h2 className="text-[15px] font-semibold tracking-tight">
            Conversations
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
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
            <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b px-3 sm:px-4">
              <button
                onClick={handleBack}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={conversationData.otherUser.image ?? undefined}
                />
                <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
                  {conversationData.otherUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold tracking-tight">
                {conversationData.otherUser.name}
              </p>
            </div>

            {/* Messages */}
            {isLoadingMessages ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Select a conversation
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose from the list to start messaging.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
