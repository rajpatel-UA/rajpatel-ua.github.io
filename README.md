# Raj Patel · Personal Site

Source for [rajpatel-ua.github.io](https://rajpatel-ua.github.io/), the academic portfolio of Raj Patel, a Computer Science PhD student at The University of Alabama researching AI security and AI-driven cyber defense.

## Structure

```
index.html                     # Home: about, research, projects, publications, experience, teaching, contact
cv.html                        # Curriculum vitae (web version; prints to the PDF below)
teaching.html                  # Teaching portfolio: philosophy statement + CS 456 course design
assets/css/style.css           # Site styles, light and dark themes
assets/css/doc.css             # CV / teaching page layout and print (PDF) styles
assets/js/main.js              # Theme, nav, animations, publication filters, project dialogs, live Scholar numbers
assets/data/scholar.json       # Citation stats, refreshed weekly by the GitHub Action
assets/docs/*.pdf              # Downloadable CV and teaching portfolio
scripts/update_scholar.py      # Pulls the Google Scholar profile into scholar.json
.github/workflows/scholar.yml  # Runs the script every Monday and commits changes
.nojekyll                      # Serve files as-is (no Jekyll build)
```

It's a plain static site with no build step. Push to `main` and GitHub Pages publishes it.

## Google Scholar sync

The `Update Google Scholar stats` workflow runs every Monday (or on demand from the **Actions** tab → **Run workflow**). It reads the public Scholar profile and commits `assets/data/scholar.json` only when the numbers change. The home page reads that file to update the citation count, h-index, publication count and per-paper "Cited by" badges.

Google Scholar sometimes blocks cloud servers. If the job warns that it couldn't refresh, add a free [SerpApi](https://serpapi.com) key as a repository secret named `SERPAPI_KEY` (Settings → Secrets and variables → Actions) and the script will use it as a fallback. Until then the site keeps showing the last good numbers.

Run it locally with `python3 scripts/update_scholar.py`.

## Updating

- **New paper:** add it to `index.html` (copy an `<li class="pub">` block; set `data-type` to `journal`, `conference` or `preprint`, plus `first` if first-authored) and to `cv.html`, then update the filter counts and the "First-author" stat.
- **News:** add an `<li>` at the top of the `news__list` in `index.html`.
- **Regenerate the PDFs** after editing `cv.html` or `teaching.html`. Serve the folder with `python3 -m http.server 8000`, then run:
  ```
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "$CHROME" --headless=new --no-pdf-header-footer --virtual-time-budget=6000 --print-to-pdf=assets/docs/Raj_Patel_CV.pdf http://localhost:8000/cv.html
  "$CHROME" --headless=new --no-pdf-header-footer --virtual-time-budget=6000 --print-to-pdf=assets/docs/Raj_Patel_Teaching_Portfolio.pdf http://localhost:8000/teaching.html
  ```
  Or open either page in Chrome and use Print → Save as PDF.
- **Preview locally:** `python3 -m http.server 8000`, then open http://localhost:8000.
