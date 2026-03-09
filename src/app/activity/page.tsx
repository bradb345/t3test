import { redirect } from "next/navigation";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  redirect(`/dashboard?tab=${tab === "viewings" ? "viewings" : "applications"}`);
}
