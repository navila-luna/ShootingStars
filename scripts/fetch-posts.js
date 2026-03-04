/**
 * fetch-posts.js
 *
 * Runs via GitHub Actions daily. Calls the Apify Instagram Hashtag Scraper,
 * filters to posts made within the last 24 hours by accounts with ≤ 1000
 * followers, and writes a clean posts.json to the repo root for the
 * frontend to consume.
 *
 * Apify actor used:
 *   apify/instagram-hashtag-scraper
 *   https://apify.com/apify/instagram-hashtag-scraper
 */

import { ApifyClient } from 'apify-client';
import { writeFileSync }  from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Config ────────────────────────────────────────────────────────
const HASHTAG           = 'standaretopost';
const MAX_FOLLOWERS     = 1000;
const LOOKBACK_HOURS    = 24;
// Apify free tier: keep resultsLimit low (50–100) to stay within $5/mo credits.
// Each scraped post costs roughly ~0.5–1 compute unit; free tier = 5 CU/day approx.
const RESULTS_LIMIT     = 50;

const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error('ERROR: APIFY_TOKEN environment variable is not set.');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', 'posts.json');

function isWithinLookback(timestampStr) {
  const posted  = new Date(timestampStr).getTime();
  const cutoff  = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;
  return posted >= cutoff;
}

function buildPost(item) {
  // Apify instagram-hashtag-scraper field reference:
  // item.id, item.shortCode, item.timestamp, item.videoUrl, item.displayUrl,
  // item.ownerUsername, item.ownerId, item.ownerFullName,
  // item.ownerFollowersCount (follower count at scrape time),
  // item.caption, item.likesCount, item.commentsCount, item.type
  return {
    id:          item.id          ?? item.shortCode,
    shortCode:   item.shortCode,
    username:    item.ownerUsername,
    fullName:    item.ownerFullName   ?? '',
    followers:   item.ownerFollowersCount ?? 0,
    // Prefer video; fall back to image for Reels/carousel
    videoUrl:    item.videoUrl    ?? null,
    thumbUrl:    item.displayUrl  ?? null,
    caption:     (item.caption    ?? '').slice(0, 200),
    postedAt:    item.timestamp,
    postUrl:     `https://www.instagram.com/p/${item.shortCode}/`,
    type:        item.type,        // 'Video', 'Image', 'Sidecar'
    likes:       item.likesCount  ?? 0,
  };
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log(`[${new Date().toISOString()}] Starting Apify run for #${HASHTAG}...`);

  const client = new ApifyClient({ token: APIFY_TOKEN });

  // Start the actor run
  const run = await client.actor('apify/instagram-hashtag-scraper').call({
    hashtags:        [HASHTAG],
    resultsLimit:    RESULTS_LIMIT,
    // Only fetch posts — skip Stories and profile data
    scrapeType:      'posts',
  });

  console.log(`[${new Date().toISOString()}] Run finished. Dataset ID: ${run.defaultDatasetId}`);

  // Pull all results from the dataset
  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems({ limit: RESULTS_LIMIT });

  console.log(`  Raw items from Apify: ${items.length}`);

  // Filter: within 24 hrs AND followers ≤ 1000
  const filtered = items
    .filter(item => {
      if (!item.timestamp) return false;
      if (!isWithinLookback(item.timestamp)) return false;
      const followers = item.ownerFollowersCount ?? 0;
      if (followers > MAX_FOLLOWERS) return false;
      return true;
    })
    .map(buildPost);

  // Shuffle so each visitor sees a different star order
  filtered.sort(() => Math.random() - 0.5);

  console.log(`  After filter (≤${MAX_FOLLOWERS} followers, last ${LOOKBACK_HOURS}h): ${filtered.length} posts`);

  // Build the output payload
  const output = {
    fetchedAt:   new Date().toISOString(),
    date:        new Date().toISOString().slice(0, 10), // YYYY-MM-DD — used by frontend for daily reset
    hashtag:     HASHTAG,
    totalPosts:  filtered.length,
    posts:       filtered,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`  posts.json written → ${OUTPUT_PATH}`);
  console.log(`  Done. ${filtered.length} stars ready for today.`);
}

main().catch(err => {
  console.error('Fetch failed:', err);
  process.exit(1);
});