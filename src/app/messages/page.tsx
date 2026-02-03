import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MessagesPageClient } from "~/components/messages/MessagesPageClient";

export default async function MessagesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="w-full px-4 pt-24 pb-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            <p className="text-muted-foreground">
              View and manage your conversations with landlords and tenants.
            </p>
          </div>
          <MessagesPageClient />
        </div>
      </div>
    </main>
  );
}
