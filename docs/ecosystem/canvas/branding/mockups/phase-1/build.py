#!/usr/bin/env python3
"""Render Main.dc.html (dark) and CanvasLight.dc.html (light) from one template, plus Landing.dc.html."""

DARK = dict(
    name="dark", bg="gimbal-blur-dark.jpg", ground="#121512", overlay="rgba(18,21,18,0.55)",
    glass="rgba(37,44,31,0.55)", glass2="rgba(37,44,31,0.75)", border="rgba(201,163,94,0.25)",
    text="#e9e4d8", muted="#8a8f86", accent="#c9a35e", glow="#f0cf8a", sky="#98b3cd", meadow="#6b8a4a",
    ember="#d98a5a", card="#1b201a", cardBorder="rgba(233,228,216,0.08)", frame="rgba(201,163,94,0.06)",
    input="rgba(18,21,18,0.5)", shadow="0 10px 30px rgba(0,0,0,0.35)", chip="rgba(233,228,216,0.06)",
    thumb1="#2a3324", thumb2="#3f4a36",
)
LIGHT = dict(
    name="light", bg="gimbal-blur-light.jpg", ground="#e9eef3", overlay="rgba(233,238,243,0.55)",
    glass="rgba(255,255,255,0.55)", glass2="rgba(255,255,255,0.75)", border="rgba(138,106,52,0.25)",
    text="#1e2420", muted="#5e6560", accent="#8a6a34", glow="#a8823f", sky="#5f83a8", meadow="#4f6a3a",
    ember="#b8683a", card="#fbfaf7", cardBorder="rgba(30,36,32,0.08)", frame="rgba(138,106,52,0.07)",
    input="rgba(255,255,255,0.6)", shadow="0 10px 30px rgba(30,36,32,0.12)", chip="rgba(30,36,32,0.05)",
    thumb1="#d8dfe6", thumb2="#c3ccd4",
)

HEAD = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&amp;family=Instrument+Serif:ital@0;1&amp;display=swap">
  <style>
    body { margin: 0; font-family: Manrope, "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: {accent}; } a:hover { color: {glow}; }
    * { box-sizing: border-box; }
  </style>
</helmet>
"""

def icon(name, color, size=16):
    p = {
        "stmt": '<circle cx="12" cy="12" r="8"></circle><path d="M12 8v4l3 2"></path>',
        "cand": '<path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"></path>',
        "kb": '<path d="M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z"></path><path d="M20 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"></path>',
        "pdf": '<path d="M6 3h8l5 5v13H6z"></path><path d="M14 3v5h5"></path><path d="M9 14h6M9 17h6"></path>',
        "note": '<path d="M5 4h14v11l-5 5H5z"></path><path d="M14 20v-5h5"></path>',
        "url": '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"></path><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"></path>',
        "tab": '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 9h18"></path>',
        "dyn": '<circle cx="6" cy="6" r="2"></circle><circle cx="18" cy="8" r="2"></circle><circle cx="10" cy="18" r="2"></circle><path d="M7.5 7.2l8.6 .6M7 8l2.5 8M16.5 9.6l-5 7"></path>',
        "search": '<circle cx="11" cy="11" r="6"></circle><path d="M20 20l-4.5-4.5"></path>',
        "sun": '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>',
        "inbox": '<path d="M4 4h16v16H4z"></path><path d="M4 14h4l2 3h4l2-3h4"></path>',
        "plus": '<path d="M12 5v14M5 12h14"></path>',
        "chev": '<path d="M9 6l6 6-6 6"></path>',
        "link": '<path d="M9 12h6"></path><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="12" r="2.5"></circle>',
        "gimbal": '<circle cx="12" cy="12" r="9"></circle><ellipse cx="12" cy="12" rx="9" ry="3.5"></ellipse><circle cx="12" cy="12" r="3"></circle>',
        "zoomin": '<path d="M12 5v14M5 12h14"></path>',
        "zoomout": '<path d="M5 12h14"></path>',
        "fit": '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"></path>',
        "sweep": '<path d="M4 20l6-6"></path><path d="M14 4l6 6-8 8-6-6z"></path>',
        "revise": '<path d="M4 20h4l10-10-4-4L4 16z"></path><path d="M13 7l4 4"></path>',
        "open": '<path d="M14 4h6v6"></path><path d="M20 4l-9 9"></path><path d="M19 14v6H4V5h6"></path>',
        "home": '<path d="M4 11l8-7 8 7"></path><path d="M6 10v10h12V10"></path>',
        "tags": '<path d="M4 4h7l9 9-7 7-9-9z"></path><circle cx="8" cy="8" r="1.5"></circle>',
        "analysis": '<path d="M4 20V4"></path><path d="M4 20h16"></path><path d="M8 14l4-5 3 3 5-6"></path>',
        "settings": '<circle cx="12" cy="12" r="3"></circle><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"></path>',
        "help": '<circle cx="12" cy="12" r="9"></circle><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"></path><path d="M12 17h.01"></path>',
        "undo": '<path d="M9 14L4 9l5-5"></path><path d="M4 9h9a6 6 0 0 1 0 12H8"></path>',
        "redo": '<path d="M15 14l5-5-5-5"></path><path d="M20 9h-9a6 6 0 0 0 0 12h5"></path>',
        "frame": '<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 3"></rect>',
        "media": '<rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="9" cy="10" r="1.5"></circle><path d="M21 16l-5-5-8 8"></path>',
        "entity": '<path d="M6 3h9l4 4v14H6z"></path><path d="M9 12h6M9 16h6"></path>',
        "reset": '<path d="M4 12a8 8 0 1 0 2.3-5.7"></path><path d="M4 4v5h5"></path>',
        "arrange": '<rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect>',
        "shimmer": '<path d="M3 12c3-4 6-4 9 0s6 4 9 0"></path><path d="M3 7c3-4 6-4 9 0s6 4 9 0" opacity="0.5"></path><path d="M3 17c3-4 6-4 9 0s6 4 9 0" opacity="0.5"></path>',
        "back": '<path d="M15 6l-6 6 6 6"></path>',
    }[name]
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
            f'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{p}</svg>')

def chip(text, t, color=None):
    color = color or t["muted"]
    return (f'<span style="display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; '
            f'font-size: 11px; font-weight: 500; color: {color}; background: {t["chip"]}; border: 1px solid {t["cardBorder"]}">{text}</span>')

def status_dot(color):
    return f'<span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: {color}"></span>'

def card(t, x, y, w, kind, cid, title, body, tags, status_color, selected=False, thumb=False, h=None, portal=None):
    ring = f"0 0 0 2px {t['accent']}, {t['shadow']}" if selected else t["shadow"]
    handles = ""
    if selected:
        dot = f'width: 9px; height: 9px; border-radius: 50%; background: {t["card"]}; border: 2px solid {t["accent"]}; position: absolute'
        handles = (f'<span style="{dot}; left: 50%; top: -5px; transform: translateX(-50%)"></span>'
                   f'<span style="{dot}; left: 50%; bottom: -5px; transform: translateX(-50%)"></span>'
                   f'<span style="{dot}; top: 50%; left: -5px; transform: translateY(-50%)"></span>'
                   f'<span style="{dot}; top: 50%; right: -5px; transform: translateY(-50%)"></span>')
    portalhtml = ""
    if portal:
        portalhtml = (f'<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: {t["sky"]}">{icon("shimmer", t["sky"], 13)}{portal}</span>')
    hh = f"height: {h}px; " if h else ""
    tagshtml = "".join(chip(g, t) for g in tags)
    thumbhtml = ""
    if thumb:
        thumbhtml = (f'<div style="height: 96px; margin: -12px -14px 10px; background: linear-gradient(135deg, {t["thumb1"]}, {t["thumb2"]}); '
                     f'border-bottom: 1px solid {t["cardBorder"]}; display: flex; align-items: flex-end; padding: 8px 14px; gap: 6px">'
                     f'<span style="font-size: 10px; color: {t["muted"]}">p. 1 of 12</span></div>')
    return f'''
    <div style="position: absolute; left: {x}px; top: {y}px; width: {w}px; {hh}">{handles}
    <div style="background: {t["card"]}; border: 1px solid {t["cardBorder"]}; border-radius: 12px; padding: 12px 14px 12px; box-shadow: {ring}; display: flex; flex-direction: column; gap: 8px; overflow: hidden; {hh}">
      {thumbhtml}
      <div style="display: flex; align-items: center; gap: 8px">
        {icon(kind, t["muted"])}
        <span style="font-size: 11px; font-weight: 600; letter-spacing: 0.04em; color: {t["muted"]}">{cid}</span>
        <span style="flex-grow: 1"></span>
        {portalhtml}
        {status_dot(status_color)}
      </div>
      <div style="font-size: 13.5px; font-weight: 600; line-height: 1.3; color: {t["text"]}">{title}</div>
      <div style="font-size: 12px; line-height: 1.45; color: {t["muted"]}">{body}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px">{tagshtml}</div>
    </div>
    </div>'''

def edge(t, x1, y1, x2, y2, kind, label):
    color = {"contradicts": t["ember"], "supports": t["meadow"], "clarifies": t["sky"], "depends-on": t["accent"], "evidence-for": t["glow"]}[kind]
    dash = ' stroke-dasharray="6 5"' if kind == "contradicts" else ""
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    cx, cy = mx, my - 24
    return (f'<path d="M{x1} {y1} Q{cx} {cy} {x2} {y2}" stroke="{color}" stroke-width="1.8" fill="none"{dash} marker-end="url(#arr-{kind})"></path>'
            f'<rect x="{mx-34}" y="{my-21}" width="68" height="18" rx="9" fill="{t["card"]}" stroke="{color}" stroke-width="1"></rect>'
            f'<text x="{mx}" y="{my-8.5}" text-anchor="middle" font-family="Manrope, sans-serif" font-size="10" font-weight="600" fill="{color}">{label}</text>')

def canvas_page(t):
    tabs = [("Origin mythology", "tab", True), ("Place 3 map", "dyn", False), ("Whisp craft", "tab", False)]
    tabhtml = ""
    for name, k, active in tabs:
        bg = t["glass2"] if active else "transparent"
        col = t["text"] if active else t["muted"]
        bd = f"1px solid {t['border']}" if active else "1px solid transparent"
        tabhtml += (f'<div style="display: flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px; border-radius: 8px; background: {bg}; border: {bd}; color: {col}; font-size: 12.5px; font-weight: 600">'
                    f'{icon(k, col, 14)}<span>{name}</span></div>')
    tabhtml += f'<div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; color: {t["muted"]}">{icon("plus", t["muted"], 14)}</div>'

    tree = [("Universe", "tab", False, 0, "open"),
            ("Origin mythology", "tab", True, 1, None),
            ("Beings", "tab", False, 1, "open"),
            ("Whisp craft", "tab", False, 2, None),
            ("Mist and Shadow", "tab", False, 2, None),
            ("Cord and branches", "tab", False, 2, None),
            ("Places", "tab", False, 1, "closed"),
            ("Narrative", "tab", False, 1, "closed"),
            ("Place 3 map", "dyn", False, 0, None),
            ("Thinkers by theme", "dyn", False, 0, None),
            ("Inbox", "inbox", False, 0, None)]
    tabtree = ""
    for name, k, active, depth, fold in tree:
        col = t["text"] if active else t["muted"]
        bg = f'background: {t["chip"]};' if active else ""
        badge = f'<span style="margin-left: 6px; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; color: {t["sky"]}">DYN</span>' if k == "dyn" else ""
        if fold == "open":
            chev = f'<span style="display: inline-flex; width: 12px; justify-content: center; transform: rotate(90deg)">{icon("chev", t["muted"], 10)}</span>'
        elif fold == "closed":
            chev = f'<span style="display: inline-flex; width: 12px; justify-content: center">{icon("chev", t["muted"], 10)}</span>'
        else:
            chev = '<span style="width: 12px"></span>'
        hovered = (name == "Beings")
        hbg = f'background: {t["chip"]};' if hovered and not active else ""
        plus = f'<span style="margin-left: auto; display: inline-flex">{icon("plus", t["accent"], 12)}</span>' if hovered else ""
        if badge: badge = badge.replace("margin-left: 6px", "margin-left: 6px")
        tabtree += (f'<div style="display: flex; align-items: center; gap: 5px; height: 22px; padding: 0 6px 0 {4 + depth * 12}px; border-radius: 5px; {bg}{hbg} color: {col}; font-size: 12px; font-weight: {600 if active else 500}; min-width: 0">'
                    f'{chev}{icon(k, col, 12)}<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{name}</span>{badge}{plus}</div>')
    drawer_items = [("stmt", "stmt:12", "The world spans a full tonal range", t["accent"]),
                    ("url", "url:1c7e", "Terminal lucidity — Nahm & Greyson", t["muted"])]
    drawer = ""
    for k, cid, title, col in drawer_items:
        drawer += (f'<div style="display: flex; gap: 9px; padding: 9px 10px; border-radius: 9px; border: 1px solid {t["cardBorder"]}; background: {t["chip"]}">'
                   f'<div style="padding-top: 1px">{icon(k, t["muted"], 14)}</div>'
                   f'<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; color: {col}">{cid}</span>'
                   f'<span style="font-size: 12px; line-height: 1.3; color: {t["text"]}">{title}</span></div></div>')

    # canvas content coordinates are relative to the canvas area (starts at x=260, y=56)
    cards = ""
    cards += card(t, 40, 60, 280, "stmt", "stmt:26", "Worlds topology locked: Ordinary World, the Shimmer, the Fringe",
                  "FringeIsland as collective island and safe harbor; per-FIM private places; the Tree and the glowing glass balls.",
                  ["place", "entity/ball", "locked 2026-05-18"], t["accent"], selected=True)
    cards += card(t, 40, 390, 280, "stmt", "stmt:31", "The Fringe is two places — place 2 and place 3 — both behind the one Shimmer",
                  "Supersedes the single-Fringe reading of S26 by addition.", ["place/2", "place/3", "shimmer"], t["accent"], portal="12")
    cards += card(t, 400, 640, 250, "stmt", "stmt:39", "Every FIM has their own Whisp and cord; the ball is what transcendence grants",
                  "", ["entity/whisp/cord"], t["accent"])
    cards += card(t, 390, 66, 210, "kb", "kb:2", "Derek Parfit — The non-fixed self",
                  "Psychological continuity, not identity, is what matters; the Whisp as a future self that need not be the same person.",
                  ["thinker/parfit", "theme/identity"], t["sky"], portal="7")
    cards += f'<div style="position: absolute; left: 634px; top: 46px; font-size: 10.5px; color: {t["muted"]}">reasons-and-persons-III.pdf</div>'
    cards += card(t, 630, 66, 140, "pdf", "pdf:5b02", "Reasons and Persons, Part III (excerpt)",
                  "12 pages, text layer present.", ["raw"], t["muted"], thumb=True)
    cards += card(t, 40, 650, 280, "note", "note:22ac", "Why does the system not know about place 3?",
                  "", ["place/3", "from phone"], t["muted"])
    # frame with candidates
    frame = f'''
    <div style="position: absolute; left: 400px; top: 410px; width: 300px; height: 200px; border-radius: 14px; background: {t["frame"]}; border: 1px dashed {t["border"]}">
      <div style="position: absolute; left: 12px; top: -11px; padding: 2px 8px; border-radius: 6px; background: {t["card"]}; border: 1px solid {t["cardBorder"]}; font-size: 11px; font-weight: 600; color: {t["accent"]}">Sections A–H · candidate</div>
    </div>
    <div style="position: absolute; left: 376px; top: 34px; width: 400px; height: 356px; border-radius: 14px; background: rgba(152,179,205,0.07); border: 1px dashed rgba(152,179,205,0.4)">
      <div style="position: absolute; left: 12px; top: -11px; padding: 2px 8px; border-radius: 6px; background: {t["card"]}; border: 1px solid {t["cardBorder"]}; font-size: 11px; font-weight: 600; color: {t["sky"]}">Parfit and his evidence · group</div>
    </div>'''
    cards += card(t, 412, 432, 136, "cand", "cand:B", "The key/instrument split", "Ball as key; Gimbal as instrument.", [], t["sky"], h=176)
    cards += card(t, 556, 432, 136, "cand", "cand:D", "The ball matures", "Reconcile with S37 before locking.", [], t["sky"], h=176)

    svg = f'''
    <svg style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none" viewBox="0 0 830 844">
      <defs>
        <marker id="arr-contradicts" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{t["ember"]}"></path></marker>
        <marker id="arr-supports" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{t["meadow"]}"></path></marker>
        <marker id="arr-clarifies" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{t["sky"]}"></path></marker>
        <marker id="arr-depends-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{t["accent"]}"></path></marker>
        <marker id="arr-evidence-for" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{t["glow"]}"></path></marker>
      </defs>
      {edge(t, 180, 342, 180, 390, "clarifies", "clarifies")}
      {edge(t, 320, 130, 390, 130, "supports", "supports")}
      {edge(t, 480, 640, 478, 611, "contradicts", "contradicts")}
      {edge(t, 600, 120, 630, 120, "evidence-for", "evidence")}
      {edge(t, 320, 500, 412, 500, "depends-on", "depends on")}
    </svg>'''

    inspector_tags = "".join(chip(g, t, t["accent"]) for g in ["place", "entity/ball", "locked 2026-05-18"])
    links = [("clarified by", "stmt:31", "this tab", t["sky"]), ("supports", "kb:2", "this tab", t["meadow"]),
             ("depends on", "cand:B", "this tab", t["accent"]), ("derived from", "doc:cosmology", "Whisp craft", t["glow"])]
    linkhtml = ""
    for rel, target, where, col in links:
        off = "" if where == "this tab" else f'<span style="margin-left: auto; font-size: 10.5px; color: {t["muted"]}; display: inline-flex; align-items: center; gap: 4px">{icon("chev", t["muted"], 12)}{where}</span>'
        linkhtml += (f'<div style="display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid {t["cardBorder"]}; font-size: 12px">'
                     f'<span style="color: {col}; font-weight: 600; min-width: 84px">{rel}</span><span style="color: {t["text"]}">{target}</span>{off}</div>')

    return HEAD.replace("{accent}", t["accent"]).replace("{glow}", t["glow"]) + f'''
<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; background: {t["ground"]} url(./{t["bg"]}) center / cover no-repeat; color: {t["text"]}">
  <div style="position: absolute; inset: 0; background: {t["overlay"]}"></div>

  <!-- top bar -->
  <div style="position: absolute; left: 12px; right: 12px; top: 12px; height: 48px; display: flex; align-items: center; gap: 14px; padding: 0 14px; border-radius: 14px; background: {t["glass"]}; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid {t["border"]}; box-shadow: {t["shadow"]}">
    <div style="display: flex; align-items: center; gap: 9px; padding-right: 12px; border-right: 1px solid {t["border"]}">
      {icon("gimbal", t["accent"], 20)}
      <span style="font-family: 'Instrument Serif', Georgia, serif; font-size: 19px; letter-spacing: 0.01em; color: {t["text"]}">Discovery Canvas</span>
    </div>
    <div style="display: flex; align-items: center; gap: 6px; padding-right: 10px; border-right: 1px solid {t["border"]}; color: {t["muted"]}; font-size: 12px">{icon("back", t["muted"], 13)}<span>Universe</span><span style="opacity: 0.5">/</span><span style="color: {t["text"]}; font-weight: 600">Origin mythology</span></div>
    <div style="display: flex; align-items: center; gap: 4px">{tabhtml}</div>
    <span style="flex-grow: 1"></span>
    <div style="display: flex; align-items: center; gap: 8px; width: 240px; height: 32px; padding: 0 10px; border-radius: 8px; background: {t["input"]}; border: 1px solid {t["cardBorder"]}; color: {t["muted"]}; font-size: 12px">
      {icon("search", t["muted"], 14)}<span>Search cards, tags, ids</span><span style="margin-left: auto; font-size: 10px; padding: 1px 5px; border-radius: 4px; border: 1px solid {t["cardBorder"]}">Ctrl K</span>
    </div>
    <div style="display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid {t["border"]}; color: {t["accent"]}; font-size: 12px; font-weight: 600">{icon("sweep", t["accent"], 14)}<span>Sweep now</span></div>
    <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: 1px solid {t["cardBorder"]}">{icon("sun", t["muted"], 15)}</div>
  </div>

  <!-- rail -->
  <div style="position: absolute; left: 12px; top: 72px; bottom: 12px; width: 44px; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 0; border-radius: 14px; background: {t["glass"]}; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid {t["border"]}; box-shadow: {t["shadow"]}">
    <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px">{icon("home", t["muted"], 17)}</div>
    <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: {t["glass2"]}; border: 1px solid {t["border"]}">{icon("tab", t["accent"], 17)}</div>
    <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px">{icon("tags", t["muted"], 17)}</div>
    <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px">{icon("analysis", t["muted"], 17)}</div>
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px">{icon("inbox", t["muted"], 17)}<span style="position: absolute; right: 2px; top: 2px; width: 8px; height: 8px; border-radius: 50%; background: {t["accent"]}"></span></div>
    <span style="flex-grow: 1"></span>
    <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px">{icon("settings", t["muted"], 17)}</div>
    <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px">{icon("help", t["muted"], 17)}</div>
  </div>

  <!-- drawer -->
  <div style="position: absolute; left: 64px; top: 72px; bottom: 12px; width: 210px; display: flex; flex-direction: column; gap: 10px; padding: 14px 12px; border-radius: 14px; background: {t["glass"]}; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid {t["border"]}; box-shadow: {t["shadow"]}">
    <div style="display: flex; align-items: center; justify-content: space-between">
      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: {t["muted"]}">Tabs</span>
      {icon("plus", t["muted"], 13)}
    </div>
    <div style="display: flex; flex-direction: column; gap: 1px">{tabtree}</div>
    <div style="height: 1px; background: {t["border"]}; margin: 6px 0"></div>
    <div style="display: flex; align-items: center; justify-content: space-between">
      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: {t["muted"]}">Unplaced</span>
      <span style="font-size: 11px; color: {t["muted"]}">31</span>
    </div>
    {drawer}
    <div style="height: 1px; background: {t["border"]}; margin: 6px 0"></div>
    <div style="display: flex; align-items: center; justify-content: space-between">
      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: {t["muted"]}">Inbox</span>
      <span style="font-size: 11px; font-weight: 700; color: {t["ground"]}; background: {t["accent"]}; border-radius: 999px; padding: 1px 7px">3</span>
    </div>
    <div style="font-size: 12px; color: {t["muted"]}; line-height: 1.45">2 URLs and 1 photo from the phone, targeted at Place 3 map.</div>
  </div>

  <!-- canvas -->
  <div style="position: absolute; left: 286px; top: 56px; width: 830px; height: 844px">
    {frame}
    {cards}
    {svg}
    <div style="position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); display: flex; align-items: center; gap: 2px; height: 44px; padding: 0 8px; border-radius: 12px; background: {t["glass2"]}; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid {t["border"]}; box-shadow: {t["shadow"]}">
      <div style="display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border-radius: 8px; color: {t["text"]}; font-size: 12px; font-weight: 600">{icon("note", t["text"], 15)}<span>Note</span></div>
      <div style="display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border-radius: 8px; color: {t["text"]}; font-size: 12px; font-weight: 600">{icon("entity", t["text"], 15)}<span>Entity</span></div>
      <div style="display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border-radius: 8px; color: {t["text"]}; font-size: 12px; font-weight: 600">{icon("media", t["text"], 15)}<span>Media</span></div>
      <div style="display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border-radius: 8px; color: {t["text"]}; font-size: 12px; font-weight: 600">{icon("frame", t["text"], 15)}<span>Frame</span></div>
      <div style="display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border-radius: 8px; color: {t["text"]}; font-size: 12px; font-weight: 600">{icon("link", t["text"], 15)}<span>Link</span></div>
      <div style="width: 1px; height: 20px; background: {t["border"]}; margin: 0 4px"></div>
      <div style="display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border-radius: 8px; color: {t["accent"]}; font-size: 12px; font-weight: 600">{icon("plus", t["accent"], 15)}<span>Import</span></div>
    </div>
    <div style="position: absolute; right: 12px; top: 16px; display: flex; flex-direction: column; align-items: center; gap: 2px; width: 36px; padding: 6px 0; border-radius: 10px; background: {t["glass2"]}; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid {t["border"]}; box-shadow: {t["shadow"]}">
      <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center">{icon("zoomin", t["muted"], 14)}</div>
      <span style="font-size: 10px; font-weight: 600; color: {t["text"]}">100%</span>
      <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center">{icon("zoomout", t["muted"], 14)}</div>
      <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center">{icon("fit", t["muted"], 14)}</div>
      <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center">{icon("reset", t["muted"], 14)}</div>
      <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 7px; background: {t["chip"]}">{icon("arrange", t["accent"], 14)}</div>
      <div style="width: 20px; height: 1px; background: {t["border"]}; margin: 4px 0"></div>
      <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center">{icon("undo", t["muted"], 14)}</div>
      <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center">{icon("redo", t["muted"], 14)}</div>
    </div>
  </div>

  <!-- inspector -->
  <div style="position: absolute; right: 12px; top: 72px; bottom: 12px; width: 300px; display: flex; flex-direction: column; gap: 12px; padding: 16px 16px; border-radius: 14px; background: {t["glass"]}; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid {t["border"]}; box-shadow: {t["shadow"]}; overflow: hidden">
    <div style="display: flex; align-items: center; gap: 8px">
      {icon("stmt", t["accent"], 16)}
      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: {t["accent"]}">stmt:26</span>
      <span style="flex-grow: 1"></span>
      {chip("locked · rev 1", t, t["accent"])}
    </div>
    <div style="font-family: 'Instrument Serif', Georgia, serif; font-size: 20px; line-height: 1.2; color: {t["text"]}">Worlds topology locked: Ordinary World, the Shimmer, the Fringe (near side and Beyond)</div>
    <div style="font-size: 12px; line-height: 1.5; color: {t["muted"]}">Session 01 · 2026-05-18 · statements/S026.md</div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px">{inspector_tags}<span style="display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; color: {t["muted"]}; border: 1px dashed {t["border"]}">+ tag</span></div>
    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: {t["muted"]}; margin-top: 4px">Links · 4</div>
    <div style="display: flex; flex-direction: column">{linkhtml}</div>
    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: {t["muted"]}; margin-top: 4px">Appears on</div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px">{chip("Origin mythology", t, t["text"])}{chip("Whisp craft", t, t["text"])}</div>
    <span style="flex-grow: 1"></span>
    <div style="display: flex; gap: 8px">
      <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; gap: 7px; height: 36px; border-radius: 9px; border: 1px solid {t["border"]}; font-size: 12.5px; font-weight: 600; color: {t["text"]}">{icon("open", t["text"], 14)}<span>Open source</span></div>
      <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; gap: 7px; height: 36px; border-radius: 9px; background: {t["accent"]}; font-size: 12.5px; font-weight: 700; color: {t["ground"]}">{icon("revise", t["ground"], 14)}<span>Revise</span></div>
    </div>
  </div>
</div>
</x-dc>
</body>
</html>
'''

def landing(t):
    tiles = [("Origin mythology", "tab", "9 cards · 5 links", "edited today"),
             ("Place 3 map", "dyn", "place/3 and not status/locked", "dynamic"),
             ("Whisp craft", "tab", "14 cards · 11 links", "3 days ago"),
             ("Inbox", "inbox", "3 captures waiting", "from phone")]
    tilehtml = ""
    for name, k, meta, when in tiles:
        tilehtml += (f'<div style="display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 14px; background: {t["glass"]}; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid {t["border"]}; box-shadow: {t["shadow"]}">'
                     f'<div style="display: flex; align-items: center; gap: 8px">{icon(k, t["accent"], 16)}<span style="font-size: 14px; font-weight: 700; color: {t["text"]}">{name}</span></div>'
                     f'<span style="font-size: 12px; color: {t["muted"]}">{meta}</span>'
                     f'<span style="font-size: 11px; color: {t["muted"]}; opacity: 0.8">{when}</span></div>')
    activity = [("revise", "stmt:26 revised to rev 2", "Section B reconciliation · 2 h ago"),
                ("link", "contradicts edge: stmt:39 → cand:B", "yesterday"),
                ("sweep", "Sweep committed 7 changes", "2026-09-10")]
    acthtml = ""
    for k, a, b in activity:
        acthtml += (f'<div style="display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px solid {t["cardBorder"]}">'
                    f'<div style="padding-top: 2px">{icon(k, t["muted"], 14)}</div>'
                    f'<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12.5px; color: {t["text"]}">{a}</span><span style="font-size: 11px; color: {t["muted"]}">{b}</span></div></div>')
    return HEAD.replace("{accent}", t["accent"]).replace("{glow}", t["glow"]) + f'''
<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; background: {t["ground"]}; color: {t["text"]}">
  <img src="gimbal-workshop-hero.jpg" style="position: absolute; left: 0; top: 0; width: 1440px; height: 900px; object-fit: cover; object-position: 88% center">
  <div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(18,21,18,0.94) 0%, rgba(18,21,18,0.86) 42%, rgba(18,21,18,0.3) 64%, rgba(18,21,18,0) 100%)"></div>
  <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(18,21,18,0.55) 0%, rgba(18,21,18,0) 45%)"></div>

  <div style="position: absolute; left: 72px; top: 56px; width: 560px; display: flex; flex-direction: column; gap: 22px">
    <div style="display: flex; align-items: center; gap: 10px">
      {icon("gimbal", t["accent"], 22)}
      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: {t["accent"]}">FringeIsland</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 14px">
      <div style="font-family: 'Instrument Serif', Georgia, serif; font-size: 58px; line-height: 1.02; letter-spacing: -0.01em; color: {t["text"]}">Discovery<br>Canvas</div>
      <div style="font-size: 15px; line-height: 1.55; color: {t["muted"]}; max-width: 460px">48 locked statements, 29 thinkers, the open questions, and what the phone caught on the way. Arrange it, relate it, see what holds.</div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">{tilehtml}</div>
    <div style="display: flex; align-items: center; gap: 10px">
      <div style="display: flex; align-items: center; gap: 7px; height: 36px; padding: 0 14px; border-radius: 9px; border: 1px solid {t["border"]}; font-size: 12.5px; font-weight: 600; color: {t["text"]}">{icon("plus", t["text"], 14)}<span>New tab</span></div>
      <div style="display: flex; align-items: center; gap: 7px; height: 36px; padding: 0 14px; border-radius: 9px; border: 1px solid {t["border"]}; font-size: 12.5px; font-weight: 600; color: {t["text"]}">{icon("pdf", t["text"], 14)}<span>Import a file</span></div>
      <span style="flex-grow: 1"></span>
      <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: {t["muted"]}">{status_dot(t["ember"])}2 flags to review</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px; padding: 12px 16px 6px; border-radius: 14px; background: {t["glass"]}; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid {t["border"]}">
      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: {t["muted"]}">Recent</span>
      {acthtml}
    </div>
  </div>


  <div style="position: absolute; right: 40px; bottom: 40px; display: flex; align-items: center; gap: 10px; font-size: 11px; color: rgba(233,228,216,0.7)">
    <span>discovery worktree · last sweep 2026-09-10</span>
  </div>
</div>
</x-dc>
</body>
</html>
'''

open("Main.dc.html", "w").write(canvas_page(DARK))
open("CanvasLight.dc.html", "w").write(canvas_page(LIGHT))
open("Landing.dc.html", "w").write(landing(DARK))
print("written")
