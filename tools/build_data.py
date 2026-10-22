"""Build data/current.js: real matchups from real_data.py, placeholder (fake) numbers for every pair not entered yet."""
import hashlib
import itertools
import json
import re
import random
from pathlib import Path

from real_data import LEADER_STATS, MIRRORS, MATCHUPS as REAL

random.seed(16)

# Top 12 leaders from Card Kaizoku (screenshot, 2026-10-22): (code, short name, colors, play rate, weighted WR).
# Play rate sets star size; weighted WR only nudges the placeholder matchup numbers so they look plausible.
LEADERS = [
    ("OP17-039", "Xebec", ["blue"], 0.0859, 0.5702),
    ("OP05-098", "Enel (OP05)", ["yellow"], 0.0205, 0.5620),
    ("OP13-001", "Luffy (OP13)", ["red", "green"], 0.0261, 0.5579),
    ("ST30-001", "Luffy & Ace", ["red", "green"], 0.0278, 0.5438),
    ("OP14-001", "Law", ["red"], 0.0654, 0.5286),
    ("OP09-042", "Buggy", ["blue"], 0.1236, 0.5270),
    ("OP13-004", "Sabo", ["red", "black"], 0.0598, 0.5213),
    ("EB05-010", "Robin (EB05)", ["green", "yellow"], 0.0587, 0.5088),
    ("OP17-058", "Kaido", ["purple"], 0.0370, 0.5088),
    ("OP09-062", "Robin (OP09)", ["purple", "yellow"], 0.0108, 0.5001),
    ("OP12-061", "Rosinante", ["purple", "yellow"], 0.0272, 0.4994),
    ("OP15-058", "Enel (OP15)", ["purple"], 0.0230, 0.4967),
]
LEADERS = [(code.lower(), name, colors, share, (wr - 0.5) * 10, code) for code, name, colors, share, wr in LEADERS]


def clamp(x):
    return round(min(0.8, max(0.2, x)), 3)


def check_both_sides():
    """When both leaders' pages were entered, they describe the same games: warn if they disagree."""
    for (a, b), (f, fg, s, sg) in REAL.items():
        if (b, a) in REAL and a < b:
            bf, bfg, bs, bsg = REAL[(b, a)]
            # b going 1st is a going 2nd; allow a point of rounding
            if bfg != sg or bsg != fg or abs(bf - (1 - s)) > 0.011 or abs(bs - (1 - f)) > 0.011:
                print(f"WARNING: {a} vs {b} differs between the two pages: {REAL[(a, b)]} vs {REAL[(b, a)]}")


check_both_sides()


def real(a, b):
    """The entered matchup for a vs b, from a's side, or None. b's view flips it: b going 1st = a going 2nd."""
    if (a, b) in REAL:
        f, fg, s, sg = REAL[(a, b)]
        return {"wr": f, "games": fg}, {"wr": s, "games": sg}
    if (b, a) in REAL:
        f, fg, s, sg = REAL[(b, a)]
        return {"wr": round(1 - s, 4), "games": sg}, {"wr": round(1 - f, 4), "games": fg}
    return None


matchups = []
for (a, _, _, sa_share, sa, _), (b, _, _, sb_share, sb, _) in itertools.combinations(LEADERS, 2):
    # placeholder numbers are drawn for every pair (even real ones) so they stay stable as real data is added
    edge = (sa - sb) * 0.09
    tempo = random.uniform(-0.02, 0.08)  # most decks like going 1st a bit
    games = int(1200 * (sa_share + sb_share) * random.uniform(0.6, 1.2))
    matchups.append({
        "a": a,
        "b": b,
        "first": {"wr": clamp(0.5 + edge + tempo + random.gauss(0, 0.03)), "games": games // 2 + random.randint(-15, 15)},
        "second": {"wr": clamp(0.5 + edge - tempo + random.gauss(0, 0.03)), "games": games // 2 + random.randint(-15, 15)},
        "notes": "",
        "real": False,
    })
    r = real(a, b)
    if r:
        matchups[-1].update(first=r[0], second=r[1], real=True)

# mirrors are stored like any matchup with a == b; the page shows them in the panel, not as lines
mirrors = [{"a": i, "b": i, "first": {"wr": f, "games": fg}, "second": {"wr": w2, "games": sg}, "notes": "", "real": True}
           for i, (f, fg, w2, sg) in MIRRORS.items()]

n_real = sum(m["real"] for m in matchups)
data = {
    "sample": n_real < len(matchups),
    "scope": "The 12 most popular leaders",
    "updated": "2026-10-22",
    "source": "Card Kaizoku",
    "queue": "private lobbies, spoiler queue",
    "leaders": [{"id": i, "code": code, "name": n, "colors": c, "share": s, "img": f"img/{i}.jpg", "stats": LEADER_STATS.get(i)} for i, n, c, s, _, code in LEADERS],
    "matchups": matchups + mirrors,
}

out = Path(__file__).resolve().parent.parent / "data" / "current.js"
out.parent.mkdir(exist_ok=True)
out.write_text("window.GALAXY_DATA = " + json.dumps(data, indent=1) + ";\n")
# Version-stamp the files index.html loads (?v=<content hash>). Browsers may cache them for a while, and a new page
# must never run with an old cached script; the stamp changes whenever a file does, so they always match.
root = out.parent.parent
index = root / "index.html"
html = index.read_text()
for name in ("style.css", "app.js", "data/current.js"):
    v = hashlib.sha1((root / name).read_bytes()).hexdigest()[:8]
    html = re.sub(rf'(["\']){re.escape(name)}(\?v=\w+)?\1', rf'\g<1>{name}?v={v}\g<1>', html)
index.write_text(html)

print(f"wrote {out} ({len(LEADERS)} leaders, {n_real}/{len(matchups)} matchups real, {len(mirrors)} mirrors)")
