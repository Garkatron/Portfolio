// Audio provider registry.
//
// The player never talks to a streaming service directly: it renders whatever
// shape this module produces. Adding a provider means adding a file here and
// one entry in `providers` — the player, the shell and the sidebar are
// provider-agnostic.
//
// Two providers ship:
//   spotify    — streams the 30s public preview of each track (src/lib/spotify.js)
//   soundcloud — embeds SoundCloud's widget and plays full tracks
//
// The active one is chosen in src/data/site.json (`audioProvider`).
import { localize } from "../../i18n/index.js";
import { soundcloudProvider } from "./soundcloud.js";
import { spotifyProvider } from "./spotify.js";

export const providers = {
  spotify: spotifyProvider,
  soundcloud: soundcloudProvider,
};

/** Used when site.json names a provider that does not exist. */
const FALLBACK_PROVIDER = "soundcloud";

export function getProvider(id) {
  return providers[id] ?? providers[FALLBACK_PROVIDER];
}

/**
 * Turn raw playlist data into the provider-agnostic shape the player consumes.
 * Runs at build time, so providers may hit the network (Spotify previews) and
 * the result is baked into the page as a serializable prop.
 *
 * @param {object} playlistData  src/data/playlist.json
 * @param {string} lang
 * @param {string} providerId
 * @returns {Promise<{provider: {id: string, label: string, accent: string}, title: string,
 *   source: string|null, playlistEmbedUrl: string|null,
 *   tracks: Array<{title: string, artist: string, streamUrl: string|null,
 *     embedUrl: string|null, pageUrl: string|null, searchUrl: string}>}>}
 */
export async function resolvePlaylist(playlistData, lang, providerId) {
  const provider = getProvider(providerId);
  const playlist = localize(playlistData, lang);

  const tracks = await Promise.all(
    playlist.tracks.map(async (track) => ({
      title: track.title,
      artist: track.artist,
      ...(await provider.resolveTrack(track)),
    })),
  );

  // `<providerId>PlaylistId` embeds a whole playlist instead of listing tracks.
  const playlistId = playlist[`${provider.id}PlaylistId`];

  return {
    // `apiUrl`/`widgetOptions` let a provider expose a parent-side controller,
    // so the host can hide the iframe and draw the transport itself.
    provider: {
      id: provider.id,
      label: provider.label,
      accent: provider.accent,
      apiUrl: provider.apiUrl ?? null,
      widgetOptions: provider.widgetOptions?.() ?? null,
    },
    title: playlist.title,
    source: playlist.source ?? null,
    playlistEmbedUrl:
      playlistId && provider.playlistEmbedUrl ? provider.playlistEmbedUrl(playlistId) : null,
    tracks,
  };
}