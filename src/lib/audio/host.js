// Client-side playback host.
//
// This lives on `window` on purpose. Astro's <ClientRouter> replaces the whole
// <body> when the visitor navigates, but `window` survives — so keeping the
// <audio> element (and the provider iframe) here is what lets the music keep
// playing while the reader moves between pages. Every player island, before
// and after a navigation, attaches to this one host.
//
// Islands re-mount on each page, so the host is also the source of truth for
// "what is playing": React only renders state, it never owns playback.
import { trackMode } from "./util.js";

const KEY = "__garkatronAudioHost";
const TRACK_KEY = "garkatron:track";
const VOLUME_KEY = "garkatron:volume";
const DEFAULT_VOLUME = 0.3; // low, per request
// Must match `transition:persist` in src/layout/Base.astro.
const PERSIST_ID = "garkatron-audio";
const WIDGET_LOAD_MS = 400; // a fresh widget needs a moment before it listens

function readVolume() {
  try {
    const stored = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function writeVolume(value) {
  try {
    localStorage.setItem(VOLUME_KEY, String(value));
  } catch {}
}

/** The remembered track index, or null on a first visit. */
function readIndex() {
  try {
    const raw = sessionStorage.getItem(TRACK_KEY);
    if (raw === null) return null; // `Number(null)` is 0, which would read as track 0
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeIndex(index) {
  try {
    sessionStorage.setItem(TRACK_KEY, String(index));
  } catch {}
}

function createHost() {
  // Detached on purpose: a media element that is never part of a swapped <body>
  // cannot be torn down by a navigation.
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = readVolume();

  let embed = null; // provider widget iframe, created on first use

  const state = {
    tracks: [],
    providerId: null,
    index: null,
    mode: "link",
    playing: false,
    waiting: false, // muted autoplay, still waiting for a user gesture
    volume: audio.volume,
    time: 0,
    duration: 0,
  };

  const listeners = new Set();

  const snapshot = () => ({
    index: state.index,
    track: state.index === null ? null : (state.tracks[state.index] ?? null),
    mode: state.mode,
    playing: state.playing,
    waiting: state.waiting,
    volume: state.volume,
    time: state.time,
    duration: state.duration,
  });

  const emit = () => {
    const snap = snapshot();
    for (const fn of [...listeners]) fn(snap);
  };

  // ---- persistence across Astro navigations -------------------------------

  /** The container Base.astro marks `transition:persist`; Astro lifts it out of <body> before the swap. */
  function container() {
    return document.querySelector(`[data-astro-transition-persist="${PERSIST_ID}"]`);
  }

  /**
   * Park the media nodes in the persisted container. Called on
   * `astro:before-swap`, i.e. while React is still mounted and the surface it
   * rendered is still connected — parking them is what carries them over.
   *
   * Known limitation: re-parenting an <iframe> can make the browser reload it,
   * so an embedded provider track may restart at 0:00 after a navigation. The
   * <audio> element is unaffected. Parking the widget for good (and laying that
   * container out over the sidebar) would fix it at the cost of a hand-built
   * layout, so it is left as-is until a provider actually needs it.
   */
  function stash() {
    const target = container();
    if (!target) return;
    for (const node of [audio, embed]) {
      if (node && node.parentNode !== target) target.appendChild(node);
    }
  }

  // ---- provider embeds ----------------------------------------------------

  function ensureEmbed(url) {
    if (!embed) {
      embed = document.createElement("iframe");
      embed.title = "player";
      embed.allow = "autoplay";
      embed.setAttribute("scrolling", "no");
      embed.setAttribute("frameborder", "no");
    }
    if (embed.getAttribute("src") !== url) embed.setAttribute("src", url);
    return embed;
  }

  /** The widget is a separate document, so it has to be told what to do. */
  function embedCommand(method) {
    if (!embed?.contentWindow) return;
    try {
      embed.contentWindow.postMessage(JSON.stringify({ method }), "*");
    } catch {}
  }

  // ---- transport ----------------------------------------------------------

  function wakeOnGesture() {
    const wake = () => {
      audio.muted = false;
      audio.play().catch(() => {});
      state.waiting = false;
      emit();
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
  }

  /**
   * Browsers block audible autoplay until a user gesture. Try unmuted first;
   * if rejected, play muted and unmute on the first pointer/key press.
   */
  function autoplay() {
    audio
      .play()
      .then(() => {
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = true;
        wakeOnGesture();
        audio
          .play()
          .then(() => {
            state.waiting = true;
            emit();
          })
          .catch(() => {});
      });
  }

  /** Point the transport at a track and start it. */
  function load(track, { gesture = false } = {}) {
    if (state.mode === "stream") {
      if (audio.getAttribute("src") !== track.streamUrl) audio.setAttribute("src", track.streamUrl);
      audio.currentTime = 0;
      autoplay();
      return;
    }
    // Embed mode: the widget owns the audio, we only aim it at the track.
    ensureEmbed(track.embedUrl);
    state.playing = false;
    // A fresh widget needs a moment before it answers commands; the click that
    // selected the track is the gesture that lets it make noise.
    if (gesture) setTimeout(() => embedCommand("play"), WIDGET_LOAD_MS);
  }

  function select(index, { autoplay: shouldAutoplay = true, gesture = false } = {}) {
    const track = state.tracks[index];
    if (!track) return;

    // Silence and reset the outgoing track while `mode` still describes it: the
    // <audio> pause event is what clears the transport, and it is ignored in
    // the other modes.
    audio.pause();
    state.playing = false;
    state.waiting = false;
    state.time = 0;
    state.duration = 0;

    state.index = index;
    state.mode = trackMode(track);
    writeIndex(index);

    if (state.mode !== "link" && shouldAutoplay) load(track, { gesture });
    emit();
  }

  function toggle() {
    if (state.mode === "link") return;

    if (state.mode === "stream") {
      audio.muted = false;
      state.waiting = false;
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
      return;
    }

    // The widget reports nothing back, so the host is the source of truth here.
    state.playing = !state.playing;
    emit();
    embedCommand(state.playing ? "play" : "pause");
  }

  // ---- audio element events ----------------------------------------------
  // Only the custom transport reports through the <audio> element; in embed mode
  // the widget owns playback and the host drives it by hand, so these are inert.

  function onStream(event, handler) {
    audio.addEventListener(event, (e) => {
      if (state.mode !== "stream") return;
      handler(e);
      emit();
    });
  }

  onStream("play", () => {
    state.playing = true;
  });

  onStream("pause", () => {
    state.playing = false;
  });

  onStream("timeupdate", () => {
    state.time = audio.currentTime;
    state.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  });

  onStream("loadedmetadata", () => {
    state.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  });

  document.addEventListener("astro:before-swap", stash);

  return {
    /**
     * Adopt a page's playlist. Safe to call on every mount: the remembered
     * track wins, and nothing restarts while it is already playing.
     */
    load(tracks, providerId) {
      if (!tracks.length) return;

      // Compare against the playlist we already had, before overwriting it.
      const current = state.tracks[state.index] ?? null;
      const remembered = readIndex();
      state.tracks = tracks;
      state.providerId = providerId;

      // Same track in the same slot (a re-mount on the same build): leave
      // playback alone and just repaint the UI against current state.
      if (current && tracks[state.index] === current) {
        emit();
        return;
      }

      const index =
        remembered !== null && tracks[remembered]
          ? remembered
          : tracks.findIndex((t) => trackMode(t) !== "link");

      if (state.index === null || !tracks[state.index] || (remembered !== null && state.index !== remembered)) {
        // First mount, or the remembered track is gone from this build.
        select(index === -1 ? 0 : index);
      } else {
        // Same slot, different track (a new build): keep the position, and
        // don't interrupt what was already running.
        select(state.index, { autoplay: !audio.paused });
      }
    },

    getState: snapshot,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    select,
    toggle,
    /** Selecting from a click also unlocks the widget's autoplay policy. */
    play: (index) => select(index, { gesture: true }),

    setVolume(value) {
      const next = Math.min(1, Math.max(0, Number(value)));
      if (!Number.isFinite(next)) return;
      audio.volume = next;
      state.volume = next;
      writeVolume(next);
      emit();
    },

    /**
     * Show the provider's media inside `surface`. Called after every render
     * that changes the current track or its transport. The <audio> node is
     * reused as-is; the widget iframe is reused too, but aiming it at another
     * track reloads it — that is the provider's own player, and a reload is the
     * only way to change track on it.
     */
    mount(surface) {
      if (!surface) return;
      const track = snapshot().track;
      if (state.mode === "embed" && track) surface.appendChild(ensureEmbed(track.embedUrl));
      else if (state.mode === "stream") surface.appendChild(audio);
    },
  };
}

function host() {
  if (typeof window === "undefined") return null;
  window[KEY] ??= createHost();
  return window[KEY];
}

export function getAudioHost() {
  return host();
}