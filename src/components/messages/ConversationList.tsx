"use client";

import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">No conversations yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Start by contacting a landlord on a listing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((conversation) => {
        const initials = conversation.userName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase();

        const isSelected = selectedUserId === conversation.userId;
        const hasUnread = conversation.unreadCount > 0;

        return (
          <button
            key={conversation.userId}
            onClick={() => onSelectConversation(conversation.userId)}
            className={cn(
              "group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
              "hover:bg-muted/60",
              isSelected && "bg-accent/50"
            )}
          >
            {/* Active indicator */}
            {isSelected && (
              <div className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary" />
            )}

            <div className="relative flex-shrink-0">
              <Avatar className="h-11 w-11">
                <AvatarImage src={conversation.userImage ?? undefined} />
                <AvatarFallback className="bg-secondary text-sm font-medium text-secondary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {hasUnread && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-card">
                  {conversation.unreadCount > 9
                    ? "9+"
                    : conversation.unreadCount}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-sm",
                    hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
                  )}
                >
                  {conversation.userName}
                </p>
                <span
                  className={cn(
                    "flex-shrink-0 text-[11px]",
                    hasUnread
                      ? "font-medium text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {formatRelativeTime(conversation.lastMessage.createdAt)}
                </span>
              </div>
              <p
                className={cn(
                  "mt-0.5 truncate text-[13px] leading-snug",
                  hasUnread
                    ? "font-medium text-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                {conversation.lastMessage.isFromCurrentUser && (
                  <span className="text-muted-foreground">You: </span>
                )}
                {conversation.lastMessage.content}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
