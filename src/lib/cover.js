// Post covers (src/pages/[...lang]/blog/[slug].astro).
//
// A cover is optional and comes in two kinds, both declared in frontmatter as a
// path relative to the post's own folder:
//
//   cover: ./cover.jpg     → an image, optimized to webp by astro:assets
//   cover: ./cover.ascii   → ASCII art, drawn as-is in a monospace block
//
// Images and art live next to `index.md` like any other post asset, so the
// frontmatter only names which one is the cover.
//
// The two are resolved through `import.meta.glob` rather than the schema's
// `image()` helper because that one only understands images, and an ASCII cover
// has to be read as raw text.
const IMAGES = import.meta.glob("../data/blog/**/*.{jpg,jpeg,png,webp,avif,gif,svg}", { eager: true });
const ASCII = import.meta.glob("../data/blog/**/*.ascii", {
  eager: true,
  query: "?raw",
  import: "default",
});

/** The collection id is `<lang>/<slug>/index`, which is already the folder. */
function postDir(entry) {
  return entry.id.replace(/\/index$/, "");
}

/** `../data/blog/en/game-ai` → `en/game-ai`, so frontmatter can stay relative. */
function resolve(entry, cover) {
  const dir = postDir(entry);
  return IMAGES[`../data/blog/${dir}/${cover}`] ?? null;
}

function resolveAscii(entry, cover) {
  const dir = postDir(entry);
  return ASCII[`../data/blog/${dir}/${cover}`] ?? null;
}

/** Widest row, in characters — the cover is scaled to fit this many columns. */
function columnsOf(text) {
  return Math.max(...text.split("\n").map((line) => line.length), 1);
}

/**
 * The post's cover, or null when it has none.
 *
 * @param {object} post one of getPosts' entries, whose frontmatter is spread in
 *   at the top level (`post.title`, `post.cover`), with the raw entry kept in
 *   `post.entry` — the id is what locates the cover file.
 * @returns {{kind: 'image', image: object, alt: string}
 *         | {kind: 'ascii', text: string, columns: number, alt: string}}
 */
export function getCover(post) {
  const cover = post?.cover;
  if (!cover || !post?.entry) return null;

  const clean = cover.replace(/^\.\//, "");
  const alt = post.coverAlt || post.title || "";

  const image = resolve(post.entry, clean);
  if (image) return { kind: "image", image: image.default, alt };

  const raw = resolveAscii(post.entry, clean);
  // Leading/trailing blank rows are padding around the drawing, not part of it.
  const text = typeof raw === "string" ? raw.replace(/\s+$/, "").replace(/^\n+/, "") : "";
  if (text) return { kind: "ascii", text, columns: columnsOf(text), alt };

  // A cover that points nowhere is a typo, not a post without one — say so at
  // build time instead of silently rendering nothing.
  console.warn(`[blog] ${post.entry.id}: cover "${cover}" not found in the post folder`);
  return null;
}
