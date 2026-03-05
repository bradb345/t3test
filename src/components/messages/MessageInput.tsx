"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Paperclip, X, FileText, ImageIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { useUploadThing } from "~/utils/uploadthing";

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface MessageInputProps {
  onSend: (content: string, attachments?: Attachment[]) => Promise<void>;
  disabled?: boolean;
}

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("messageAttachment");

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const addFiles = useCallback((files: FileList | File[]) => {
    setUploadError(null);
    const newFiles = Array.from(files);

    for (const file of newFiles) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError("Only JPG, PNG, WebP, GIF and PDF files are allowed");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError("Files must be under 10MB");
        return;
      }
    }

    setPendingFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > MAX_FILES) {
        setUploadError(`Maximum ${MAX_FILES} files per message`);
        return prev;
      }
      return combined;
    });
  }, []);

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent = message.trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    if ((!hasContent && !hasFiles) || isSending || isUploading || disabled) return;

    setIsSending(true);
    setUploadError(null);

    try {
      let attachments: Attachment[] | undefined;

      if (hasFiles) {
        setIsUploading(true);
        const uploadResult = await startUpload(pendingFiles);
        setIsUploading(false);

        if (!uploadResult) {
          setUploadError("Upload failed. Please try again.");
          setIsSending(false);
          return;
        }

        attachments = uploadResult.map((file) => ({
          name: file.name,
          url: file.ufsUrl,
          type: file.type,
          size: file.size,
        }));
      }

      await onSend(message.trim(), attachments);
      setMessage("");
      setPendingFiles([]);
    } catch {
      setUploadError("Failed to send message");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const canSend = (message.trim().length > 0 || pendingFiles.length > 0) && !isSending && !isUploading && !disabled;
  const isBusy = isSending || isUploading;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t bg-card px-3 py-3 sm:px-4"
    >
      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs"
            >
              {file.type.startsWith("image/") ? (
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="max-w-[120px] truncate text-foreground">
                {file.name}
              </span>
              <span className="text-muted-foreground">
                {(file.size / 1024).toFixed(0)}KB
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="rounded-full p-0.5 transition-colors hover:bg-muted"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <p className="mb-2 text-xs text-destructive">{uploadError}</p>
      )}

      <div className="flex items-start gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy || disabled || pendingFiles.length >= MAX_FILES}
          className={cn(
            "flex h-11 w-10 flex-shrink-0 items-center justify-center rounded-2xl transition-all",
            "text-muted-foreground hover:bg-muted hover:text-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className={cn(
              "w-full resize-none rounded-2xl border bg-background px-4 py-2.5 text-sm leading-relaxed",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-[120px]"
            )}
            rows={1}
            disabled={isBusy || disabled}
          />
        </div>
        <button
          type="submit"
          disabled={!canSend}
          className={cn(
            "flex w-10 flex-shrink-0 items-center justify-center h-11 rounded-2xl transition-all",
            canSend
              ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-6 w-6" />
          )}
        </button>
      </div>
    </form>
  );
}
