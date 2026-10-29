/* JSON-LD inliné dans un <script> : on échappe "<" pour qu'un titre saisi par un joueur
   (« </script><script>… ») ne puisse jamais sortir du bloc. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
