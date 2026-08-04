import Script from "next/script";

// Charge GA4 uniquement si l'ID de mesure est configuré — rien ne se passe sinon, pas
// d'erreur si la variable n'existe pas encore. Accepte les deux noms de variable
// (NEXT_PUBLIC_GA_MEASUREMENT_ID, le nom configuré sur Vercel, ou NEXT_PUBLIC_GA_ID,
// l'ancien nom lu ici) : leur désaccord silencieux — composant qui rendait null sans
// erreur — est exactement ce qui a fait tourner le site sans aucune donnée GA4.
export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
