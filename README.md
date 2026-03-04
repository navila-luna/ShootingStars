# ShootingStars

# First Light ✦

An internet art project — animated shooting stars, each one a real person who posted their first Instagram post today with under 1,000 followers.

---

## How it works

1. **GitHub Actions** runs a cron job every day at 00:05 UTC
2. It calls the **Apify Instagram Hashtag Scraper** for `#firstpost`
3. Posts are filtered: posted within 24 hours, account has ≤ 1,000 followers
4. Results are saved as `posts.json` and committed to this repo
5. **GitHub Pages** serves the static site — the frontend fetches `posts.json` on load
6. Each visitor's discovered stars are stored in **localStorage**, keyed by today's date — so progress resets automatically the next day

---

## Setup Guide (start to finish)

### Step 1 — Create your GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Name it `first-light` (or anything you like)
3. Set it to **Public** (required for free GitHub Pages)
4. Click **Create repository**
5. Upload all files from this folder into the repo root

Your repo should look like:
```
first-light/
├── .github/
│   └── workflows/
│       └── fetch-posts.yml
├── scripts/
│   ├── fetch-posts.js
│   └── package.json
├── index.html
├── posts.json
└── README.md
```

---

### Step 2 — Enable GitHub Pages

1. In your repo, go to **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**
5. Your site will be live at `https://YOUR-USERNAME.github.io/first-light/`

---

### Step 3 — Create your Apify account

1. Go to [apify.com](https://apify.com) and sign up (free — no credit card needed)
2. After signing in, go to **Settings → Integrations**
3. Copy your **Personal API token** (starts with `apify_api_...`)

---

### Step 4 — Add Apify token to GitHub Secrets

1. In your GitHub repo go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `APIFY_TOKEN`
4. Value: paste your Apify API token
5. Click **Add secret**

---

### Step 5 — Install the Apify actor

1. Go to [apify.com/apify/instagram-hashtag-scraper](https://apify.com/apify/instagram-hashtag-scraper)
2. Click **Try for free** — this saves it to your account
3. You don't need to configure anything — the GitHub Action handles it

---

### Step 6 — Trigger your first run manually

1. In your GitHub repo, go to **Actions**
2. Click **Fetch Daily Instagram Posts** in the left sidebar
3. Click **Run workflow → Run workflow**
4. Wait ~2–3 minutes for it to complete
5. Check that `posts.json` in your repo now has real posts
6. Visit your GitHub Pages URL — you should see real stars!

---

### Step 7 — Verify the daily cron

The workflow runs automatically at **00:05 UTC every day**.
You can change the time in `.github/workflows/fetch-posts.yml`:

```yaml
- cron: '5 0 * * *'   # 00:05 UTC daily
```

Use [crontab.guru](https://crontab.guru) to adjust the schedule.

---

## Free tier limits

| Service | Free allowance | Usage |
|---|---|---|
| GitHub Actions | 2,000 min/month | ~2 min/run × 30 days = 60 min |
| GitHub Pages | Unlimited static hosting | ✓ |
| Apify | $5 free credits/month | ~$0.05–0.10 per run |

At one run per day, Apify costs roughly **$1.50–3.00/month** in compute units — well within the $5 free credit. If you want more posts, you can run the cron 2–3× per day and it will still stay free.

---

## Adjusting the scraper

Edit `scripts/fetch-posts.js` to tune:

```js
const MAX_FOLLOWERS  = 1000;   // follower ceiling
const LOOKBACK_HOURS = 24;     // how far back to look
const RESULTS_LIMIT  = 50;     // max posts to fetch per run (affects Apify cost)
```

---

## File reference

| File | Purpose |
|---|---|
| `index.html` | The Three.js frontend — served by GitHub Pages |
| `posts.json` | Today's filtered posts — updated daily by the cron |
| `scripts/fetch-posts.js` | Node script that calls Apify and writes posts.json |
| `scripts/package.json` | Dependencies for the fetch script |
| `.github/workflows/fetch-posts.yml` | GitHub Actions cron definition |