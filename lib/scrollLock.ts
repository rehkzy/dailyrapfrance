/*
 * Verrou de scroll partagé — technique position:fixed sur <body> (fiable sur iOS
 * Safari, contrairement à overflow:hidden seul).
 *
 * Avant, chaque composant qui avait besoin de verrouiller le scroll (tiroir mobile,
 * manche de blind test en cours...) posait/retirait directement les styles sur
 * document.body dans son propre effet. Problème : si DEUX verrous se chevauchent (le
 * tiroir mobile s'ouvre pendant qu'une manche est en cours, par exemple), le second à
 * se fermer écrase le style posé par le premier au lieu de simplement "décompter" —
 * le scroll restait bloqué, ou se débloquait au mauvais moment, et la position d'origine
 * pouvait être perdue. D'où "le retour en arrière est compliqué et buggue partout".
 *
 * Ici, un compteur de références : le scroll n'est réellement déverrouillé que quand le
 * DERNIER verrou actif est relâché, et la position d'origine n'est mémorisée qu'une
 * seule fois (au tout premier verrou), donc toujours restaurée correctement quel que
 * soit le nombre de verrous imbriqués.
 *
 * Usage : lockScroll() au montage/activation, unlockScroll() au démontage/désactivation
 * (toujours en paire, idéalement dans le cleanup d'un useEffect).
 */

let lockCount = 0;
let savedScrollY = 0;

export function lockScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }
  lockCount++;
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, savedScrollY);
  }
}
