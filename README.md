# ShootingStars
An internet art project — animated shooting stars that once clicked, show people who posted that day and had added the #standaretopost tag.

---

## How it works

1. **GitHub Actions** runs a cron job every day 
2. It calls the **Apify Instagram Hashtag Scraper** for `#standaretopost`
3. Posts are filtered: posted within 24 hours
4. Results are saved as `posts.json` and committed to this repo
5. **GitHub Pages** serves the static site — the frontend fetches `posts.json` on load
6. Each visitor's discovered stars are stored in **localStorage**, keyed by today's date — so progress resets automatically the next day


| File | Purpose |
|---|---|
| `index.html` | The frontend main page — served by GitHub Pages |
| `posts.json` | Today's filtered posts — updated daily by the cron |
| `scripts/fetch-posts.js` | Node script that calls Apify and writes posts.json |
| `scripts/package.json` | Dependencies for the fetch script |
| `.github/workflows/fetch-posts.yml` | GitHub Actions cron definition |

<img width="1368" height="884" alt="Kapture 2026-06-15 at 20 21 20" src="https://github.com/user-attachments/assets/2d6430f5-4147-45df-99d2-a42f189ac19e" />

<img width="1368" height="884" alt="Kapture 2026-06-15 at 20 23 35" src="https://github.com/user-attachments/assets/c756ab10-738e-49d6-a322-06f6ff5ef37b" />


Or see a full demo here: https://www.instagram.com/reel/DVh159JAsIS/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==
