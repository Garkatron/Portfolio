// React binding for the persistent playback host (src/lib/audio/host.js).
//
// Islands come and go with Astro's client-side navigation; this hook re-attaches
// to the one host that survives, so playback continues across pages and the
// player UI picks up exactly where it left off.
import { useEffect, useRef, useState } from "react";

import { getAudioHost } from "./host.js";

/** Rendered on the server and for the first client render; the host fills in the truth after mount. */
export const IDLE_STATE = {
  index: null,
  track: null,
  mode: "link",
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

  // Adopt this page's playlist and start listening to the host.
  useEffect(() => {
    if (!host) return;
    setState(host.getState());
    host.load(playlist.tracks, playlist.provider.id);
    return host.subscribe(setState);
  }, [host, playlist]);

  // Re-home the media nodes whenever the current track or its transport changes.
  useEffect(() => {
    host?.mount(surfaceRef.current);
  }, [host, state.mode, state.index]);

  return { host, state, surfaceRef };
}