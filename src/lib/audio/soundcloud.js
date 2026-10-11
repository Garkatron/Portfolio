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
const ACCENT = "#ff5500";

/** The widget is the only supported way to play a SoundCloud track in a page. */
function widgetUrl(trackUrl) {
  const params = new URLSearchParams({
    url: trackUrl,
    color: ACCENT, // URLSearchParams escapes the "#" for us
    auto_play: "false",
    hide_related: "true",
    show_comments: "false",
    show_user: "true",
    show_reposts: "false",
    visual: "false",
  });
  return `${WIDGET}?${params}`;
}

/** Accepts a full permalink or a bare "artist/track" path. */
function normalizeUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  return /^https?:\/\//.test(trimmed) ? trimmed : `${BASE}/${trimmed.replace(/^\/+/, "")}`;
}

export const soundcloudProvider = {
  id: "soundcloud",
  label: "SOUNDCLOUD",
  accent: ACCENT,
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