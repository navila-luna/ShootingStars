/**
 * data.js
 *
 * Fetches posts.json (committed daily by the GitHub Actions cron) and
 * normalises each record into the shape the rest of the app expects.
 * Falls back gracefully to an empty array so the ambient star field
 * still renders on days when no posts were scraped.
 */

/**
 * @typedef {Object} Post
 * @property {string}      id
 * @property {string}      username
 * @property {string}      fullName
 * @property {string|null} videoUrl
 * @property {string|null} thumbUrl
 * @property {string}      caption
 * @property {string}      postUrl
 * @property {string|null} postedAt
 * @property {string}      type      — 'Image' | 'Video' | 'Sidecar'
 */

/**
 * Fetch and normalise today's posts.
 * @returns {Promise<Post[]>}
 */
export async function loadPosts() {
  try {
    const res = await fetch('./posts.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!Array.isArray(data.posts)) return [];

    return data.posts.map((p, i) => ({
      id:       p.id        ?? String(i),
      username: p.username  ?? 'unknown',
      fullName: p.fullName  ?? '',
      videoUrl: p.videoUrl  ?? null,
      thumbUrl: p.thumbUrl  ?? null,
      caption:  p.caption   ?? '',
      postUrl:  p.postUrl   ?? '#',
      postedAt: p.postedAt  ?? null,
      type:     p.type      ?? 'Image',
    }));
  } catch (err) {
    console.warn('[ShootingStars] Could not load posts.json:', err.message);
    return [];
  }
}