import type { Metadata } from "next";
import BackToGame from "@/components/BackToGame";
import NotificationsList from "@/components/NotificationsList";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default function NotificationsPage() {
  return (
    <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
      <BackToGame />
      <p className="stage-kicker mb-2">Ce qui bouge autour de toi</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-6">Notifications</h1>
      <NotificationsList />
    </section>
  );
}
