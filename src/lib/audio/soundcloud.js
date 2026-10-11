// SoundCloud audio provider.
//
// SoundCloud exposes no public, unauthenticated stream URL, so a playlist entry
// is only playable in-page when it carries a `soundcloudUrl`
// (e.g. "https://soundcloud.com/artist/some-track"). Given one, the provider
// uses SoundCloud's official widget, which plays the *full* track — unlike the
// 30s clips the Spotify provider is limited to.
//
// Entries without a `soundcloudUrl` fall back to a search URL, which always
// resolves to the right song without us guessing at ids.
import { encodeQuery } from "./util.js";

const BASE = "https://soundcloud.com";
const WIDGET = "https://w.soundcloud.com/player/";
/** Parent-side controller for the widget (SC.Widget); loaded on demand. */
export const WIDGET_API = "https://w.soundcloud.com/player/api.js";
const ACCENT = "#ff5500";

/**
 * Widget options. The iframe is hidden and driven over the Widget API
 * (src/lib/audio/host.js), so this only has to start the track and keep
 * SoundCloud's own chrome out of the way.
 */
export function widgetOptions() {
  return {
    auto_play: "true", // audible playback waits on the first gesture (see host.js)
    color: ACCENT.replace("#", ""),
    buying: "false",
    sharing: "false",
    download: "false",
    show_artwork: "false",
    show_playcount: "false",
    show_user: "false",
    show_reposts: "false",
    hide_related: "true",
    visual: "false",
  };
}

/** The widget is the only supported way to play a SoundCloud track in a page. */
function widgetUrl(trackUrl) {
  return `${WIDGET}?${new URLSearchParams({ url: trackUrl, ...widgetOptions() })}`;
}

/**
 * Accepts a full permalink, a "share" link with tracking params, or a bare
 * "artist/track" path. Returns a clean permalink, which is what the widget
 * wants — share URLs carry utm params that it does not need.
 */
function normalizeUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//.test(trimmed)) return `${BASE}/${trimmed.replace(/^\/+/, "")}`;

  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return trimmed;
  }
}

export const soundcloudProvider = {
  id: "soundcloud",
  label: "SOUNDCLOUD",
  accent: ACCENT,
  /** Parent-side controller, so the iframe itself can stay hidden. */
  apiUrl: WIDGET_API,
  widgetOptions,
  playlistEmbedUrl: (id) => widgetUrl(`${BASE}/${String(id).replace(/^\/+/, "")}`),

  resolveTrack(track) {
    const pageUrl = normalizeUrl(track.soundcloudUrl);
    return {
      streamUrl: null, // no public stream endpoint
      embedUrl: pageUrl ? widgetUrl(pageUrl) : null,
      pageUrl,
      searchUrl: `${BASE}/search?q=${encodeQuery(track)}`,
    };
  },
};