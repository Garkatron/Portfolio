import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { createT } from "../i18n/translate.js";
import { log } from "../lib/syslog.js";

// A small YouTube inside the videos window. Two views share the ?p=…&v=…
// state: a browse grid of cards, and a watch page with the player + "up next".
// A video is either a YouTube `id` or a direct file `src` (served from public/).

const ytEmbed = (id: string) => `https://www.youtube.com/embed/${id}?rel=0`;
const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export interface VideoItem {
  id: string | null;
  src: string | null;
  poster: string | null;
  title: string;
  author: string;
  duration: string;
  key: string;
}

export interface VideoPlaylist {
  id: string;
  name: string;
  description: string;
  videos: VideoItem[];
}

interface VideosProps {
  playlists: VideoPlaylist[];
  dict: any;
  fallback: any;
  /** Inside a desktop window: keep the playlist/video state local, no URL. */
  embedded?: boolean;
}

function readUrl(): { p: string | null; v: string | null } {
  if (typeof window === "undefined") return { p: null, v: null };
  const params = new URLSearchParams(window.location.search);
  return { p: params.get("p"), v: params.get("v") };
}

function writeUrl(playlistId: string | null, videoKey: string | null): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (playlistId) params.set("p", playlistId);
  if (videoKey) params.set("v", videoKey);
  const search = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
}

function thumbFor(video: VideoItem): string | null {
  return video.id ? ytThumb(video.id) : video.poster;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "");
}

function avatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return `hsl(${hash} 42% 36%)`;
}

const IconLike = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M7 22V10l4-8 1.4.8c.9.5 1.4 1.5 1.3 2.6L13 9h6.2a2 2 0 0 1 1.9 2.6l-2.2 8A2 2 0 0 1 17 21H7" />
    <path d="M7 10H3v12h4" />
  </svg>
);

const IconShare = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M4 12v7h16v-7" />
    <path d="M12 16V3" />
    <path d="m7 8 5-5 5 5" />
  </svg>
);

const IconSave = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M6 3h12v18l-6-4-6 4V3Z" />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);

const PlayBadge = () => <span className="yt-logo-play" aria-hidden="true" />;

export default function Videos({ playlists, dict, fallback, embedded = false }: VideosProps) {
  const t = useMemo(() => createT(dict, fallback), [dict, fallback]);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [videoIndex, setVideoIndex] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    const scroller = rootRef.current?.closest(".os-app-pad, .os-window-page") as HTMLElement | null;
    scroller?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const playlist = playlists.find((entry) => entry.id === playlistId) ?? null;
  const video = playlist?.videos[videoIndex] ?? playlist?.videos[0] ?? null;

  // Adopt any playlist/video named in the URL (after mount, so SSR is stable).
  useEffect(() => {
    if (embedded) return;
    const { p, v } = readUrl();
    const match = playlists.find((entry) => entry.id === p);
    if (!match) return;
    setPlaylistId(match.id);
    const index = v ? match.videos.findIndex((item) => item.key === v) : 0;
    setVideoIndex(index >= 0 ? index : 0);
  }, [embedded, playlists]);

  // Subscriptions are per playlist and remembered between visits.
  useEffect(() => {
    if (!playlist) return;
    try {
      setSubscribed(localStorage.getItem(`garkatron:yt:${playlist.id}`) === "1");
    } catch {}
  }, [playlist?.id]);

  // Reactions are per video, not per playlist.
  useEffect(() => {
    setLiked(false);
    setSaved(false);
    setCopied(false);
  }, [playlist?.id, videoIndex]);

  const allVideos = useMemo(
    () =>
      playlists
        .flatMap((pl) => pl.videos.map((item, index) => ({ playlist: pl, video: item, index })))
        .filter(({ playlist: pl }) => !filter || pl.id === filter)
        .filter(({ playlist: pl, video: item }) => {
          const q = query.trim().toLowerCase();
          if (!q) return true;
          return `${item.title} ${item.author} ${pl.name}`.toLowerCase().includes(q);
        }),
    [playlists, filter, query],
  );

  const openVideo = (pl: VideoPlaylist, index: number) => {
    setPlaylistId(pl.id);
    setVideoIndex(index);
    if (!embedded) writeUrl(pl.id, pl.videos[index]?.key ?? null);
    log("open", `▶ ${pl.videos[index]?.title ?? ""}`);
    scrollToTop();
  };

  const goHome = () => {
    setPlaylistId(null);
    if (!embedded) writeUrl(null, null);
    scrollToTop();
  };

  const pick = (index: number) => {
    if (!playlist) return;
    setVideoIndex(index);
    if (!embedded) writeUrl(playlist.id, playlist.videos[index]?.key ?? null);
    log("open", `▶ ${playlist.videos[index]?.title ?? ""}`);
    scrollToTop();
  };

  const toggleSubscribe = () => {
    if (!playlist) return;
    const next = !subscribed;
    setSubscribed(next);
    try {
      localStorage.setItem(`garkatron:yt:${playlist.id}`, next ? "1" : "0");
    } catch {}
    log("cmd", `${next ? "subscribe" : "unsubscribe"} ${playlist.name}`);
  };

  const share = async () => {
    if (typeof navigator === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: video?.title ?? playlist?.name ?? "", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.clearTimeout(copyTimer.current);
        copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
      }
    } catch {}
  };

  const masthead = (
    <header className="yt-masthead">
      <button type="button" className="yt-brand" onClick={goHome} aria-label={t("videos.all")}>
        <span className="yt-logo">
          <PlayBadge />
        </span>
        <span className="yt-wordmark">
          GARKATRON <b>TV</b>
        </span>
      </button>

      {playlist ? (
        <button type="button" className="yt-back" onClick={goHome}>
          ← {t("videos.all")}
        </button>
      ) : (
        <label className="yt-search">
          <IconSearch />
          <input
            type="search"
            value={query}
            onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
            placeholder={t("videos.search")}
            aria-label={t("videos.search")}
            autoComplete="off"
            spellcheck={false}
          />
        </label>
      )}
    </header>
  );

  // ---- browse ------------------------------------------------------------
  if (!playlist) {
    return (
      <div className="yt" ref={rootRef}>
        {masthead}
        {playlists.length > 1 && (
          <div className="yt-chips" role="tablist" aria-label={t("videos.playlists")}>
            <button
              type="button"
              role="tab"
              aria-selected={filter === null}
              className={`yt-chip${filter === null ? " on" : ""}`}
              onClick={() => setFilter(null)}
            >
              {t("videos.all")}
            </button>
            {playlists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                role="tab"
                aria-selected={filter === pl.id}
                className={`yt-chip${filter === pl.id ? " on" : ""}`}
                onClick={() => setFilter(pl.id)}
              >
                {pl.name}
              </button>
            ))}
          </div>
        )}

        {allVideos.length ? (
          <div className="yt-grid">
            {allVideos.map(({ playlist: pl, video: item, index }) => {
              const thumb = thumbFor(item);
              const channel = item.author || pl.name;
              const color = avatarColor(channel);
              return (
                <button
                  key={`${pl.id}-${item.key}-${index}`}
                  type="button"
                  className="yt-card"
                  onClick={() => openVideo(pl, index)}
                >
                  <span className="yt-thumb">
                    {thumb ? (
                      <img src={thumb} alt="" loading="lazy" />
                    ) : (
                      <span className="yt-thumb-file">
                        <PlayBadge />
                      </span>
                    )}
                    {item.duration && <span className="yt-time">{item.duration}</span>}
                    <span className="yt-hover-play" aria-hidden="true">
                      <PlayBadge />
                    </span>
                  </span>
                  <span className="yt-card-info">
                    <span className="yt-avatar" style={{ background: color }} aria-hidden="true">
                      {initials(channel)}
                    </span>
                    <span className="yt-card-text">
                      <span className="yt-card-title">{item.title}</span>
                      <span className="yt-card-channel">{channel}</span>
                      <span className="yt-card-meta">
                        {pl.name}
                        {item.id ? "" : ` · ${t("videos.file")}`}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="yt-empty">{t("videos.empty")}</p>
        )}
      </div>
    );
  }

  // ---- watch -------------------------------------------------------------
  const channel = video?.author || playlist.name;
  const color = avatarColor(channel);

  return (
    <div className="yt" ref={rootRef}>
      {masthead}
      <div className="yt-watch">
        <div className="yt-watch-main">
          <div className="yt-stage">
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
                <video key={video.src} className="yt-file" controls preload="metadata" poster={video.poster ?? undefined}>
                  <source src={video.src ?? undefined} />
                  {t("videos.noSupport")}
                </video>
              )
            ) : (
              <span className="yt-stage-empty">{t("videos.empty")}</span>
            )}
          </div>

          <h1 className="yt-title">{video?.title ?? t("videos.empty")}</h1>

          <div className="yt-actions">
            <div className="yt-channel-row">
              <span className="yt-avatar yt-avatar-lg" style={{ background: color }} aria-hidden="true">
                {initials(channel)}
              </span>
              <span className="yt-channel-text">
                <b>{channel}</b>
                <span>{t("videos.count", { n: playlist.videos.length })}</span>
              </span>
              <button
                type="button"
                className={`yt-subscribe${subscribed ? " on" : ""}`}
                onClick={toggleSubscribe}
                aria-pressed={subscribed}
              >
                {subscribed && <IconBell />}
                {subscribed ? t("videos.subscribed") : t("videos.subscribe")}
              </button>
            </div>

            <div className="yt-action-row">
              <button
                type="button"
                className="yt-pill"
                onClick={() => {
                  setLiked((value) => !value);
                  log("cmd", `${liked ? "unlike" : "like"} ${video?.title ?? ""}`);
                }}
                aria-pressed={liked}
              >
                <IconLike /> {liked ? t("videos.liked") : t("videos.like")}
              </button>
              <button type="button" className="yt-pill" onClick={share}>
                <IconShare /> {copied ? t("videos.copied") : t("videos.share")}
              </button>
              <button
                type="button"
                className="yt-pill"
                onClick={() => setSaved((value) => !value)}
                aria-pressed={saved}
              >
                <IconSave /> {saved ? t("videos.saved") : t("videos.save")}
              </button>
            </div>
          </div>

          <div className="yt-description">
            <div className="yt-desc-meta">
              {t("videos.count", { n: playlist.videos.length })} ·{" "}
              {video?.id ? "YouTube" : t("videos.file")} · {playlist.name}
            </div>
            <p>{playlist.description || t("videos.intro")}</p>
            <div className="yt-desc-foot">
              {t("videos.playlist")} · {video?.author || playlist.name}
            </div>
          </div>
        </div>

        <aside className="yt-upnext" aria-label={t("videos.upNext")}>
          <div className="yt-upnext-head">
            <b>{t("videos.upNext")}</b>
            <span>{playlist.name}</span>
          </div>
          <ol>
            {playlist.videos.map((item, index) => {
              const thumb = thumbFor(item);
              return (
                <li key={`${item.key}-${index}`} className={index === videoIndex ? "on" : undefined}>
                  <button type="button" onClick={() => pick(index)} aria-current={index === videoIndex ? "true" : undefined}>
                    <span className="yt-next-thumb">
                      {thumb ? (
                        <img src={thumb} alt="" loading="lazy" />
                      ) : (
                        <span className="yt-thumb-file">
                          <PlayBadge />
                        </span>
                      )}
                      {item.duration && <span className="yt-time">{item.duration}</span>}
                    </span>
                    <span className="yt-next-info">
                      <span className="yt-next-title">{item.title}</span>
                      <span className="yt-next-channel">{item.author || playlist.name}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}
