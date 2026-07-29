import "server-only";

/*
 * Envoi d'e-mails via Resend (plan gratuit : 3 000/mois, 100/jour) — un simple appel
 * HTTP, pas de SDK. Variables d'environnement requises :
 *   RESEND_API_KEY  — clé API Resend
 *   EMAIL_FROM      — expéditeur vérifié, ex. "DailyRapFrance <hello@dailyrapfrance.best>"
 *
 * Tous les mails partent habillés du même gabarit brandé (fond sombre, logo, CTA rouge,
 * lien de réponse directe) : dans l'admin tu n'écris que le texte, la mise en forme est
 * appliquée ici.
 */

const RESEND_URL = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(to: string, subject: string, bodyText: string): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) return { ok: false, error: "RESEND_API_KEY ou EMAIL_FROM manquante." };
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html: brandedHtml(subject, bodyText),
      text: bodyText,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status} — ${err.slice(0, 200)}` };
  }
  return { ok: true };
}

// Texte brut → HTML brandé, dans la charte exacte du site (fond #0a0707, halos rouges
// #F0001C/#780101, police Bricolage Grotesque, logo officiel posé sur une pastille glass
// sans cadre — le même traitement que la carte de score partagée). Les paragraphes sont
// séparés par des lignes vides ; une ligne "> Libellé|url" devient un bouton CTA rouge.
function brandedHtml(subject: string, bodyText: string): string {
  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const cta = p.match(/^>\s*(.+?)\s*\|\s*(https?:\/\/\S+)$/);
      if (cta) {
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px auto 6px;"><tr><td style="background:#F0001C;border-radius:999px;box-shadow:0 6px 24px rgba(240,0,28,0.35);">
          <a href="${cta[2]}" style="display:inline-block;padding:15px 36px;color:#ffffff;font-weight:700;text-decoration:none;font-size:15px;font-family:'Bricolage Grotesque',Arial,Helvetica,sans-serif;">${cta[1]}</a>
        </td></tr></table>`;
      }
      return `<p class="drf-text" style="margin:0 0 18px;color:rgba(245,232,232,0.88);font-size:15px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">${p.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");

  return `<!doctype html><html lang="fr"><head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light only"/>
  <meta name="supported-color-schemes" content="light only"/>
  <title>${subject}</title>
  <style>
    /* Empêche Apple Mail / Outlook.com / Gmail app d'appliquer leur propre mode sombre :
       le design est déjà sombre et fixe, on ne veut aucune ré-interprétation de couleurs. */
    :root { color-scheme: light only; supported-color-schemes: light only; }
    html, body { margin: 0 !important; padding: 0 !important; background: #0a0707 !important; width: 100% !important; }
    body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    table { border-collapse: collapse !important; }
    @media (prefers-color-scheme: dark) {
      html, body, .drf-bg { background: #0a0707 !important; }
      .drf-card { background: rgba(255,255,255,0.05) !important; }
      p, .drf-text { color: rgba(245,232,232,0.88) !important; }
    }
  </style>
  </head><body bgcolor="#0a0707" style="margin:0;padding:0;background:#0a0707;width:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0707" class="drf-bg" style="background:radial-gradient(ellipse 900px 500px at 15% -10%,rgba(240,0,28,0.22),transparent 68%),radial-gradient(ellipse 900px 500px at 100% 110%,rgba(120,1,1,0.28),transparent 68%),#0a0707;padding:56px 16px 44px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo officiel (PNG hébergé sur le site, dimensions verrouillées pour éviter toute déformation) -->
        <tr><td align="center" style="padding-bottom:28px;">
          <img src="https://dailyrapfrance.best/logo-email.png" width="92" height="92" alt="DailyRapFrance" style="display:block;width:92px;height:92px;margin:0 auto;border-radius:20px;box-shadow:0 8px 28px rgba(240,0,28,0.35);"/>
          <p style="margin:16px 0 0;color:#ffffff;font-weight:800;font-size:19px;letter-spacing:2.5px;font-family:'Bricolage Grotesque',Arial,Helvetica,sans-serif;">DAILYRAPFRANCE</p>
          <p style="margin:5px 0 0;color:#F0001C;font-weight:600;font-size:11px;letter-spacing:3px;font-family:'Bricolage Grotesque',Arial,Helvetica,sans-serif;">BLIND TEST RAP FRANÇAIS</p>
        </td></tr>

        <!-- Carte glass contenant le message -->
        <tr><td class="drf-card" style="background:linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));border-radius:24px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.10);padding:36px 32px;">
          ${paragraphs}
        </td></tr>

        <!-- Réseaux sociaux -->
        <tr><td align="center" style="padding-top:26px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:0 6px;">
              <a href="https://www.tiktok.com/@dailyrapfrance" style="display:inline-block;padding:9px 18px;border-radius:999px;background:rgba(255,255,255,0.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14);color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;font-family:'Bricolage Grotesque',Arial,Helvetica,sans-serif;letter-spacing:0.3px;">TikTok</a>
            </td>
            <td style="padding:0 6px;">
              <a href="https://x.com/dailyrapfrance" style="display:inline-block;padding:9px 18px;border-radius:999px;background:rgba(255,255,255,0.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14);color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;font-family:'Bricolage Grotesque',Arial,Helvetica,sans-serif;letter-spacing:0.3px;">X</a>
            </td>
            <td style="padding:0 6px;">
              <a href="https://www.instagram.com/dailyrapfrance" style="display:inline-block;padding:9px 18px;border-radius:999px;background:rgba(255,255,255,0.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14);color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;font-family:'Bricolage Grotesque',Arial,Helvetica,sans-serif;letter-spacing:0.3px;">Instagram</a>
            </td>
          </tr></table>
          <p class="drf-text" style="margin:10px 0 0;color:rgba(245,232,232,0.4);font-size:11px;font-family:Arial,Helvetica,sans-serif;">@dailyrapfrance</p>
        </td></tr>

        <tr><td align="center" style="padding-top:24px;">
          <p class="drf-text" style="margin:0;color:rgba(245,232,232,0.4);font-size:12px;font-family:Arial,Helvetica,sans-serif;">
            DailyRapFrance — média indépendant du rap FR ·
            <a href="https://dailyrapfrance.best" style="color:#F0001C;text-decoration:none;font-weight:600;">dailyrapfrance.best</a>
          </p>
          <p class="drf-text" style="margin:8px 0 0;color:rgba(245,232,232,0.28);font-size:11px;font-family:Arial,Helvetica,sans-serif;">
            Tu reçois ce mail parce que tu as un compte sur le blind test. Réponds simplement à ce mail pour nous parler.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── Modèles prêts à l'emploi ──────────────────────────────────────────────

export const CAMPAIGN_TEMPLATE = {
  subject: "On évolue grâce à toi 🔴 — 2 minutes pour nous aider ?",
  body: `Salut !

Petit mot de l'équipe DailyRapFrance. Si tu ne nous connais pas encore bien : on est un média indépendant du rap français depuis 2020 — né sur les réseaux, porté par la passion du rap FR. Le blind test, c'est notre nouveau terrain de jeu, et il grandit vite : mode Soirée sur ta TV, salons entre potes, nouveaux thèmes chaque semaine (Aya Nakamura vient d'arriver 🔥).

Et justement, on évolue — mais pas sans toi. Ton retour compte énormément : ce que tu kiffes, ce qui te frustre, le thème ou la feature que tu rêves de voir. Réponds simplement à ce mail, on lit tout et on répond.

Et si le jeu te plaît, le plus beau cadeau que tu puisses nous faire, c'est de le montrer : lance une partie avec tes potes ce week-end, partage ton score en story, ou envoie juste le lien à la personne qui se croit incollable en rap FR.

> Lancer une partie|https://dailyrapfrance.best/blindtest

Merci d'être là depuis le début. Le meilleur arrive.

Florian B.
CEO — DailyRapFrance
<a href="https://florian-b.fr" style="color:#F0001C;text-decoration:none;font-weight:600;">florian-b.fr</a> · <a href="https://www.instagram.com/florian.b93tsz" style="color:#F0001C;text-decoration:none;font-weight:600;">@florian.b93tsz</a>`,
};

export const FEEDBACK_TEMPLATE = {
  subject: "Alors, ce blind test ? Dis-nous tout 👀",
  body: `Salut !

Ça fait quelques jours que tu as rejoint le blind test DailyRapFrance — et on aimerait vraiment savoir ce que tu en penses.

On est un petit média indépendant du rap FR (depuis 2020), et chaque retour nous aide directement à améliorer le jeu : un thème qui manque, un bug qui t'a gêné, une idée de mode... Réponds simplement à ce mail, on lit tout.

Et si t'as kiffé : défie un pote, c'est encore mieux à plusieurs.

> Rejouer maintenant|https://dailyrapfrance.best/blindtest

Merci !

Florian B.
CEO — DailyRapFrance
<a href="https://florian-b.fr" style="color:#F0001C;text-decoration:none;font-weight:600;">florian-b.fr</a> · <a href="https://www.instagram.com/florian.b93tsz" style="color:#F0001C;text-decoration:none;font-weight:600;">@florian.b93tsz</a>`,
};
