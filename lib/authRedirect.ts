"use client";

// URL de retour OAuth qui préserve la page EXACTE où l'utilisateur se trouvait, query
// comprise — crucial pour les liens d'invitation : quelqu'un qui scanne le QR d'un salon
// arrive sur /blindtest?room=CODE ; sans ça, après connexion Google il retombait sur
// l'accueil et devait rescanner. Idem pour les liens d'invitation envoyés aux amis.
export function oauthCallbackUrl(): string {
  const next = window.location.pathname + window.location.search;
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
