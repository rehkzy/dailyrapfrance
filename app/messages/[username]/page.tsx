import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/adminAuth";
import { Thread } from "@/components/Messenger";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function ThreadPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const db = adminClient();
  const isId = /^[0-9a-f-]{36}$/.test(username);
  const peer = await Promise.resolve(db.from("profiles").select("id,username,display_name,avatar_url,verified").eq(isId ? "id" : "username", username).maybeSingle()).then((r) => r.data).catch(() => null);
  if (!peer) notFound();
  return <Thread peer={peer} />;
}
