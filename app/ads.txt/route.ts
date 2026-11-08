/* ads.txt requis par AdSense : généré depuis NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-XXXX). */
export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.replace(/^ca-/, "");
  const body = client ? `google.com, ${client}, DIRECT, f08c47fec0942fa0\n` : "# Configure NEXT_PUBLIC_ADSENSE_CLIENT sur Vercel pour activer AdSense\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
