import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MessagesPageClient } from "~/components/messages/MessagesPageClient";

export default async function MessagesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background pt-16">
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
          <div className="mb-4 flex-shrink-0">
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            <p className="text-sm text-muted-foreground">
              View and manage your conversations with landlords and tenants.
            </p>
          </div>
          <MessagesPageClient />
        </div>
      </div>
    </main>
  );
}
