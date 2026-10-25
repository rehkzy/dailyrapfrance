"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

/*
 * Lecteur de clip YouTube pour le mode « Devine le clip ».
 *
 *  - IFrame Player API (chargée une fois), lecture inline, sans contrôles ni suggestions.
 *  - Recadrage : l'iframe est agrandie (scale) dans un cadre 16:9 à overflow caché, ce qui
 *    sort du champ la barre de titre YouTube (haut) et le filigrane / barre de progression
 *    (bas). Un calque transparent bloque toute interaction (pas de clic vers YouTube, pas de
 *    titre au survol).
 *  - Le point de départ évite l'intro (titre et artiste incrustés) : fourni par le serveur.
 *  - Pendant l'écoute, un voile optionnel peut flouter l'image (mode "clip flouté" à venir).
 */

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
      PlayerState: { PLAYING: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allow?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
};

let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}

export type ClipHandle = {
  play: () => void;
  pause: () => void;
  seekBy: (delta: number) => void;
  setVolume: (v: number) => void;
};

const ClipPlayer = forwardRef<ClipHandle, { videoId: string; start: number; volume: number; onError?: () => void; onPlaying?: () => void; blurred?: boolean; covered?: boolean }>(
  function ClipPlayer({ videoId, start, volume, onError, onPlaying, blurred = false, covered = false }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
      let cancelled = false;
      let player: YTPlayer | null = null;
      loadApi().then(() => {
        if (cancelled || !hostRef.current || !window.YT) return;
        const el = document.createElement("div");
        hostRef.current.replaceChildren(el);
        player = new window.YT.Player(el, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            start,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            cc_load_policy: 0,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              player?.setVolume(Math.round(volume * 100));
              setReady(true);
            },
            onError: () => onError?.(),
            // Le chrono de la manche ne démarre qu'à la vraie lecture (le buffering YouTube
            // peut prendre 1 à 3 s : sans ça, le joueur perd ce temps-là).
            onStateChange: (e: { data: number }) => {
              if (window.YT && e.data === window.YT.PlayerState.PLAYING) onPlaying?.();
            },
          },
        });
        playerRef.current = player;
      });
      return () => {
        cancelled = true;
        try {
          player?.destroy();
        } catch {
          /* déjà détruit */
        }
        playerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId]);

    useEffect(() => {
      playerRef.current?.setVolume(Math.round(volume * 100));
    }, [volume]);

    useImperativeHandle(ref, () => ({
      play: () => {
        const p = playerRef.current;
        if (!p) return;
        p.unMute();
        p.playVideo();
      },
      pause: () => playerRef.current?.pauseVideo(),
      seekBy: (delta) => {
        const p = playerRef.current;
        if (!p) return;
        const dur = p.getDuration() || 0;
        const next = Math.min(Math.max(0, p.getCurrentTime() + delta), Math.max(0, dur - 5));
        p.seekTo(next, true);
        p.playVideo();
      },
      setVolume: (v) => playerRef.current?.setVolume(Math.round(v * 100)),
    }));

    return (
      <div className="clip-frame" data-ready={ready} data-blurred={blurred}>
        <div className="clip-inner">
          <div ref={hostRef} className="clip-host" />
        </div>
        <div className="clip-band clip-band-top" aria-hidden="true" />
        <div className="clip-band clip-band-bottom" aria-hidden="true" />
        <div className="clip-shield" aria-hidden="true" />
        {covered && <div className="clip-cover">Le clip démarre au tap</div>}
      </div>
    );
  }
);

export default ClipPlayer;
