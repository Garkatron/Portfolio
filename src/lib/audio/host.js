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
const DEFAULT_VOLUME = 0.15; // low, per request
const STAGE_ID = "garkatron-audio-stage";
const AUTOPLAY_GRACE_MS = 1200; // how long we wait before saying autoplay was blocked
const PROGRESS_GRACE_MS = 3500; // PLAY without sound after this means there is no stream

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

  let embed = null; // provider iframe, hidden and driven from here
  let widget = null; // SC.Widget controller for it
  let widgetApiPromise = null;
  let autoplayTimer = null;
  let wakeHandler = null;
  let progressTimer = null;
  // Track indices the provider accepts but cannot actually stream. Some public
  // SoundCloud tracks resolve fine yet 404 on the media endpoint; the widget
  // still fires PLAY, so without this the UI would claim to play silence.
  const dead = new Set();

  const state = {
    tracks: [],
    order: [], // shuffled track indices; display + advance order
    provider: null,
    index: null,
    mode: "link",
    playing: false,
    waiting: false, // autoplay was blocked; waiting for a user gesture
    volume: audio.volume,
    time: 0,
    duration: 0,
  };

  const listeners = new Set();

  const snapshot = () => ({
    index: state.index,
    order: [...state.order],
    track: state.index === null ? null : (state.tracks[state.index] ?? null),
    mode: state.mode,
    controlled: state.mode === "embed" && !!state.provider?.apiUrl,
    dead: [...dead], // a plain array: this state is also read over the devtools bridge
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

  /**
   * The box the media nodes live in.
   *
   * It hangs off <html>, *outside* <body>: Astro's ClientRouter swaps the whole
   * <body> on navigation, but a node that is a sibling of it is never detached.
   * That matters because detaching an <iframe> discards its browsing context and
   * reloads it — which restarts the provider's track. Keeping the nodes here for
   * good is what makes playback survive a page change.
   *
   * Fixed and off-screen, so it never takes part in layout (no scrollbars).
   */
  function stage() {
    let el = document.getElementById(STAGE_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = STAGE_ID;
      el.setAttribute("aria-hidden", "true");
      document.documentElement.appendChild(el);
    }
    return el;
  }

  /**
   * Park the media nodes back in the stage before a swap. In the normal
   * (API-controlled) case they are already there, so this is a no-op; it only
   * matters for the fallback provider whose iframe had to be shown in the card.
   */
  function stash() {
    const target = stage();
    for (const node of [audio, embed]) {
      if (node && node.parentNode !== target) target.appendChild(node);
    }
  }

  // ---- provider embed -----------------------------------------------------

  /**
   * SoundCloud ships a parent-side API (SC.Widget) that reports playback and
   * accepts commands. With it the iframe can stay invisible while the site draws
   * its own transport, instead of showing SoundCloud's player inside our card.
   */
  function loadWidgetApi(apiUrl) {
    widgetApiPromise ??= new Promise((resolve, reject) => {
      if (window.SC?.Widget) return resolve(window.SC.Widget);
      const script = document.createElement("script");
      script.src = apiUrl;
      script.async = true;
      script.onload = () =>
        window.SC?.Widget
          ? resolve(window.SC.Widget)
          : reject(new Error("widget API loaded without SC.Widget"));
      script.onerror = () => reject(new Error("widget API failed to load"));
      document.head.appendChild(script);
    });
    return widgetApiPromise.catch((err) => {
      widgetApiPromise = null; // let a later attempt retry
      throw err;
    });
  }

  /** Mirror the widget's audio events onto the host state. */
  function bindWidget(Events) {
    widget.bind(Events.READY, () => {
      state.waiting = false;
      widget?.play(); // auto_play may have been blocked before any interaction
      emit();
    });

    widget.bind(Events.PLAY, () => {
      state.playing = true;
      state.waiting = false;
      clearTimeout(autoplayTimer);
      clearWake();
      emit();
      armProgressWatchdog();
    });

    widget.bind(Events.PAUSE, () => {
      state.playing = false;
      emit();
    });

    widget.bind(Events.PLAY_PROGRESS, (e) => {
      clearTimeout(progressTimer);
      dead.delete(state.index); // it streams after all
      state.time = (e?.currentPosition ?? 0) / 1000;
      // relativePosition lets us derive the length without a round trip.
      if (e?.relativePosition > 0) state.duration = state.time / e.relativePosition;
      emit();
    });

    widget.bind(Events.SEEK, (e) => {
      state.time = (e?.currentPosition ?? 0) / 1000;
      emit();
    });

    widget.bind(Events.FINISH, () => {
      state.playing = false;
      emit();
      // The old transport looped; keep the music coming.
      if (state.tracks.length > 1) advance({ gesture: true });
    });

    widget.bind(Events.ERROR, () => {
      console.warn("[audio] provider reported a playback error");
      // A mid-play transient error shouldn't kill a track that's already
      // streaming; only fail over when nothing has played yet.
      if (state.time > 0) return;
      onTrackDead();
    });
  }

  /** Mark the current track as unstreamable and move on to the next playable. */
  function onTrackDead() {
    if (state.index === null || dead.has(state.index)) return;
    dead.add(state.index);
    state.playing = false;
    emit();
    advance();
  }

  /** Advance to the next non-dead track in shuffle order. */
  function advance({ gesture = true } = {}) {
    const n = state.tracks.length;
    if (!n) return;
    const pos = state.order.indexOf(state.index);
    for (let step = 1; step <= n; step++) {
      const i = state.order[(pos + step) % n];
      if (!dead.has(i)) {
        select(i, { gesture });
        return;
      }
    }
  }

  /**
   * Point the widget at a track.
   *
   * Two different URLs are in play, and mixing them up is the bug that cost us
   * an afternoon: the iframe's `src` is a full *widget* URL, while
   * `SC.Widget.load()` wants the *resource* URL (soundcloud.com/a/b). Passing a
   * widget URL to load() nests it as url=<widget url> and the resolve fails.
   *
   * @param {string} resourceUrl SoundCloud resource URL, e.g. soundcloud.com/a/b
   * @param {string} [widgetSrc] full widget URL, for the iframe's first src
   */
  function ensureWidget(resourceUrl, widgetSrc) {
    const { apiUrl, widgetOptions } = state.provider ?? {};
    if (!apiUrl || !resourceUrl) return; // no controller, so the iframe stays visible

    if (widget) {
      widget.load(resourceUrl, widgetOptions);
      return;
    }

    if (!embed) {
      embed = document.createElement("iframe");
      embed.id = "garkatron-provider";
      embed.title = "audio";
      embed.allow = "autoplay";
      embed.width = "100%";
      embed.height = "166"; // any real box: a 0-sized iframe is not a reliable host
      embed.setAttribute("scrolling", "no");
      embed.setAttribute("frameborder", "no");
      // In the document before SC.Widget is built: it reads contentWindow.
      stage().appendChild(embed);
    }

    // SC.Widget parses iframe.src while constructing, so it has to be there first.
    embed.src = widgetSrc ?? resourceUrl;

    loadWidgetApi(apiUrl)
      .then((Widget) => {
        widget = new Widget(embed);
        bindWidget(Widget.Events);
        syncWidgetVolume();
        // The iframe can finish its first load before the controller has bound
        // its listeners, so that initial READY is missed and the track never
        // starts. Loading explicitly, now that the listeners exist, makes the
        // auto-selected first track behave like one the visitor picks.
        widget.load(resourceUrl, widgetOptions);
      })
      .catch((err) => console.warn("[audio]", err.message));
  }

  function syncWidgetVolume() {
    // The widget takes 0-100; the host keeps 0-1, like the <audio> element.
    widget?.setVolume(Math.round(state.volume * 100));
  }

  /**
   * The widget fires PLAY optimistically, and for a track it cannot actually
   * stream it then fires PAUSE again a moment later. If no PLAY_PROGRESS ever
   * follows, there is no stream behind it (a removed or rights-restricted
   * track), so give up and let the UI show the track as unavailable instead of
   * a play button that does nothing.
   *
   * Progress — not the PAUSE — is the signal: a track the visitor pauses has
   * already advanced the playhead, so `time > 0` clears it.
   */
  function armProgressWatchdog() {
    clearTimeout(progressTimer);
    progressTimer = setTimeout(() => {
      if (state.time > 0) return; // it streamed after all
      widget?.pause();
      onTrackDead();
    }, PROGRESS_GRACE_MS);
  }

  /** No sound within the grace window means the browser blocked autoplay. */
  function armAutoplayTimer() {
    clearTimeout(autoplayTimer);
    autoplayTimer = setTimeout(() => {
      if (state.playing) return;
      state.waiting = true;
      emit();
    }, AUTOPLAY_GRACE_MS);
  }

  // ---- transport ----------------------------------------------------------

  function clearWake() {
    if (!wakeHandler) return;
    window.removeEventListener("pointerdown", wakeHandler);
    window.removeEventListener("keydown", wakeHandler);
    wakeHandler = null;
  }

  /**
   * One-shot: the first input after a blocked autoplay starts the sound. Bound
   * at most once for the life of the page — islands re-mount on every
   * navigation, and re-binding would stack listeners.
   */
  function wakeOnGesture() {
    if (wakeHandler) return;
    wakeHandler = () => {
      if (state.waiting) {
        if (state.mode === "embed") widget?.play();
        else {
          audio.muted = false;
          audio.play().catch(() => {});
        }
      }
      state.waiting = false;
      clearWake();
      emit();
    };
    window.addEventListener("pointerdown", wakeHandler);
    window.addEventListener("keydown", wakeHandler);
  }

  /**
   * Browsers block audible autoplay until a user gesture. Try unmuted first; if
   * rejected, fall back to a muted start and unmute on the first input.
   */
  function autoplayStream() {
    audio
      .play()
      .then(() => {
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = true;
        armAutoplayTimer();
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
  function loadTrack(track, { gesture = false } = {}) {
    if (state.mode === "stream") {
      if (audio.getAttribute("src") !== track.streamUrl) audio.setAttribute("src", track.streamUrl);
      audio.currentTime = 0;
      autoplayStream();
      return;
    }
    // Embed mode: the widget owns the audio, we only aim it at the track.
    ensureWidget(track.pageUrl, track.embedUrl);
    state.playing = false;
    state.time = 0;
    state.duration = 0;
    armAutoplayTimer();
    if (gesture) widget?.play();
  }

  function select(index, { autoplay: shouldAutoplay = true, gesture = false } = {}) {
    const track = state.tracks[index];
    if (!track) return;
    if (gesture) clearWake();

    // Silence and reset the outgoing track while `mode` still describes it: the
    // pause event is what clears the <audio> transport, and it is ignored in
    // the other modes.
    audio.pause();
    clearTimeout(autoplayTimer);
    clearTimeout(progressTimer);
    state.playing = false;
    state.waiting = false;
    state.time = 0;
    state.duration = 0;

    state.index = index;
    state.mode = trackMode(track);
    writeIndex(index);

    if (state.mode !== "link" && shouldAutoplay) loadTrack(track, { gesture });
    emit();
  }

  function toggle() {
    if (state.mode === "link") return;
    clearWake();
    if (state.mode === "embed" && dead.has(state.index)) return;

    if (state.mode === "stream") {
      audio.muted = false;
      state.waiting = false;
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
      return;
    }

    // The widget reports real PLAY/PAUSE, so only nudge it here.
    widget?.toggle();
  }

  function seek(fraction) {
    const ratio = Math.min(1, Math.max(0, Number(fraction)));
    if (!Number.isFinite(ratio) || state.mode === "link") return;
    if (state.mode === "stream") {
      if (!Number.isFinite(audio.duration)) return;
      audio.currentTime = ratio * audio.duration;
      return;
    }
    if (!state.duration) return;
    widget?.seekTo(ratio * state.duration * 1000);
    state.time = ratio * state.duration;
    emit();
  }

  // ---- audio element events ----------------------------------------------
  // Only the custom transport reports through the <audio> element; in embed mode
  // the widget owns playback and reports through bindWidget instead.

  function onStream(event, handler) {
    audio.addEventListener(event, (e) => {
      if (state.mode !== "stream") return;
      handler(e);
      emit();
    });
  }

  onStream("play", () => {
    state.playing = true;
    clearWake();
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

  // A stream that fails to load (404 / rights) can't play: skip to the next.
  audio.addEventListener("error", () => {
    if (state.mode !== "stream" || !state.tracks.length) return;
    onTrackDead();
  });

  document.addEventListener("astro:before-swap", stash);

  return {
    /**
     * Adopt a page's playlist. Safe to call on every mount.
     *
     * The host outlives the islands. If it already owns a track, this call is a
     * re-mount after a navigation: the media nodes never moved, so playback is
     * still running and we only repaint the new island against current state.
     * Otherwise it is a first mount (or a full reload, which recreates the
     * host), and we adopt the remembered track.
     */
    load(tracks, provider) {
      if (!tracks.length) return;

      const resumed = state.index !== null;
      const remembered = readIndex();
      state.tracks = tracks;
      state.provider = provider;

      if (resumed) {
        emit();
        return;
      }

      // Shuffle order once for the session; the host survives navigations, so
      // the order (and the playing track) stay put between pages.
      state.order = tracks.map((_, i) => i).sort(() => Math.random() - 0.5);

      const index =
        remembered !== null && tracks[remembered]
          ? remembered
          : state.order.find((i) => trackMode(tracks[i]) !== "link");

      select(index ?? state.order[0] ?? 0);
      wakeOnGesture();
    },

    getState: snapshot,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    select,
    toggle,
    seek,
    /** Selecting from a click also unlocks the browser's autoplay policy. */
    play: (index) => select(index, { gesture: true }),

    setVolume(value) {
      const next = Math.min(1, Math.max(0, Number(value)));
      if (!Number.isFinite(next)) return; // NaN fails here, before audio.volume throws
      audio.volume = next;
      state.volume = next;
      writeVolume(next);
      syncWidgetVolume();
      emit();
    },

    /**
     * Attach the media nodes for the current transport.
     *
     * With a parent-side API the provider's iframe is an invisible audio source,
     * so it stays parked in the stage and is never re-parented (that would
     * reload it). The `<audio>` element is detached-but-live the same way. Only
     * a provider without an API — whose own UI is the sole transport — is shown
     * inside `surface`.
     */
    mount(surface) {
      if (!surface) return;
      const track = snapshot().track;
      if (state.mode === "embed" && track) {
        const target = state.provider?.apiUrl ? stage() : surface;
        if (embed && embed.parentNode !== target) target.appendChild(embed);
      } else if (state.mode === "stream") {
        const target = stage();
        if (audio.parentNode !== target) target.appendChild(audio);
      }
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