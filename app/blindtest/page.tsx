import BlindTest from "@/components/BlindTest";

export const metadata = {
  title: "Blind Test — DailyRapFrance",
  description: "Le blind test du rap français : toutes époques, tous thèmes. Solo ou à plusieurs.",
};

export default function BlindTestPage() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <div className="text-center mb-12">
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Jeu</p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-4">
          Blind Test Rap Français
        </h1>
        <p className="text-ink-muted max-w-xl mx-auto">
          90s, 2000s, cloud rap, 93, 91, 92, 77, 78, 13, 59, Île-de-France... Choisis un thème,
          seul ou entre potes sur le même écran. Titre et artiste rapportent 1 point chacun,
          trouver un featuring en rapporte 2 — et chacun a un joker pour réécouter un autre
          passage du son.
        </p>
      </div>

      <BlindTest />
    </section>
  );
}
