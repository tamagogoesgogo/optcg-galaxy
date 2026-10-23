"""Read Card Kaizoku leader pages saved from the browser (Ctrl+S) and print their numbers in real_data.py format.

Usage:
  python3 tools/import_page.py page.html [more.html ...]           show what each page contains
  python3 tools/import_page.py --write YYYY-MM-DD page1.html ...   replace real_data.py with the 12 pages (full refresh)

Only matchups against the 12 leaders on the map are kept; everything else is listed as skipped. The page only contains
the matchups that were visible when it was saved, so press "Show More" until the grid is complete before saving.
"""
import html
import re
import sys
from pathlib import Path

# the 12 leaders on the map, read from build_data.py's list (importing it would rebuild the site)
OURS = dict(re.findall(r'\("([A-Z0-9]+-\d+)", "([^"]+)", \[', (Path(__file__).parent / 'build_data.py').read_text()))


def pct(s):
    s = s.strip().rstrip('%')
    return None if s in ('', '-') else round(float(s) / 100, 4)


def num(s):
    s = s.strip().replace(',', '')
    return None if s in ('', '-') else int(s)


def parse(path):
    text = Path(path).expanduser().read_text(encoding='utf-8', errors='replace')
    code = re.search(r'<h2>\[([A-Z0-9]+-\d+)\]', text)
    if not code:
        sys.exit(f'{path}: not a Card Kaizoku leader stats page (no "[CODE] Name" heading)')
    code = code.group(1)
    period = re.search(r'<option value="([^"]+)" selected="selected">([^<]+)</option>', text)
    stats = dict(re.findall(r'<div class="stat-box"><label>([^<]+)</label><span>([^<]+)</span>', text))

    # the desktop grid: one column pair per opponent, rows WR / 1st / 2nd
    a = text.find('stats-matchups-desktop')
    b = text.find('stats-matchups-mobile', a)
    grid = text[a:b]
    opps = re.findall(r'View matchup against ([A-Z0-9]+-\d+)', grid)
    rows = {}
    for label, body in re.findall(r'<td class="matchup-label-col">(WR|1st|2nd)</td>(.*?)</tr>', grid, re.S):
        cells = [html.unescape(c) for c in re.findall(r'<td class="matchup-data[^"]*"[^>]*>([^<]*)</td>', body)]
        rows[label] = [(cells[i], cells[i + 1]) for i in range(0, len(cells), 2)]
    more = re.search(r'Show More \((\d+) remaining\)', grid)
    return code, period, stats, opps, rows, more


def render(pages, date):
    """real_data.py for a full refresh: every leader's summary, mirror and matchups, all from one set of pages."""
    stats, mirrors, matchups = [], [], []
    for code, period, st, opps, rows, _ in pages:
        me = code.lower()
        stats.append(f'    "{me}": {{"wtd": {pct(st["Wtd Win Rate"])}, "raw": {pct(st["Raw Win Rate"])}, '
                     f'"first": {pct(st["1st Winrate"])}, "second": {pct(st["2nd Winrate"])}, "games": {num(st["Total Games"])}}},  # {OURS[code]}')
        matchups.append(f'    # {OURS[code]}')
        for i, opp in enumerate(opps):
            if opp not in OURS:
                continue
            (f, fg), (s2, sg) = rows['1st'][i], rows['2nd'][i]
            vals = f'({pct(f)}, {num(fg)}, {pct(s2)}, {num(sg)})'
            if opp == code:
                mirrors.append(f'    "{me}": {vals},  # {OURS[code]}')
            else:
                matchups.append(f'    ("{me}", "{opp.lower()}"): {vals},  # {OURS[opp]}')
    period = pages[0][1]
    return f'''"""Real numbers from Card Kaizoku leader pages, imported with tools/import_page.py. build_data.py turns them into the site data.

Period: {period.group(2) if period else "?"}. MATCHUPS are keyed (me, opponent) and seen from `me`'s side:
(win rate going 1st, games going 1st, win rate going 2nd, games going 2nd). Card Kaizoku shows whole percentages.
"""

# Date shown in the site header ("data from ...").
UPDATED = "{date}"

# Leader page summary boxes: weighted WR, raw WR, 1st WR, 2nd WR, total games.
LEADER_STATS = {{
{chr(10).join(stats)}
}}

# Mirror matches: (win rate going 1st, games, win rate going 2nd, games).
MIRRORS = {{
{chr(10).join(mirrors)}
}}

MATCHUPS = {{
{chr(10).join(matchups)}
}}
'''


def write(date, paths):
    pages = [parse(p) for p in paths]
    codes = [p[0] for p in pages]
    problems = [f'{c} is not on the map' for c in codes if c not in OURS]
    problems += [f'no page for {OURS[c]} [{c}]' for c in OURS if c not in codes]
    problems += [f'two pages for {c}' for c in set(codes) if codes.count(c) > 1]
    for code, period, st, opps, rows, more in pages:
        missing = [OURS[c] for c in OURS if c not in opps]
        if missing:
            problems.append(f'{OURS.get(code, code)}: page lacks {", ".join(missing)} (press "Show More" before saving)')
    periods = {p[1].group(1) if p[1] else None for p in pages}
    if len(periods) > 1:
        problems.append(f'pages are from different periods: {", ".join(map(str, periods))}')
    if problems:
        sys.exit('Not writing anything:\n  ' + '\n  '.join(problems))
    out = Path(__file__).parent / 'real_data.py'
    out.write_text(render(pages, date))
    print(f'wrote {out} from {len(pages)} pages ({pages[0][1].group(2)}), data date {date}')


def main():
    if sys.argv[1:2] == ['--write']:
        return write(sys.argv[2], sys.argv[3:])
    for path in sys.argv[1:]:
        code, period, stats, opps, rows, more = parse(path)
        me = code.lower()
        print(f'# {OURS.get(code, code)} [{code}] — period: {period.group(2) if period else "?"} ({period.group(1) if period else "?"})')
        if code not in OURS:
            print('#   (not one of the 12 leaders on the map)')
        print(f'    "{me}": {{"wtd": {pct(stats["Wtd Win Rate"])}, "raw": {pct(stats["Raw Win Rate"])}, '
              f'"first": {pct(stats["1st Winrate"])}, "second": {pct(stats["2nd Winrate"])}, '
              f'"games": {num(stats["Total Games"])}}},  # play rate {stats.get("Play Rate", "?")}')
        found, skipped = set(), []
        for i, opp in enumerate(opps):
            if opp not in OURS:
                skipped.append(opp)
                continue
            (f, fg), (s, sg) = rows['1st'][i], rows['2nd'][i]
            vals = f'({pct(f)}, {num(fg)}, {pct(s)}, {num(sg)})'
            if opp == code:
                print(f'    mirror "{me}": {vals},')
            else:
                print(f'    ("{me}", "{opp.lower()}"): {vals},  # {OURS[opp]}')
            found.add(opp)
        missing = [OURS[c] for c in OURS if c not in found]
        print(f'#   skipped (not on the map): {", ".join(skipped) or "none"}')
        if missing:
            print(f'#   MISSING: {", ".join(missing)}'
                  + (f' — the page was saved with {more.group(1)} matchups still hidden behind "Show More"' if more else ''))
        print()


if __name__ == '__main__':
    main()
