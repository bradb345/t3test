"use client";

import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { FileText, Download } from "lucide-react";

function formatMessageTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = d.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return `Yesterday ${timeStr}`;
  if (diffDays < 7)
    return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${timeStr}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${timeStr}`;
}

function shouldShowDateSeparator(
  current: Date | string,
  previous: Date | string | null
): boolean {
  if (!previous) return true;
  const currentDate = typeof current === "string" ? new Date(current) : current;
  const prevDate =
    typeof previous === "string" ? new Date(previous) : previous;
  return currentDate.toDateString() !== prevDate.toDateString();
}

function formatDateSeparator(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Message {
  id: number;
  content: string;
  status: string;
  createdAt: Date;
  isFromCurrentUser: boolean;
  attachments?: Attachment[] | null;
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
  const initials = otherUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Reverse to show oldest first
  const sortedMessages = [...messages].reverse();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="px-3 py-4 sm:px-5">
        <div className="space-y-1">
          {sortedMessages.map((message, index) => {
            const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
            const nextMessage =
              index < sortedMessages.length - 1
                ? sortedMessages[index + 1]
                : null;

            const showDateSeparator = shouldShowDateSeparator(
              message.createdAt,
              prevMessage?.createdAt ?? null
            );

            // Group consecutive messages from same sender
            const isFirstInGroup =
              !prevMessage ||
              prevMessage.isFromCurrentUser !== message.isFromCurrentUser ||
              showDateSeparator;
            const isLastInGroup =
              !nextMessage ||
              nextMessage.isFromCurrentUser !== message.isFromCurrentUser;

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center py-4">
                    <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                      {formatDateSeparator(message.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    "flex items-end gap-2",
                    message.isFromCurrentUser ? "flex-row-reverse" : "flex-row",
                    isFirstInGroup && "mt-3"
                  )}
                >
                  {/* Avatar — only show on last message in a group from other user */}
                  {!message.isFromCurrentUser ? (
                    isLastInGroup ? (
                      <Avatar className="mb-0.5 h-7 w-7 flex-shrink-0">
                        <AvatarImage src={otherUser.image ?? undefined} />
                        <AvatarFallback className="bg-secondary text-[10px] font-medium text-secondary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-7 flex-shrink-0" />
                    )
                  ) : null}

                  <div
                    className={cn(
                      "max-w-[80%] px-3.5 py-2 sm:max-w-[70%]",
                      message.isFromCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                      // Rounded corners based on position in group
                      message.isFromCurrentUser
                        ? cn(
                            "rounded-2xl",
                            isFirstInGroup && "rounded-tr-md",
                            !isFirstInGroup && !isLastInGroup && "rounded-r-md",
                            isLastInGroup && !isFirstInGroup && "rounded-br-md",
                            isFirstInGroup && isLastInGroup && "rounded-2xl"
                          )
                        : cn(
                            "rounded-2xl",
                            isFirstInGroup && "rounded-tl-md",
                            !isFirstInGroup && !isLastInGroup && "rounded-l-md",
                            isLastInGroup && !isFirstInGroup && "rounded-bl-md",
                            isFirstInGroup && isLastInGroup && "rounded-2xl"
                          )
                    )}
                  >
                    {message.content && (
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
                        {message.content}
                      </p>
                    )}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className={cn("flex flex-col gap-1.5", message.content && "mt-1.5")}>
                        {message.attachments.map((attachment, i) =>
                          attachment.type.startsWith("image/") ? (
                            <a
                              key={i}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-lg"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="max-h-48 max-w-full rounded-lg object-cover transition-opacity hover:opacity-90"
                              />
                            </a>
                          ) : (
                            <a
                              key={i}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                                message.isFromCurrentUser
                                  ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                                  : "bg-background/60 hover:bg-background/80"
                              )}
                            >
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                              <Download className="h-3.5 w-3.5 flex-shrink-0" />
                            </a>
                          )
                        )}
                      </div>
                    )}
                    {isLastInGroup && (
                      <p
                        className={cn(
                          "mt-1 text-[10px] leading-none",
                          message.isFromCurrentUser
                            ? "text-right text-primary-foreground/60"
                            : "text-right text-muted-foreground"
                        )}
                      >
                        {formatMessageTime(message.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
