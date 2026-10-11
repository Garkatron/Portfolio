import { useEffect, useMemo, useState } from "react";
import { createT } from "../i18n/translate.js";
import { log } from "../lib/syslog.js";

// The videos page is a small YouTube, in two steps:
//   1. an explorer-style list of playlist "folders";
//   2. inside a folder, a player with a YouTube-like video sidebar.
// A video is either a YouTube `id` or a direct file `src` (served from public/).
// Open playlist/video is kept in the URL (?p=…&v=…) so a view can be shared.

const ytEmbed = (id) => `https://www.youtube.com/embed/${id}?rel=0`;
const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

function readUrl() {
  if (typeof window === "undefined") return { p: null, v: null };
  const params = new URLSearchParams(window.location.search);
  return { p: params.get("p"), v: params.get("v") };
}

function writeUrl(playlistId, videoKey) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (playlistId) params.set("p", playlistId);
  if (videoKey) params.set("v", videoKey);
  const search = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
}

export default function Videos({ playlists, dict, fallback }) {
  const t = useMemo(() => createT(dict, fallback), [dict, fallback]);
  const [playlistId, setPlaylistId] = useState(null);
  const [videoIndex, setVideoIndex] = useState(0);

  // Adopt any playlist/video named in the URL (after mount, so SSR is stable).
  useEffect(() => {
    const { p, v } = readUrl();
    const playlist = playlists.find((x) => x.id === p);
    if (!playlist) return;
    setPlaylistId(playlist.id);
    const i = v ? playlist.videos.findIndex((vid) => vid.key === v) : 0;
    setVideoIndex(i >= 0 ? i : 0);
  }, [playlists]);

  const playlist = playlists.find((p) => p.id === playlistId) ?? null;

  const openPlaylist = (pl) => {
    setPlaylistId(pl.id);
    setVideoIndex(0);
    writeUrl(pl.id, pl.videos[0]?.key ?? null);
    log("open", `▶ ${pl.name}/`);
  };

  const closePlaylist = () => {
    setPlaylistId(null);
    writeUrl(null, null);
  };

  const pick = (i) => {
    setVideoIndex(i);
    writeUrl(playlist.id, playlist.videos[i]?.key ?? null);
    log("open", `▶ ${playlist.videos[i]?.title ?? ""}`);
  };

  // ---- folders (playlists) ----------------------------------------------
  if (!playlist) {
    return (
      <div className="vvideos">
        <p className="vvideos-hint">{t("videos.hint")}</p>
        {playlists.length ? (
          <ul className="vfolders">
            {playlists.map((pl) => (
              <li key={pl.id}>
                <button type="button" className="vfolder" onClick={() => openPlaylist(pl)} aria-label={`${t("videos.open")}: ${pl.name}/`}>
                  <span className="vfolder-icon" aria-hidden="true">▸</span>
                  <span className="vfolder-name">{pl.name}/</span>
                  <span className="vfolder-count">{t("videos.count", { n: pl.videos.length })}</span>
                  {pl.description && <span className="vfolder-desc">{pl.description}</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">{t("videos.empty")}</p>
        )}
      </div>
    );
  }

  // ---- one playlist, as a mini YouTube ----------------------------------
  const video = playlist.videos[videoIndex] ?? playlist.videos[0] ?? null;

  return (
    <div className="vvideos">
      <div className="vplayer">
        <div className="vplayer-main">
          <div className="vstage">
            {video ? (
              video.id ? (
                <iframe
                  key={video.id}
                  src={ytEmbed(video.id)}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video key={video.src} className="vfile" controls preload="metadata" poster={video.poster ?? undefined}>
                  <source src={video.src} />
                  {t("videos.noSupport")}
                </video>
              )
            ) : (
              <span className="vstage-empty">{t("videos.empty")}</span>
            )}
          </div>

          <button type="button" className="vback" onClick={closePlaylist}>
            ← {t("videos.back")}
          </button>

          <h2 className="vtitle">{video ? video.title : "—"}</h2>
          <div className="vmeta">
            <span className="vbadge px">{t("videos.playlist")}</span>
            <span>{playlist.name}/</span>
            {video?.author && <span>· {video.author}</span>}
            {video?.src && <span className="vsrc">· {t("videos.file")}</span>}
          </div>
          {playlist.description && <p className="vdesc">{playlist.description}</p>}
        </div>

        <aside className="vlist" aria-label={t("videos.list")}>
          <div className="vlist-head px">
            {playlist.name}/ · {t("videos.count", { n: playlist.videos.length })}
          </div>
          <ol>
            {playlist.videos.map((v, i) => (
              <li key={`${v.key}-${i}`} className={i === videoIndex ? "on" : undefined}>
                <button type="button" onClick={() => pick(i)} aria-current={i === videoIndex ? "true" : undefined}>
                  {v.id ? (
                    <img className="vthumb" src={ytThumb(v.id)} alt="" loading="lazy" />
                  ) : v.poster ? (
                    <img className="vthumb" src={v.poster} alt="" loading="lazy" />
                  ) : (
                    <span className="vthumb vthumb-file" aria-hidden="true">▶</span>
                  )}
                  <span className="vinfo">
                    <span className="vname">{v.title}</span>
                    {v.author && <span className="vauthor">{v.author}</span>}
                    {v.duration && <span className="vduration">{v.duration}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
