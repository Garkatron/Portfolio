// Server-side (build time): pull each track's 30s MP3 preview URL out of its
// public Spotify embed page. No auth needed. If extraction fails, the player
// falls back to linking out to Spotify for that track.

const cache = new Map();

export async function fetchPreviewUrl(spotifyId) {
  if (!spotifyId) return null;
  if (cache.has(spotifyId)) return cache.get(spotifyId);
  let previewUrl = null;
  try {
    const res = await fetch(`https://open.spotify.com/embed/track/${spotifyId}`, {
      headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const html = await res.text();
      previewUrl = html.match(/https:\/\/p\.scdn\.co\/mp3-preview\/[\w]+/)?.[0] ?? null;
    }
  } catch {}
  if (!previewUrl) console.warn(`[spotify] no preview found for track ${spotifyId}`);
  cache.set(spotifyId, previewUrl);
  return previewUrl;
}
