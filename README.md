# OPTCG Matchup Galaxy

A fan-made star map of One Piece TCG leader matchups. Each leader is a star. Every pair of leaders is joined by two
curved lines: solid for **going 1st** and dashed for **going 2nd**, coloured red → grey → green by win rate.

## Run it
Open `index.html` in a browser. There's no build step or server; D3 loads from cdnjs.

- Hover a leader to light up its matchups.
- Click a leader to bring it to the centre, with opponents orbiting it, best matchup at the top and worse ones clockwise.
- Click an opponent or a line to see the matchup details and write notes.
- Esc or a click on empty space resets the view. Drag to pan, scroll to zoom.

## Data
All data lives in `data/current.js` (`window.GALAXY_DATA = {...}`). It's a JS file rather than JSON so the page also
works when opened straight from disk.

Each matchup is stored once, from leader `a`'s perspective:

```json
{ "a": "bg-luffy", "b": "p-enel",
  "first":  { "wr": 0.56, "games": 412 },
  "second": { "wr": 0.49, "games": 398 },
  "notes": "" }
```

`first` is a's win rate when a goes 1st. `b`'s numbers are derived from it (b going 1st = 1 − a's `second`).

Real numbers come from Card Kaizoku and live in `tools/real_data.py`; `python3 tools/build_data.py` turns them into
`data/current.js`, warns if a matchup disagrees between the two leaders' pages, and version-stamps `index.html`.

## Refreshing the data
1. On cardkaizoku.com, open each of the 12 leaders' stats pages with the same period selected.
2. Click "Show More" until the matchup grid is complete, then save the page (Ctrl+S) into Downloads.
3. `python3 tools/import_page.py --write YYYY-MM-DD ~/Downloads/*Kaizoku*.html` (refuses if anything is missing).
4. `python3 tools/build_data.py`, check the site locally, then commit and push. GitHub Pages updates in about a minute.

## Hosting
Live on GitHub Pages: https://tamagogoesgogo.github.io/optcg-galaxy/ — every push to `main` redeploys.
