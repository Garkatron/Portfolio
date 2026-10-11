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
const PERSIST_ID = "garkatron-audio"; // must match `transition:persist` in Base.astro
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
   * so an embedded track may restart after a navigation. The <audio> element is
   * unaffected. Parking the iframe for good (and laying that container out over
   * the sidebar) would fix it at the cost of a hand-built layout, so it is left
   * as-is until it actually bites.
   */
  function stash() {
    const target = container();
    if (!target) return;
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
      if (state.tracks.length > 1) select((state.index + 1) % state.tracks.length, { gesture: true });
    });

    widget.bind(Events.ERROR, () => console.warn("[audio] provider reported a playback error"));
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
      (container() ?? document.body).appendChild(embed);
    }

    // SC.Widget parses iframe.src while constructing, so it has to be there first.
    embed.src = widgetSrc ?? resourceUrl;

    loadWidgetApi(apiUrl)
      .then((Widget) => {
        widget = new Widget(embed);
        bindWidget(Widget.Events);
        syncWidgetVolume();
      })
      .catch((err) => console.warn("[audio]", err.message));
  }

  function syncWidgetVolume() {
    // The widget takes 0-100; the host keeps 0-1, like the <audio> element.
    widget?.setVolume(Math.round(state.volume * 100));
  }

  /**
   * The widget fires PLAY optimistically. If no PLAY_PROGRESS follows, there is
   * no stream behind it (a removed or rights-restricted track), so give up and
   * let the UI show the track as unavailable instead of a frozen play button.
   */
  function armProgressWatchdog() {
    clearTimeout(progressTimer);
    progressTimer = setTimeout(() => {
      if (!state.playing || state.time > 0) return;
      widget?.pause();
      dead.add(state.index);
      state.playing = false;
      emit();
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

  document.addEventListener("astro:before-swap", stash);

  return {
    /**
     * Adopt a page's playlist. Safe to call on every mount: the remembered
     * track wins, and nothing restarts while it is already playing.
     */
    load(tracks, provider) {
      if (!tracks.length) return;

      // Compare against the playlist we already had, before overwriting it.
      const current = state.tracks[state.index] ?? null;
      const remembered = readIndex();
      state.tracks = tracks;
      state.provider = provider;

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
        wakeOnGesture();
      } else {
        // Same slot, different track (a new build): keep the position, and
        // don't interrupt what was already running.
        select(state.index, { autoplay: !audio.paused && !widget });
      }
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
     * Show the provider's media inside `surface`. Called after every render that
     * changes the current track or its transport. The <audio> node is reused
     * as-is; the iframe is reused too, but aiming it at another track reloads
     * it — that is the provider's own player, and a reload is the only way to
     * change track on it.
     */
    mount(surface) {
      if (!surface) return;
      const track = snapshot().track;
      if (state.mode === "embed" && track) surface.appendChild(embed ?? document.getElementById("garkatron-provider"));
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