"""Real numbers typed in from Card Kaizoku screenshots. build_data.py merges these over the placeholder data.

MATCHUPS are keyed (me, opponent) and seen from `me`'s side: (win rate going 1st, games going 1st,
win rate going 2nd, games going 2nd). Card Kaizoku shows whole percentages, so that's the precision here.
"""

# Leader page summary boxes: weighted WR, raw WR, 1st WR, 2nd WR, total games.
LEADER_STATS = {
    # 2026-10-22
    "op14-001": {"wtd": 0.5286, "raw": 0.5350, "first": 0.5839, "second": 0.4560, "games": 5596},
    "op17-039": {"wtd": 0.5702, "raw": 0.5766, "first": 0.5901, "second": 0.5660, "games": 7348},
    "op09-042": {"wtd": 0.5270, "raw": 0.5304, "first": 0.5902, "second": 0.4480, "games": 10575},
    "op13-004": {"wtd": 0.5213, "raw": 0.5279, "first": 0.5133, "second": 0.5400, "games": 5118},
    "eb05-010": {"wtd": 0.5088, "raw": 0.5149, "first": 0.5035, "second": 0.5240, "games": 5026},
}

# Mirror matches: (win rate going 1st, games, win rate going 2nd, games). Both sides are the same leader, so the
# two win rates add up to 100%; the split shows how much turn order matters in the mirror.
MIRRORS = {
    "op14-001": (0.64, 145, 0.36, 145),  # Law, 2026-10-22
    "op17-039": (0.46, 291, 0.54, 291),  # Xebec, 2026-10-22
    "op09-042": (0.65, 552, 0.35, 552),  # Buggy, 2026-10-22
    "op13-004": (0.34, 135, 0.66, 135),  # Sabo, 2026-10-22
    "eb05-010": (0.46, 123, 0.54, 123),  # Robin (EB05), 2026-10-22
}

MATCHUPS = {
    # Law, 2026-10-22. Skipped (not in our 12): Shirahoshi, Sugar, Hancock, Moria, Shanks, Crocodile,
    # Yamato, Rayleigh, Newgate, Pudding, Nami, Kuzan, Linlin, Doflamingo, and the red/purple, black and green/blue Luffys.
    ("op14-001", "op09-042"): (0.71, 363, 0.49, 381),  # Buggy
    ("op14-001", "op17-039"): (0.37, 317, 0.23, 160),  # Xebec
    ("op14-001", "op13-004"): (0.71, 242, 0.56, 133),  # Sabo
    ("op14-001", "eb05-010"): (0.47, 214, 0.38, 98),  # Robin (EB05)
    ("op14-001", "op17-058"): (0.61, 127, 0.32, 135),  # Kaido
    ("op14-001", "st30-001"): (0.66, 91, 0.47, 53),  # Luffy & Ace
    ("op14-001", "op12-061"): (0.57, 77, 0.36, 77),  # Rosinante
    ("op14-001", "op13-001"): (0.47, 93, 0.28, 46),  # Luffy (OP13)
    ("op14-001", "op15-058"): (0.52, 89, 0.26, 73),  # Enel (OP15)
    ("op14-001", "op05-098"): (0.20, 92, 0.22, 27),  # Enel (OP05)
    ("op14-001", "op09-062"): (0.59, 22, 0.31, 26),  # Robin (OP09)
    # Xebec, 2026-10-22. Skipped: same list as Law.
    ("op17-039", "op09-042"): (0.61, 410, 0.46, 628),  # Buggy
    ("op17-039", "op14-001"): (0.77, 160, 0.63, 317),  # Law (same games as Law's page, seen from Xebec)
    ("op17-039", "op13-004"): (0.62, 204, 0.63, 207),  # Sabo
    ("op17-039", "eb05-010"): (0.66, 202, 0.53, 212),  # Robin (EB05)
    ("op17-039", "op17-058"): (0.59, 138, 0.42, 163),  # Kaido
    ("op17-039", "st30-001"): (0.56, 108, 0.49, 177),  # Luffy & Ace
    ("op17-039", "op12-061"): (0.40, 129, 0.50, 141),  # Rosinante
    ("op17-039", "op13-001"): (0.63, 113, 0.65, 105),  # Luffy (OP13)
    ("op17-039", "op15-058"): (0.65, 80, 0.43, 132),  # Enel (OP15)
    ("op17-039", "op05-098"): (0.40, 101, 0.60, 89),  # Enel (OP05)
    ("op17-039", "op09-062"): (0.39, 31, 0.41, 39),  # Robin (OP09)
    # Buggy, 2026-10-22. Skipped: same list as Law.
    ("op09-042", "op17-039"): (0.54, 628, 0.39, 410),  # Xebec
    ("op09-042", "op14-001"): (0.51, 381, 0.29, 363),  # Law
    ("op09-042", "op13-004"): (0.52, 421, 0.45, 233),  # Sabo
    ("op09-042", "eb05-010"): (0.50, 415, 0.41, 217),  # Robin (EB05)
    ("op09-042", "op17-058"): (0.90, 183, 0.64, 216),  # Kaido
    ("op09-042", "st30-001"): (0.45, 207, 0.27, 147),  # Luffy & Ace
    ("op09-042", "op12-061"): (0.69, 172, 0.54, 164),  # Rosinante
    ("op09-042", "op13-001"): (0.52, 186, 0.34, 166),  # Luffy (OP13)
    ("op09-042", "op15-058"): (0.57, 138, 0.38, 121),  # Enel (OP15)
    ("op09-042", "op05-098"): (0.73, 128, 0.71, 58),  # Enel (OP05)
    ("op09-042", "op09-062"): (0.74, 58, 0.45, 55),  # Robin (OP09)
    # Sabo, 2026-10-22. Skipped: same list as Law.
    ("op13-004", "op09-042"): (0.55, 233, 0.48, 421),  # Buggy
    ("op13-004", "op17-039"): (0.37, 207, 0.38, 204),  # Xebec
    ("op13-004", "op14-001"): (0.44, 133, 0.29, 242),  # Law
    ("op13-004", "eb05-010"): (0.66, 142, 0.60, 166),  # Robin (EB05)
    ("op13-004", "op17-058"): (0.45, 85, 0.41, 126),  # Kaido
    ("op13-004", "st30-001"): (0.59, 76, 0.71, 63),  # Luffy & Ace
    ("op13-004", "op12-061"): (0.51, 55, 0.47, 73),  # Rosinante
    ("op13-004", "op13-001"): (0.43, 58, 0.38, 64),  # Luffy (OP13)
    ("op13-004", "op15-058"): (0.50, 42, 0.44, 61),  # Enel (OP15)
    ("op13-004", "op05-098"): (0.43, 60, 0.50, 64),  # Enel (OP05)
    ("op13-004", "op09-062"): (0.52, 21, 0.51, 41),  # Robin (OP09)
    # Robin (EB05), 2026-10-22. Skipped: same list as Law.
    ("eb05-010", "op09-042"): (0.59, 217, 0.50, 415),  # Buggy
    ("eb05-010", "op17-039"): (0.47, 212, 0.34, 202),  # Xebec
    ("eb05-010", "op14-001"): (0.62, 98, 0.53, 214),  # Law
    ("eb05-010", "op13-004"): (0.40, 166, 0.34, 142),  # Sabo
    ("eb05-010", "op17-058"): (0.50, 62, 0.49, 113),  # Kaido
    ("eb05-010", "st30-001"): (0.28, 68, 0.41, 73),  # Luffy & Ace
    ("eb05-010", "op12-061"): (0.62, 47, 0.51, 94),  # Rosinante
    ("eb05-010", "op13-001"): (0.34, 61, 0.18, 68),  # Luffy (OP13)
    ("eb05-010", "op15-058"): (0.57, 53, 0.72, 72),  # Enel (OP15)
    ("eb05-010", "op05-098"): (0.41, 51, 0.57, 35),  # Enel (OP05)
    ("eb05-010", "op09-062"): (0.53, 17, 0.66, 35),  # Robin (OP09)
}
