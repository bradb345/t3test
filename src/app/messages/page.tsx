import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function MessagesPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }

  // TODO: Fetch messages from database
  const hasMessages = false; // This will be replaced with actual message check

  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-6xl px-4 pt-32 pb-16">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Your Messages
          </h1>
          <p className="text-lg text-muted-foreground">
            View and manage your conversations
          </p>
        </div>

        <div className="mt-16">
          {hasMessages ? (
            <div className="space-y-4">
              {/* Message list will go here */}
              <p>Messages will be displayed here</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground">No messages yet</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 