"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sfx } from "@/lib/sfx";

/* Fin de partie : « Tu kiffes ? Laisse un mot ». Une fois par semaine max, jamais insistant.
 * Les avis affichés sur l'accueil sont uniquement ceux-là, approuvés à la main. */
const KEY = "drf-review-asked";

export default function ReviewPrompt({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(KEY) ?? 0);
      const games = Number(localStorage.getItem("drf-games-played") ?? 0) + 1;
      localStorage.setItem("drf-games-played", String(games));
      if (games >= 3 && Date.now() - last > 7 * 86400000) setShow(true);
    } catch {}
  }, []);
  if (!show) return null;
  async function send() {
    if (!rating || text.trim().length < 3) return;
    const { error } = await createClient().from("player_reviews").insert({ user_id: userId, rating, text: text.trim().slice(0, 180) });
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    if (!error) { setDone(true); sfx.correct(); } else setShow(false);
  }
  function later() { try { localStorage.setItem(KEY, String(Date.now())); } catch {} setShow(false); }
  if (done) return <p className="ticket p-4 text-center text-sm mt-4">Merci. Ton mot pourra apparaître sur l&apos;accueil, avec ton pseudo.</p>;
  return (
    <div className="ticket p-4 mt-4">
      <p className="font-display text-base font-bold mb-1">Tu kiffes ? Laisse un mot.</p>
      <div className="flex gap-1 mb-3">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => { setRating(n); sfx.click(); }} aria-label={`${n} étoiles`}><Star size={24} className={n <= rating ? "text-gold fill-gold" : "text-ink-faint"} /></button>)}</div>
      <input value={text} onChange={(e) => setText(e.target.value.slice(0, 180))} placeholder="En une phrase" className="answer-input w-full mb-3" aria-label="Ton avis" />
      <div className="flex gap-2"><button type="button" onClick={later} className="sticker sticker-ghost sticker-sm flex-1 justify-center">Plus tard</button><button type="button" onClick={() => void send()} disabled={!rating || text.trim().length < 3} className="sticker sticker-sm flex-1 justify-center disabled:opacity-40">Envoyer</button></div>
    </div>
  );
}
