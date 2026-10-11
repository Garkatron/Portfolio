import { useMemo, useEffect, useState } from "react";
import { useAudioHost } from "../../lib/audio/useAudioHost.js";
import { log } from "../../lib/syslog.js";
import { useI18n } from "./i18n.jsx";

// Provider-agnostic player. It renders whatever src/lib/audio/index.js
// resolved: the host's transport for tracks with a direct stream (Spotify's 30s
// previews) or a provider embed (SoundCloud), and a plain link for anything else.
//
// Both playable modes share one UI. For an embed the provider iframe is hidden
// and driven over its own API, so the card looks the same either way — no
// third-party player is ever visible.
//
// Playback lives in src/lib/audio/host.js, which outlives this island so the
// music keeps playing while the reader navigates.
function Equalizer({ on }) {
  return (
    <span className={`eq${on ? " on" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function fmt(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Player({ playlist }) {
  const { t } = useI18n();
  const { host, state, surfaceRef } = useAudioHost(playlist);
  const { track, mode, playing, waiting, volume, time, duration, index, controlled, dead } = state;
  const { provider } = playlist;
  const [query, setQuery] = useState("");

  // Shuffle track order once per page load (stable across re-renders).
  const [shuffled] = useState(() => {
    const indices = playlist.tracks.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  });

  // Play first shuffled track only on first mount (not on SPA navigation).
  useEffect(() => {
    try { sessionStorage.removeItem("garkatron:track"); } catch {}
    host?.load(playlist.tracks, playlist.provider);
    const first = playlist.tracks[shuffled[0]];
    if (first && (first.streamUrl || first.embedUrl)) {
      host?.play(shuffled[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The provider's brand colour drives the whole card (equaliser, progress, cover).
  const cardProps = { className: "card apx", style: { "--apx": provider.accent } };

  const header = (
    <div className="ttl">
      <Equalizer on={playing} />
      {t("player.header", { provider: provider.label })}
    </div>
  );

  // A playlist-level embed replaces the track list entirely.
  if (playlist.playlistEmbedUrl) {
    return (
      <div {...cardProps}>
        {header}
        <iframe
          title={playlist.title}
          src={playlist.playlistEmbedUrl}
          height="352"
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      </div>
    );
  }

  const pick = (i) => {
    const next = playlist.tracks[i];
    log("open", `♪ ${next.title}`);
    host?.play(i);
  };

  const progress = duration ? (time / duration) * 100 : 0;
  const playable = mode !== "link";

  const seekAt = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0) host?.seek((e.clientX - rect.left) / rect.width);
  };

  return (
    <div {...cardProps}>
      {header}

      <button
        type="button"
        className={`cover${playing ? " on" : ""}`}
        onClick={() => host?.toggle()}
        disabled={!playable || dead.includes(index)}
        aria-label={playing ? t("player.pause") : t("player.play")}
      >
        {waiting ? (
          <span className="cover-wait">●</span>
        ) : (
          <span>{playing ? "❚❚" : "▶"}</span>
        )}
      </button>

      {/* Host-owned media. `controlled` means the provider exposes a parent-side
          API, so the iframe can be hidden and our transport drives it. */}
      <div
        className={`apx-surface${controlled ? "" : " apx-visible"}`}
        ref={surfaceRef}
        aria-hidden="true"
      />

      <div className="now">
        <div className="song">{track ? track.title : "—"}</div>
        <div className="artist">
          {track ? track.artist : t("player.tracks", { n: playlist.tracks.length })}
        </div>
      </div>

      {playable && (
        <div
          className="bar"
          role="slider"
          tabIndex={duration ? 0 : -1}
          aria-label={t("player.seek")}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          onClick={seekAt}
        >
          <i style={{ width: `${progress}%` }} />
          <span className="bar-time">
            {fmt(time)} / {fmt(duration)}
          </span>
        </div>
      )}

      <div className="controls">
        {playable ? (
          <>
            <span className="vol-label">{t("player.volume")}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              aria-label={t("player.volume")}
              onChange={(e) => host?.setVolume(e.target.value)}
            />
          </>
        ) : (
          <span className="vol-label" />
        )}
        {track && (
          <a className="full" href={track.pageUrl ?? track.searchUrl} target="_blank" rel="noreferrer">
            {mode === "link" ? t("player.search") : t("player.full")}
          </a>
        )}
      </div>

      {waiting && <div className="mute-note">{t("player.enable")}</div>}
      {track && dead.includes(index) && <div className="mute-note">{t("player.unavailable")}</div>}

      <input
        type="search"
        className="track-search"
        placeholder={t("player.searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t("player.searchPlaceholder")}
      />

      <ol className="tracklist">
        {shuffled
          .map((i) => ({ tr: playlist.tracks[i], i }))
          .filter(({ tr }) =>
            query.trim() === "" ||
            `${tr.title} ${tr.artist}`.toLowerCase().includes(query.trim().toLowerCase())
          )
          .map(({ tr, i }) =>
            (tr.streamUrl || tr.embedUrl) && !dead.includes(i) ? (
              <li key={`${tr.title}-${i}`} className={i === index ? "on" : undefined}>
                <button type="button" onClick={() => pick(i)}>
                  <span className="tr-title">
                    {i === index && playing ? "❚❚ " : "▶ "}
                    {tr.title}
                  </span>
                  <span className="tr-artist">{tr.artist}</span>
                </button>
              </li>
            ) : (
              <li key={`${tr.title}-${i}`}>
                <a href={tr.pageUrl ?? tr.searchUrl} target="_blank" rel="noreferrer" title={t("player.search")}>
                  <span className="tr-title">
                    {tr.title} ↗
                  </span>
                  <span className="tr-artist">{tr.artist}</span>
                </a>
              </li>
            ),
          )}
      </ol>

    </div>
  );
}