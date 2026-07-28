import { NextRequest, NextResponse } from "next/server";

// URL de preview *fraîche* pour un titre donné — sans aucun cache.
//
// Pourquoi : les URLs de preview Deezer sont signées et expirent (paramètres hmac/exp dans
// l'URL cdn). Le pool de la partie est construit une fois au lancement, et ses réponses
// Deezer sont de plus mises en cache 30 min côté serveur (revalidate) : au fil des manches,
// une URL peut donc être périmée au moment où on la joue → "Le son n'a pas pu se charger",
// et recharger la même URL ne servait à rien. Cet endpoint interroge Deezer en direct
// (no-store des deux côtés) pour re-signer une URL valide à l'instant T.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "id invalide" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.deezer.com/track/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Deezer track/${id} → HTTP ${res.status}`);
    const track = (await res.json()) as { preview?: string; error?: unknown };
    const previewUrl = (track.preview ?? "").replace(/^http:\/\//, "https://");
    if (!previewUrl) {
      return NextResponse.json({ error: "pas de preview pour ce titre" }, { status: 404 });
    }
    return NextResponse.json(
      { previewUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Deezer injoignable" }, { status: 502 });
  }
}
