import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/adminAuth";
import { Thread } from "@/components/Messenger";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function ThreadPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const db = adminClient();
  const isId = /^[0-9a-f-]{36}$/.test(username);
  const { data: peer } = await db.from("profiles").select("id,username,display_name,avatar_url").eq(isId ? "id" : "username", username).maybeSingle();
  if (!peer) notFound();
  return (
    <section className="max-w-2xl mx-auto px-5 pt-6 pb-24">
      <Thread peer={peer} />
    </section>
  );
}
