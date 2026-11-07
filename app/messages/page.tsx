import type { Metadata } from "next";
import BackToGame from "@/components/BackToGame";
import { Inbox } from "@/components/Messenger";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default function MessagesPage() {
  return (
    <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
      <BackToGame />
      <p className="stage-kicker mb-2">Entre amis</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-6">Messages</h1>
      <Inbox />
    </section>
  );
}
