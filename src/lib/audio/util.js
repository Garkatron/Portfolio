// Shared helpers for the audio providers. Both providers need to turn a
// playlist entry into a search query, and both fall back to search when they
// cannot resolve a playable stream.

/** "Artist — Title" as providers spell it. */
export function trackQuery(track) {
  return [track.artist, track.title].filter(Boolean).join(" ");
}

/** Percent-encode a query for a path segment or a `?q=` parameter. */
export function encodeQuery(track) {
  return encodeURIComponent(trackQuery(track));
}

/**
 * How a track can be played, best option first: a direct stream is handled by
 * the custom transport, a provider embed by the provider's own widget, and a
 * track with neither is only a link.
 *
 * Lives here rather than in ./index.js because client islands import it, and
 * the registry pulls in every i18n dictionary.
 */
export function trackMode(track) {
  if (track?.streamUrl) return "stream";
  if (track?.embedUrl) return "embed";
  return "link";
}