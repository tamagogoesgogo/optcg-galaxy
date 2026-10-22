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

Real numbers are typed in from Card Kaizoku screenshots into `tools/real_data.py`. Run `python3 tools/build_data.py`
to rebuild `data/current.js`: pairs without real data get placeholder numbers, flagged `"real": false`, which the page
shows as grey "no data yet" lines.

## Hosting
The site is static, so GitHub Pages or Cloudflare Pages can host it for free (`*.github.io` / `*.pages.dev`).
