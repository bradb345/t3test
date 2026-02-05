"use client";

import { useEffect, useRef } from "react";
import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

function formatMessageTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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

interface MessageThreadProps {
  messages: Message[];
  otherUser: {
    id: number;
    name: string;
    image: string | null;
  };
}

export function MessageThread({ messages, otherUser }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initials = otherUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Reverse to show oldest first (for chat-like UI)
  const sortedMessages = [...messages].reverse();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      <div className="flex-1 space-y-4">
        {sortedMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-end gap-2",
              message.isFromCurrentUser && "flex-row-reverse"
            )}
          >
            {!message.isFromCurrentUser && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={otherUser.image ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2",
                message.isFromCurrentUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {message.subject && message.type !== "reply" && (
                <p className="mb-1 text-xs font-semibold opacity-80">
                  {message.subject}
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              <p
                className={cn(
                  "mt-1 text-right text-[10px]",
                  message.isFromCurrentUser
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {formatMessageTime(message.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
