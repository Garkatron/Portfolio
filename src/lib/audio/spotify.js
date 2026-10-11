// Spotify audio provider.
//
// Playlist entries carry a `spotifyId`. At build time each id is resolved to
// the public 30s MP3 preview (see ../spotify.js), which is what the custom
// player streams — no Web Playback SDK, no client id, no user login.
import { fetchPreviewUrl } from "../spotify.js";
import { encodeQuery } from "./util.js";

const BASE = "https://open.spotify.com";

export const spotifyProvider = {
  id: "spotify",
  label: "SPOTIFY",
  accent: "#1db954",
  /** A playlist id in the data file embeds as a Spotify iframe instead of a track list. */
  playlistEmbedUrl: (id) => `${BASE}/embed/playlist/${id}?utm_source=generator&theme=0`,

  async resolveTrack(track) {
    return {
      streamUrl: await fetchPreviewUrl(track.spotifyId),
      embedUrl: track.spotifyId ? `${BASE}/embed/track/${track.spotifyId}` : null,
      pageUrl: track.spotifyId ? `${BASE}/track/${track.spotifyId}` : null,
      searchUrl: `${BASE}/search/${encodeQuery(track)}`,
    };
  },
};