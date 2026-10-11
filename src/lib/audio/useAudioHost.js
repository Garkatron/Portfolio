// React binding for the persistent playback host (src/lib/audio/host.js).
//
// Islands come and go with Astro's client-side navigation; this hook re-attaches
// to the one host that survives, so playback continues across pages and the
// player UI picks up exactly where it left off.
import { useEffect, useRef, useState } from "react";

import { getAudioHost } from "./host.js";

/** No track is known-dead before the host exists (this is also the SSR render). */
const NO_DEAD = [];

/** Rendered on the server and for the first client render; the host fills in the truth after mount. */
export const IDLE_STATE = {
  index: null,
  order: [],
  track: null,
  mode: "link",
  controlled: false,
  dead: NO_DEAD,
  playing: false,
  waiting: false,
  volume: 0,
  time: 0,
  duration: 0,
};

export function useAudioHost(playlist) {
  const host = getAudioHost();
  const [state, setState] = useState(IDLE_STATE);
  const surfaceRef = useRef(null);

  // Adopt this page's playlist and start listening to the host. Subscribe
  // before `load()`: it emits synchronously, and the new island has to hear it
  // (otherwise it would keep the pre-load snapshot and show stale playback).
  useEffect(() => {
    if (!host) return;
    const unsubscribe = host.subscribe(setState);
    setState(host.getState());
    host.load(playlist.tracks, playlist.provider);
    return unsubscribe;
  }, [host, playlist]);

  // Re-home the media nodes whenever the current track or its transport changes.
  useEffect(() => {
    host?.mount(surfaceRef.current);
  }, [host, state.mode, state.index]);

  return { host, state, surfaceRef };
}