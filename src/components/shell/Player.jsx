import { useEffect, useState } from "react";
import { log } from "../../lib/syslog.js";
import { useI18n } from "./i18n.jsx";

// Static Spotify embeds only (no server, so no "now playing").
// The iframe loads on demand; the chosen track is remembered for the session.
const TRACK_KEY = "garkatron:track";

function embedUrl(kind, id) {
  return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`;
}

function Equalizer() {
  return (
    <span className="eq" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export default function Player({ playlist }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(TRACK_KEY);
    if (saved !== null && playlist.tracks[Number(saved)]?.spotifyId) setCurrent(Number(saved));
  }, [playlist.tracks]);

  const pick = (i) => {
    const track = playlist.tracks[i];
    log("open", `♪ ${track.title}`);
    if (!track.spotifyId) return; // external link handles it
    sessionStorage.setItem(TRACK_KEY, String(i));
    setCurrent(i);
  };

  const header = (
    <div className="ttl">
      <Equalizer />
      {t("player.header")}
    </div>
  );

  if (playlist.spotifyPlaylistId) {
    return (
      <div className="card spot">
        {header}
        <iframe
          title={playlist.title}
          src={embedUrl("playlist", playlist.spotifyPlaylistId)}
          height="352"
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      </div>
    );
  }

  const track = current !== null ? playlist.tracks[current] : null;

  return (
    <div className="card spot">
      {header}
      {track ? (
        <iframe
          key={track.spotifyId}
          title={`${track.title} — ${track.artist}`}
          src={embedUrl("track", track.spotifyId)}
          height="80"
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      ) : (
        <button type="button" className="cover" onClick={() => pick(0)} aria-label={t("player.play")}>
          ▶
        </button>
      )}
      <div className="song">{playlist.title}</div>
      <div className="artist">{t("player.tracks", { n: playlist.tracks.length })}</div>
      <ol className="tracklist">
        {playlist.tracks.map((tr, i) => (
          <li key={`${tr.title}-${i}`} className={i === current ? "on" : undefined}>
            {tr.spotifyId ? (
              <button type="button" onClick={() => pick(i)}>
                <span className="tr-title">{tr.title}</span>
                <span className="tr-artist">{tr.artist}</span>
              </button>
            ) : (
              <a href={tr.url} target="_blank" rel="noreferrer" onClick={() => pick(i)} title={t("player.external")}>
                <span className="tr-title">{tr.title} ↗</span>
                <span className="tr-artist">{tr.artist}</span>
              </a>
            )}
          </li>
        ))}
      </ol>
      <div className="note">{t("player.note")}</div>
    </div>
  );
}
