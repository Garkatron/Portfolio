# GARKATRON — portfolio

Static portfolio built as a code editor ("Editor × Hazard", see `mockups/d-editor-hazard-mix.html`).
Astro 5 + React 19 + Tailwind v4, deployed to GitHub Pages at <https://garkatron.site/>.

```sh
pnpm install
pnpm dev        # http://localhost:4321 (header search needs a build, see below)
pnpm build      # astro build + Pagefind search index -> dist/
pnpm preview    # serve dist/ (full site incl. search)
```

## Editing content (no .astro/.jsx changes needed)

| What | File |
| --- | --- |
| Name, status, bio, role, links, CV, default locale | `src/data/site.json` |
| Projects (`featured` + `order` pick the 4 on the home page) | `src/data/projects.json` |
| Books (`status`: `reading` \| `to-read`, optional `cover` URL) | `src/data/books.json` |
| Videos (`playlists` = folders, each with a list of YouTube `id`s) | `src/data/videos.json` |
| Roadmap + target profile | `src/data/roadmap.json` |
| Experience | `src/data/experience.json` |
| Explorer → Tools (icon keys from `src/data/techIcons.js`) | `src/data/tools.json` |
| Player tracks / Spotify playlist | `src/data/playlist.json` |
| Blog posts (Markdown + frontmatter `title`, `date`, `description`) | `src/data/blog/<lang>/<slug>/index.md` |
| UI strings | `src/i18n/<lang>.json` |

- **Translations in content:** any field `x` can have an `x_en` sibling (`description` / `description_en`).
  The base value is the default locale (Spanish) and is the fallback.
- **Project images:** put files in `public/images/projects/` and reference them as `/images/projects/…`.
  Missing images fall back to the striped placeholder.
- **Blog:** each post is a folder — `index.md` plus its own images, referenced relatively
  (`./diagram.jpg`) and optimized to webp at build time (needs the `sharp` devDependency).
  A post missing in `en/` falls back to the `es/` version with a notice.
- **Post frontmatter:** `cover` / `coverAlt` for the optional cover above the title (an image or
  a `.ascii` file, both inside the post folder), and `genIndex: true` to build a table of contents
  from the post's own `##`/`###` headings. The index is opt-in, and a post with nothing to list
  gets no box rather than an empty one.
- **Book covers:** `cover` accepts an image URL (Open Library works: `https://covers.openlibrary.org/b/isbn/<isbn>-M.jpg`) or a local `/images/books/…` file.
- **Videos:** `videos.json` holds `playlists`; each renders as an explorer-style folder and opens into a mini
  YouTube (player + sidebar). A video uses either the YouTube `id` (the part after `watch?v=`) **or** a direct
  file `src` — drop an `.mp4`/`.webm` in `public/videos/` and reference it as `/videos/clip.mp4` (remote URLs
  work too); `poster` is an optional thumbnail. The open playlist/video is kept in the URL (`?p=…&v=…`) so a
  view can be shared.
- **Player:** each track's 30s Spotify preview is fetched at build time and played through a custom
  `<audio>` player (no iframe). Tracks play on click; full songs open in Spotify via the "full track" link.
  Set `spotifyPlaylistId` to embed a whole playlist instead.
  The volume level and the mute toggle are both remembered in `localStorage`
  (`garkatron:volume`, `garkatron:muted`); mute is kept apart from the level, so
  unmuting brings back the volume the visitor had, not the default.

## Adding a language

1. Copy `src/i18n/en.json` to `src/i18n/<code>.json` and translate it (including `_meta.name` / `_meta.short`).
2. Add `_<code>` fields to content where you want translations.

Locales are discovered from `src/i18n/*.json` (used by `astro.config.mjs` and the routes), so no code changes are needed.
The default locale lives at `/`; other locales live under `/<code>/`.

## Features

- **Theme:** 4 accents (hazard / cyan / magenta / green), via titlebar swatches or the palette. Stored in `localStorage`.
- **Command palette:** `⌘K` / `Ctrl+K`. Shortcuts: `/` search, `P` projects, `C` contact.
- **Search:** Pagefind index generated at build time; results follow the page language.
- **Sys.log:** session-persisted activity log (palette commands, opened files/links, theme/lang changes).
- **Barcodes:** build-time Code128 (bwip-js) encoding each project's canonical URL. They scan reliably on the project
  detail page. On the 2-column cards they're narrower than 1px per module, so treat those as a link, not a scan target.

## Fonts

Silkscreen + JetBrains Mono + VT323 (Google Fonts). Silkscreen stands in for Pixel Cyberphont 2.0. To use licensed files,
add an `@font-face` for them under `public/fonts/` and put the family first in `--font-px` in `src/styles/global.css`.

## Deploy

`.github/workflows/deploy.yml` builds with pnpm on push to `main` and publishes `dist/` through GitHub Pages Actions.
`public/CNAME` sets the custom domain. Repository Settings → Pages → Source must be **GitHub Actions**.
