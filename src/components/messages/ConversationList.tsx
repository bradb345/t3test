"use client";

import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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

interface ConversationListProps {
  conversations: Conversation[];
  selectedUserId: number | null;
  onSelectConversation: (userId: number) => void;
}

export function ConversationList({
  conversations,
  selectedUserId,
  onSelectConversation,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
        <div>
          <p className="font-medium">No conversations yet</p>
          <p className="text-sm">
            Start a conversation by contacting a landlord on a listing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conversation) => {
        const initials = conversation.userName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase();

        return (
          <button
            key={conversation.userId}
            onClick={() => onSelectConversation(conversation.userId)}
            className={cn(
              "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50",
              selectedUserId === conversation.userId && "bg-muted"
            )}
          >
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={conversation.userImage ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="truncate font-medium">{conversation.userName}</p>
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(conversation.lastMessage.createdAt)}
                </span>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {conversation.lastMessage.isFromCurrentUser && "You: "}
                {conversation.lastMessage.content}
              </p>
              {conversation.unreadCount > 0 && (
                <Badge variant="default" className="mt-1">
                  {conversation.unreadCount} new
                </Badge>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
