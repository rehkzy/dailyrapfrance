"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { WhatsAppIcon, SMSIcon, XIcon } from "@/components/SocialIcons";

const SITE_URL = "https://dailyrapfrance.best/jouer";

export default function ShareGame({
  text = "Je viens de jouer au blind test rap français de DailyRapFrance, viens tester ton niveau 🔥",
  url = SITE_URL,
  compact = false,
}: {
  text?: string;
  url?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // navigator.share n'existe que côté client — vérifié après montage pour éviter tout mismatch
  // d'hydratation SSR/client.
  useEffect(() => {
    if (typeof navigator !== "undefined" && "share" in navigator) setCanNativeShare(true);
  }, []);

  async function nativeShare() {
    try {
      await navigator.share({ title: "DailyRapFrance — Blind Test", text, url });
    } catch {
      // annulé par la personne ou non supporté à l'exécution — pas une erreur à afficher
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // presse-papier indisponible (contexte non sécurisé, permission refusée...) — silencieux
    }
  }

  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  const channels = [
    {
      label: "WhatsApp",
      Icon: WhatsAppIcon,
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      label: "Messages",
      Icon: SMSIcon,
      href: `sms:?body=${encodedText}%20${encodedUrl}`,
    },
    {
      label: "X",
      Icon: XIcon,
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
  ];

  return (
    <div className={`flex items-center flex-wrap ${compact ? "gap-2" : "gap-2.5"}`}>
      {channels.map(({ label, Icon, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Partager sur ${label}`}
          title={`Partager sur ${label}`}
          className="tap-press w-10 h-10 rounded-full glass flex items-center justify-center text-ink-muted hover:text-gold hover:border-gold/40 transition-colors"
        >
          <Icon />
        </a>
      ))}
      <button
        onClick={copyLink}
        aria-label="Copier le lien"
        title="Copier le lien"
        className="tap-press w-10 h-10 rounded-full glass flex items-center justify-center text-ink-muted hover:text-gold hover:border-gold/40 transition-colors"
      >
        {copied ? <Check size={16} className="text-gold" /> : <Copy size={16} />}
      </button>
      {canNativeShare && (
        <button
          onClick={nativeShare}
          className="tap-press inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-gold hover:bg-glow text-white text-sm font-medium transition-colors"
        >
          <Share2 size={15} />
          Partager
        </button>
      )}
    </div>
  );
}
