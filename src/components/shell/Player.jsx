import { useEffect, useRef, useState } from "react";
import { log } from "../../lib/syslog.js";
import { useI18n } from "./i18n.jsx";

// Custom HTML5 audio player (no Spotify iframe). Tracks use their 30s MP3
// preview URL (extracted at build time in src/lib/spotify.js).
const TRACK_KEY = "garkatron:track";
const VOLUME_KEY = "garkatron:volume";
const DEFAULT_VOLUME = 0.3; // low, per request

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
  const audioRef = useRef(null);
  const [current, setCurrent] = useState(null); // track index
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false); // muted autoplay, awaiting first gesture
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playable = playlist.tracks.filter((tr) => tr.previewUrl);
  const track = current !== null ? playlist.tracks[current] : null;

  // Boot: pick the remembered track (or the first playable), set volume, try to start.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = Number(localStorage.getItem(VOLUME_KEY)) || DEFAULT_VOLUME;
    setVolume(audio.volume);

    const firstPlayable = playlist.tracks.findIndex((tr) => tr.previewUrl);
    let i = Number(sessionStorage.getItem(TRACK_KEY));
    if (!Number.isInteger(i) || !playlist.tracks[i]?.previewUrl) i = firstPlayable;
    if (i >= 0) {
      setCurrent(i);
      audio.src = playlist.tracks[i].previewUrl;
    }

    // Browsers block audible autoplay until a user gesture. Try unmuted first;
    // if rejected, play muted and unmute on the first pointer/key press.
    audio
      .play()
      .then(() => {
        audio.muted = false;
      })
      .catch(() => {
        const wake = () => {
          audio.muted = false;
          audio.play().catch(() => {});
          setWaiting(false);
          window.removeEventListener("pointerdown", wake);
          window.removeEventListener("keydown", wake);
        };
        audio.muted = true;
        audio.play().then(() => setWaiting(true)).catch(() => {});
        window.addEventListener("pointerdown", wake);
        window.addEventListener("keydown", wake);
      });

    return () => {
      audio.pause();
      audio.removeAttribute("src");
    };
  }, [playlist.tracks]);

  const pick = (i) => {
    const tr = playlist.tracks[i];
    log("open", `♪ ${tr.title}`);
    sessionStorage.setItem(TRACK_KEY, String(i));
    const audio = audioRef.current;
    if (!audio || !tr.previewUrl) return; // external link handles it
    audio.muted = false;
    audio.src = tr.previewUrl;
    audio.volume = Number(localStorage.getItem(VOLUME_KEY)) || DEFAULT_VOLUME;
    audio.play().catch(() => {});
    setCurrent(i); // even without preview
    setWaiting(false);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !track?.previewUrl) return;
    audio.muted = false;
    setWaiting(false);
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const changeVolume = (v) => {
    const value = Number(v);
    setVolume(value);
    localStorage.setItem(VOLUME_KEY, String(value));
    if (audioRef.current) audioRef.current.volume = value;
  };

  const header = (
    <div className="ttl">
      <Equalizer on={playing} />
      {t("player.header")}
    </div>
  );

  if (playlist.spotifyPlaylistId) {
    return (
      <div className="card spot">
        {header}
        <iframe
          title={playlist.title}
          src={`https://open.spotify.com/embed/playlist/${playlist.spotifyPlaylistId}?utm_source=generator&theme=0`}
          height="352"
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      </div>
    );
  }

  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <div className="card spot">
      <audio
        ref={audioRef}
        className="player-audio"
        loop
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      {header}

      <button type="button" className={`cover${playing ? " on" : ""}`} onClick={toggle} aria-label={playing ? t("player.pause") : t("player.play")}>
        {waiting ? <span className="cover-wait">●</span> : <span>{playing ? "❚❚" : "▶"}</span>}
      </button>

      <div className="now">
        <div className="song">{track ? track.title : "—"}</div>
        <div className="artist">{track ? track.artist : t("player.tracks", { n: playlist.tracks.length })}</div>
      </div>

      {track?.previewUrl && (
        <div className="bar">
          <i style={{ width: `${progress}%` }} />
          <span className="bar-time">
            {fmt(time)} / {fmt(duration)}
          </span>
        </div>
      )}

      <div className="controls">
        <span className="vol-label">{t("player.volume")}</span>
        <input type="range" min="0" max="1" step="0.05" value={volume} aria-label={t("player.volume")} onChange={(e) => changeVolume(e.target.value)} />
        {track && (
          <a className="full" href={track.spotifyUrl ?? track.url} target="_blank" rel="noreferrer">
            {t("player.full")}
          </a>
        )}
      </div>

      {waiting && <div className="mute-note">{t("player.enable")}</div>}

      <ol className="tracklist">
        {playlist.tracks.map((tr, i) => (
          <li key={`${tr.title}-${i}`} className={i === current ? "on" : undefined}>
            {tr.previewUrl ? (
              <button type="button" onClick={() => pick(i)}>
                <span className="tr-title">{i === current && playing ? "❚❚ " : "▶ "}{tr.title}</span>
                <span className="tr-artist">{tr.artist}</span>
              </button>
            ) : (
              <a href={tr.spotifyUrl ?? tr.url} target="_blank" rel="noreferrer" title={t("player.external")}>
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
