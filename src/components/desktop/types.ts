// Serializable props produced by src/lib/shell.js and passed to the desktop
// island. The dictionaries are deeply nested JSON, so they stay loosely typed
// here; everything the desktop itself touches is explicit.

export type Dict = Record<string, any>;

export interface NavItem {
  id: string;
  file: string;
  href: string;
  active?: boolean;
}

export interface TabItem {
  file: string;
  href: string;
  active?: boolean;
}

export interface Locale {
  code: string;
  name: string;
  short: string;
  href: string;
}

export interface SiteInfo {
  name: string;
  status: string;
  openToWork: boolean;
  codingSince: string;
}

export interface Track {
  title: string;
  artist: string;
  streamUrl?: string | null;
  embedUrl?: string | null;
  pageUrl?: string | null;
  searchUrl?: string;
}

export interface Playlist {
  title: string;
  provider: { id: string; label: string; accent: string };
  tracks: Track[];
  playlistEmbedUrl?: string | null;
  spotifyPlaylistId?: string | null;
}

export interface ShellData {
  lang: string;
  dict: any;
  fallbackDict: any;
  files: Record<string, string>;
  routes: Record<string, string>;
  path: string;
  nav: NavItem[];
  tabs: TabItem[];
  locales: Locale[];
  site: SiteInfo;
  playlist: Playlist;
  projectCount: number;
}

export type AuxApp = "player" | "syslog";

export interface OpenWindow {
  id: string;
  kind: "route" | AuxApp;
  title: string;
  handle: import("slaos").WindowHandle;
  minimized: boolean;
}
