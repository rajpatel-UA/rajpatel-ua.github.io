#!/usr/bin/env python3
"""Refresh assets/data/scholar.json from a Google Scholar profile.

Google Scholar has no official API, so this reads the public profile page.
If that request is blocked (Scholar sometimes rate-limits cloud IPs) and a
SERPAPI_KEY environment variable is set, it falls back to SerpApi's
google_scholar_author endpoint. If both fail, the existing JSON is left
untouched so the site keeps showing the last good numbers.

Standard library only, so the GitHub Action needs no pip install.
"""

import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

SCHOLAR_ID = "2qoIGecAAAAJ"
OUT = Path(__file__).resolve().parent.parent / "assets" / "data" / "scholar.json"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "replace")


def clean(text):
    return html.unescape(re.sub(r"<[^>]+>", "", text)).strip()


def from_scholar():
    page = get(f"https://scholar.google.com/citations?user={SCHOLAR_ID}&hl=en&cstart=0&pagesize=100")
    # Stats table: citations (all, since), h-index (all, since), i10-index (all, since).
    stats = [int(v) for v in re.findall(r'<td class="gsc_rsb_std">(\d+)</td>', page)]
    if len(stats) < 6:
        raise ValueError("stats table not found (blocked or layout changed)")

    papers = []
    for row in re.findall(r'<tr class="gsc_a_tr">(.*?)</tr>', page, re.S):
        title = re.search(r'class="gsc_a_at"[^>]*>(.*?)</a>', row, re.S)
        cites = re.search(r'class="gsc_a_ac[^"]*"[^>]*>(\d*)</a>', row)
        year = re.search(r'class="gsc_a_h gsc_a_hc[^"]*"[^>]*>(\d*)</span>', row)
        if title:
            papers.append({
                "title": clean(title.group(1)),
                "year": int(year.group(1)) if year and year.group(1) else None,
                "citations": int(cites.group(1)) if cites and cites.group(1) else 0,
            })
    return {"citations": stats[0], "h_index": stats[2], "i10_index": stats[4], "papers": papers}


def from_serpapi(key):
    q = urllib.parse.urlencode({"engine": "google_scholar_author", "author_id": SCHOLAR_ID,
                                "hl": "en", "num": 100, "api_key": key})
    data = json.loads(get(f"https://serpapi.com/search.json?{q}"))
    table = {k: v["all"] for row in data["cited_by"]["table"] for k, v in row.items()}
    papers = [{
        "title": a["title"],
        "year": int(a["year"]) if a.get("year") else None,
        "citations": (a.get("cited_by") or {}).get("value") or 0,
    } for a in data.get("articles", [])]
    return {"citations": table["citations"], "h_index": table["h_index"],
            "i10_index": table["i10_index"], "papers": papers}


def main():
    result, errors = None, []
    try:
        result = from_scholar()
    except Exception as exc:  # noqa: BLE001 - any failure means "try the fallback"
        errors.append(f"scholar: {exc}")
        key = os.environ.get("SERPAPI_KEY")
        if key:
            try:
                result = from_serpapi(key)
            except Exception as exc2:  # noqa: BLE001
                errors.append(f"serpapi: {exc2}")

    if not result or not result["papers"]:
        print("::warning::Could not refresh Google Scholar data; keeping previous file. " + "; ".join(errors))
        return 0

    payload = {
        "profile": f"https://scholar.google.com/citations?user={SCHOLAR_ID}",
        "updated": date.today().isoformat(),
        "citations": result["citations"],
        "h_index": result["h_index"],
        "i10_index": result["i10_index"],
        "publications": len(result["papers"]),
        "papers": sorted(result["papers"], key=lambda p: (-(p["year"] or 0), p["title"])),
    }

    # Only rewrite the file when the numbers change, so the weekly job doesn't commit a date bump.
    if OUT.exists():
        old = json.loads(OUT.read_text())
        if {k: v for k, v in old.items() if k != "updated"} == {k: v for k, v in payload.items() if k != "updated"}:
            print("Google Scholar data unchanged.")
            return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"Updated {OUT.name}: {payload['citations']} citations, h-index {payload['h_index']}, "
          f"{payload['publications']} publications.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
