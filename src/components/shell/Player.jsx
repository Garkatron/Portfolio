import { useAudioHost } from "../../lib/audio/useAudioHost.js";
import { log } from "../../lib/syslog.js";
import { useI18n } from "./i18n.jsx";

// Provider-agnostic player. It renders whatever src/lib/audio/index.js
// resolved: a custom transport for tracks with a direct stream (Spotify's 30s
// previews), the provider's own widget for tracks with an embed (SoundCloud),
// and a plain link for anything else.
//
// Playback itself lives in src/lib/audio/host.js, which outlives this island so
// the music keeps playing while the reader navigates.
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
  const { track, mode, playing, waiting, volume, time, duration, index } = state;
  const { provider } = playlist;
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
  const isStream = mode === "stream";
  const isEmbed = mode === "embed";

  return (
    <div {...cardProps}>
      {header}

      <button
        type="button"
        className={`cover${playing ? " on" : ""}`}
        onClick={() => host?.toggle()}
        disabled={mode === "link"}
        aria-label={playing ? t("player.pause") : t("player.play")}
      >
        {waiting ? (
          <span className="cover-wait">●</span>
        ) : (
          <span>{playing ? "❚❚" : "▶"}</span>
        )}
      </button>

      {/* Mount point for the provider's own media nodes (see src/lib/audio/host.js). */}
      <div className="apx-surface" ref={surfaceRef} hidden={!isStream && !isEmbed} />

      <div className="now">
        <div className="song">{track ? track.title : "—"}</div>
        <div className="artist">
          {track ? track.artist : t("player.tracks", { n: playlist.tracks.length })}
        </div>
      </div>

      {isStream && (
        <div className="bar">
          <i style={{ width: `${progress}%` }} />
          <span className="bar-time">
            {fmt(time)} / {fmt(duration)}
          </span>
        </div>
      )}

      <div className="controls">
        {isStream ? (
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
          <span className="vol-label">{isEmbed ? t("player.fullLength") : ""}</span>
        )}
        {track && (
          <a className="full" href={track.pageUrl ?? track.searchUrl} target="_blank" rel="noreferrer">
            {mode === "link" ? t("player.search") : t("player.full")}
          </a>
        )}
      </div>

      {waiting && <div className="mute-note">{t("player.enable")}</div>}

      <ol className="tracklist">
        {playlist.tracks.map((tr, i) =>
          tr.streamUrl || tr.embedUrl ? (
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

      <div className="note">{t(`player.note.${provider.id}`)}</div>
    </div>
  );
}
