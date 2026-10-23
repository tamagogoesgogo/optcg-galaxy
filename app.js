(() => {
  const DATA = window.GALAXY_DATA;
  const COLORS = { red: '#e5484d', green: '#30a46c', blue: '#3e63dd', purple: '#8e4ec6', black: '#4b4b58', yellow: '#f5c518' };
  const wrColor = d3.scaleLinear().domain([0.4, 0.5, 0.6]).range(['#ff5a5f', '#8a8fa3', '#3ddc84']).clamp(true);
  const pct = x => (x * 100).toFixed(1) + '%';
  const pct0 = x => Math.round(x * 100) + '';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = name => name.split(/\s+/).slice(-1).map(w => w[0]).join('').slice(0, 3).toUpperCase();

  // ---- data model ------------------------------------------------------
  // Each matchup is stored once, from leader a's perspective:
  //   first  = a's win rate when a goes 1st, second = a's win rate when a goes 2nd.
  // b's view is derived: b going 1st is a going 2nd, so b.first.wr = 1 - a.second.wr.
  const leaders = DATA.leaders.map(d => ({ ...d }));
  const byId = new Map(leaders.map(d => [d.id, d]));
  // mirror matches (a === b) can't be drawn as lines between stars; they get their own mirror view
  const mirrorOf = new Map(DATA.matchups.filter(m => m.a === m.b && byId.has(m.a))
    .map(m => [m.a, { ...m, source: byId.get(m.a), target: byId.get(m.a) }]));
  const pairs = DATA.matchups
    .filter(m => m.a !== m.b && byId.has(m.a) && byId.has(m.b))
    .map(m => ({ ...m, source: byId.get(m.a), target: byId.get(m.b) }));

  function viewOf(m, id) {
    if (m.a === id) return { me: m.source, opp: m.target, first: m.first, second: m.second, real: m.real };
    return {
      me: m.target, opp: m.source, real: m.real,
      first: { wr: 1 - m.second.wr, games: m.second.games },
      second: { wr: 1 - m.first.wr, games: m.first.games },
    };
  }
  const findPair = (a, b) => pairs.find(m => (m.a === a && m.b === b) || (m.a === b && m.b === a));
  const pairsOf = id => pairs.filter(m => m.a === id || m.b === id).map(m => viewOf(m, id));
  // turn-neutral win rate: 1st and 2nd count equally, so a lopsided games split doesn't tilt it
  const avg = v => (v.first.wr + v.second.wr) / 2;
  // 95% margin (± win-rate points as a fraction) of that turn-neutral rate
  const margin = v => 1.96 * Math.sqrt((v.first.wr * (1 - v.first.wr) / Math.max(1, v.first.games)
    + v.second.wr * (1 - v.second.wr) / Math.max(1, v.second.games)) / 4);
  // matchups with real data first (best to worst), placeholder ones after
  const byResult = (a, b) => (b.real - a.real) || (avg(b) - avg(a));

  // All stars are the same size (easier to read than sizing by play rate); they grow a bit with the screen.
  const screenK = innerWidth > 760 ? Math.min(1.35, Math.max(0.85, Math.min(innerWidth, innerHeight) / 850))
    : Math.min(1.3, Math.max(0.9, innerWidth / 390));
  const starR = (innerWidth > 760 ? 40 : 22) * screenK;
  const LINE_W = 2.2; // every matchup line has the same width
  leaders.forEach(d => { d.r = starR; });

  // ---- state & layout --------------------------------------------------
  const state = { focus: null, hover: null, mirror: null, minGames: 0 };
  let W = innerWidth, H = innerHeight;
  const panelOpen = () => !document.getElementById('panel').hidden;
  let sheetDown = false; // phones: the bottom sheet is swiped down to a slim bar
  const sheetCovers = () => panelOpen() && !sheetDown;
  const center = () => (W > 760 && panelOpen() ? [(W - 380) / 2, H / 2 + 20] : W > 760 ? [W / 2, H / 2 + 20] : [W / 2, sheetCovers() ? H * 0.32 : H * 0.5]);

  const svg = d3.select('#galaxy');
  const defs = svg.append('defs');
  defs.append('filter').attr('id', 'blur').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%')
    .append('feGaussianBlur').attr('stdDeviation', 7);

  leaders.forEach(d => {
    if (d.img) {
      defs.append('pattern').attr('id', 'img-' + d.id).attr('patternContentUnits', 'objectBoundingBox').attr('width', 1).attr('height', 1)
        .append('image').attr('href', d.img).attr('width', 1).attr('height', 1).attr('preserveAspectRatio', 'xMidYMin slice');
    }
    const cols = (d.colors && d.colors.length ? d.colors : ['black']).map(c => COLORS[c] || c);
    const g = defs.append('linearGradient').attr('id', 'grad-' + d.id).attr('x1', 0).attr('y1', 0).attr('x2', 1).attr('y2', 1);
    cols.forEach((c, i) => {
      g.append('stop').attr('offset', (i / cols.length) * 100 + '%').attr('stop-color', c);
      g.append('stop').attr('offset', ((i + 1) / cols.length) * 100 + '%').attr('stop-color', c);
    });
  });

  // starfield in screen space (does not zoom)
  const starG = svg.append('g');
  function drawStars() {
    starG.selectAll('circle').data(d3.range(Math.round((W * H) / 5000))).join('circle')
      .attr('class', 'star')
      .attr('cx', () => Math.random() * W).attr('cy', () => Math.random() * H)
      .attr('r', () => Math.random() * 1.1 + 0.2)
      .attr('opacity', () => Math.random() * 0.6 + 0.2)
      .style('animation-delay', () => -Math.random() * 4 + 's');
  }
  drawStars();

  const root = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.3, 4]).on('zoom', e => { root.attr('transform', e.transform); positionMirrorBtn(); });
  svg.call(zoom).on('dblclick.zoom', null);
  svg.on('click', e => { if (e.target === svg.node() || e.target.classList.contains('star')) (state.mirror ? exitMirror() : unfocus()); });

  // ---- lines: two per matchup -----------------------------------------
  const perspective = m => {
    const active = state.focus || state.hover;
    return active && (m.a === active.id || m.b === active.id) ? active.id : m.a;
  };

  function linePath(d) {
    const v = viewOf(d.m, perspective(d.m));
    const s = v.me, t = v.opp;
    const dx = t.x - s.x, dy = t.y - s.y, len = Math.hypot(dx, dy) || 1;
    const bend = Math.min(55, len * 0.16) * (d.kind === 'first' ? 1 : -1);
    const cx = (s.x + t.x) / 2 - (dy / len) * bend, cy = (s.y + t.y) / 2 + (dx / len) * bend;
    return `M${s.x},${s.y}Q${cx},${cy} ${t.x},${t.y}`;
  }

  const tip = document.getElementById('tip');
  const lines = root.append('g').attr('class', 'lines').selectAll('path')
    .data(pairs.flatMap(m => [{ m, kind: 'first' }, { m, kind: 'second' }]))
    .join('path')
    .attr('class', d => 'mline ' + d.kind)
    .on('mousemove', (e, d) => {
      const v = viewOf(d.m, perspective(d.m)), s = v[d.kind];
      tip.innerHTML = `<b>${esc(v.me.name)}</b> vs ${esc(v.opp.name)} · going ${d.kind === 'first' ? '1st' : '2nd'}: `
        + (v.real ? `<span class="wr" style="color:${wrColor(s.wr)}">${pct(s.wr)}</span> <span class="muted">(${s.games} games)</span>`
          : '<span class="muted">no data yet</span>');
      tip.hidden = false;
      tip.style.left = Math.min(e.clientX + 14, W - tip.offsetWidth - 8) + 'px';
      tip.style.top = e.clientY + 14 + 'px';
    })
    .on('mouseleave', () => { tip.hidden = true; })
    .on('click', (e, d) => { e.stopPropagation(); openMatchup(perspective(d.m), d.m); });

  // ---- leader nodes ----------------------------------------------------
  const nodes = root.append('g').selectAll('g').data(leaders).join('g')
    .attr('class', 'leader')
    .on('mouseenter', (e, d) => { state.hover = d; restyle(); })
    .on('mouseleave', () => { state.hover = null; restyle(); })
    .on('click', (e, d) => { e.stopPropagation(); onLeaderClick(d); })
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        if (d !== state.focus) { d.fx = null; d.fy = null; }
      }));

  nodes.append('circle').attr('class', 'halo').attr('r', d => d.r * 1.2)
    .attr('fill', d => COLORS[(d.colors || [])[0]] || '#8fa2ff').attr('filter', 'url(#blur)');
  nodes.append('circle').attr('class', 'disc').attr('r', d => d.r)
    .attr('fill', d => (d.img ? `url(#img-${d.id})` : `url(#grad-${d.id})`));
  nodes.filter(d => !d.img).append('text').attr('class', 'initials').attr('dy', '0.35em').text(d => initials(d.name));
  nodes.append('text').attr('class', 'name').attr('y', d => d.r).attr('dy', '1.35em').text(d => d.name);
  nodes.append('text').attr('class', 'sub').attr('y', d => d.r).attr('dy', '2.75em');

  // ---- simulation ------------------------------------------------------
  const [cx0, cy0] = center();
  leaders.forEach(d => { d.x = cx0 + (Math.random() - 0.5) * 400; d.y = cy0 + (Math.random() - 0.5) * 300; });

  const sim = d3.forceSimulation(leaders)
    .force('charge', d3.forceManyBody().strength(-320))
    .force('collide', d3.forceCollide(d => d.r + (innerWidth > 760 ? 26 : 16)))
    .force('link', d3.forceLink(pairs).distance(220).strength(0.02))
    .on('tick', () => {
      // keep stars (and their labels) on screen, below the header bar
      const top = document.querySelector('.bar').getBoundingClientRect().bottom;
      leaders.forEach(d => {
        const mx = Math.max(d.r, 40) + 4;
        d.x = Math.max(mx, Math.min(W - mx, d.x));
        d.y = Math.max(top + d.r + 4, Math.min(H - d.r - 50, d.y));
      });
      lines.attr('d', linePath);
      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

  function applyTargets() {
    const [cx, cy] = center();
    sim.force('x', d3.forceX(d => d.tx ?? cx).strength(d => (d.tx != null ? 0.35 : 0.05)));
    sim.force('y', d3.forceY(d => d.ty ?? cy).strength(d => (d.ty != null ? 0.35 : 0.05)));
    sim.force('link').strength(state.focus ? 0 : 0.02);
    sim.force('charge').strength(state.focus ? -60 : W > 760 ? -320 : -140);
    if (state.focus) { state.focus.fx = cx; state.focus.fy = cy; }
  }
  applyTargets();

  // ---- interactions ----------------------------------------------------
  function restyle() {
    const active = state.focus || state.hover;
    const passes = s => s.games >= state.minGames;

    lines
      .attr('d', linePath)
      .each(function (d) {
        const s = viewOf(d.m, perspective(d.m))[d.kind];
        const involved = active && (d.m.a === active.id || d.m.b === active.id);
        const ok = passes(s);
        d3.select(this)
          .attr('stroke', involved ? (d.m.real ? wrColor(s.wr) : '#5d6380') : '#a9b8ff')
          .attr('stroke-width', involved ? (d.m.real ? LINE_W : 0.8) : 0.7)
          .attr('opacity', !ok ? 0 : !active ? (d.m.real ? 0.2 : 0.06) : involved ? (d.m.real ? 0.9 : 0.35) : 0.025)
          .style('pointer-events', involved && ok ? 'stroke' : 'none');
      });

    nodes
      .classed('active', d => d === active)
      .classed('dim', d => {
        if (!active || d === active) return false;
        const v = viewOf(findPair(active.id, d.id), active.id);
        return !passes(v.first) && !passes(v.second);
      });

    nodes.select('.sub').text(d => {
      if (!state.focus || d === state.focus) return '';
      const v = viewOf(findPair(state.focus.id, d.id), state.focus.id);
      return v.real ? `${pct0(v.first.wr)} · ${pct0(v.second.wr)}` : 'no data';
    });
  }

  function focusLeader(d) {
    state.focus = d;
    syncMirrorBtn();
    showLeaderPanel(d);
    placeRing(d);
    svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity);
    restyle();
  }

  // opponents on a ring around the focused leader
  function placeRing(d) {
    leaders.forEach(n => { n.fx = n.fy = n.tx = n.ty = null; });
    const [cx, cy] = center();
    const R = W > 760 ? Math.max(150, Math.min(panelOpen() ? W - 380 : W, H) * 0.36) : Math.min(W / 2 - 52, H * (sheetCovers() ? 0.22 : 0.3));
    const opps = pairsOf(d.id).sort(byResult); // best matchup at the top, clockwise to worst, then no-data ones
    opps.forEach((v, i) => {
      const ang = -Math.PI / 2 + (i / opps.length) * 2 * Math.PI;
      v.opp.tx = cx + R * Math.cos(ang);
      v.opp.ty = cy + R * Math.sin(ang);
    });
    applyTargets();
    sim.alpha(0.9).restart();
    positionMirrorBtn();
  }

  function unfocus() {
    if (!state.focus) return;
    leaders.forEach(n => { n.fx = n.fy = n.tx = n.ty = null; });
    state.focus = null;
    syncMirrorBtn();
    closePanel();
    applyTargets();
    sim.alpha(0.6).restart();
    restyle();
  }

  // ---- mirror view -----------------------------------------------------
  // Everything else fades out; two copies of the leader face each other: left one goes 1st, right one goes 2nd.
  const mirrorG = root.append('g').attr('class', 'mirror-view');

  function enterMirror(d) {
    const m = mirrorOf.get(d.id);
    state.mirror = d;
    syncMirrorBtn();
    tip.hidden = true;
    svg.classed('mirror-mode', true);
    openMatchup(d.id, m);
    svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity);

    const sides = [{ kind: 'first', s: m.first }, { kind: 'second', s: m.second }];
    mirrorG.selectAll('*').remove();

    mirrorG.selectAll('path').data(sides).join('path')
      .attr('class', s => 'mline ' + s.kind)
      .attr('stroke', s => wrColor(s.s.wr)).attr('stroke-width', LINE_W)
      .attr('opacity', 0)
      .on('mousemove', (e, s) => {
        tip.innerHTML = `<b>${esc(d.name)}</b> mirror · going ${s.kind === 'first' ? '1st' : '2nd'}: `
          + `<span class="wr" style="color:${wrColor(s.s.wr)}">${pct(s.s.wr)}</span> <span class="muted">(${s.s.games} games)</span>`;
        tip.hidden = false;
        tip.style.left = Math.min(e.clientX + 14, W - tip.offsetWidth - 8) + 'px';
        tip.style.top = e.clientY + 14 + 'px';
      })
      .on('mouseleave', () => { tip.hidden = true; })
      .transition().delay(350).duration(400).attr('opacity', 0.9);

    const copies = mirrorG.selectAll('g.copy').data(sides).join('g').attr('class', 'copy')
      .attr('transform', `translate(${d.x},${d.y})`);
    copies.append('circle').attr('class', 'halo').attr('r', d.r * 1.2)
      .attr('fill', COLORS[(d.colors || [])[0]] || '#8fa2ff').attr('filter', 'url(#blur)');
    copies.append('circle').attr('class', 'disc').attr('r', d.r)
      .attr('fill', d.img ? `url(#img-${d.id})` : `url(#grad-${d.id})`);
    copies.append('text').attr('class', 'name').attr('y', d.r).attr('dy', '1.35em').text(s => `going ${s.kind === 'first' ? '1st' : '2nd'}`);
    copies.append('text').attr('class', 'sub').attr('y', d.r).attr('dy', '2.1em').attr('fill', s => wrColor(s.s.wr)).text(s => pct0(s.s.wr) + '%');
    placeMirror();
  }

  function placeMirror() {
    positionMirrorBtn();
    const d = state.mirror, [cx, cy] = center();
    const D = W > 760 ? Math.min(170, W * 0.15) : W / 2 - d.r - 36;
    mirrorG.selectAll('path')
      .attr('d', s => `M${cx - D},${cy}Q${cx},${cy + D * 0.45 * (s.kind === 'first' ? -1 : 1)} ${cx + D},${cy}`);
    mirrorG.selectAll('g.copy').transition('place').duration(600).ease(d3.easeCubicOut)
      .attr('transform', s => `translate(${s.kind === 'first' ? cx - D : cx + D},${cy})`);
  }

  function exitMirror() {
    if (!state.mirror) return;
    state.mirror = null;
    syncMirrorBtn();
    tip.hidden = true;
    svg.classed('mirror-mode', false);
    mirrorG.selectAll('*').remove();
    if (state.focus) showLeaderPanel(state.focus); else closePanel();
  }

  // Mirror button: only while a leader is in the centre; it sits right under that leader's name (and between the two
  // copies in the mirror view), following pan/zoom, and opens/closes the mirror view.
  const mirrorBtn = document.getElementById('mirrorBtn');
  function syncMirrorBtn() {
    mirrorBtn.hidden = !(state.focus && mirrorOf.has(state.focus.id));
    mirrorBtn.classList.toggle('on', !!state.mirror);
    mirrorBtn.textContent = state.mirror ? '✕ Close mirror' : '⇄ Mirror match';
    // same glow as the centred leader's halo
    if (state.focus) mirrorBtn.style.setProperty('--glow', COLORS[(state.focus.colors || [])[0]] || '#8fa2ff');
    positionMirrorBtn();
  }
  function positionMirrorBtn() {
    if (mirrorBtn.hidden) return;
    const t = d3.zoomTransform(svg.node()), [x, y] = t.apply(center());
    mirrorBtn.style.left = x + 'px';
    mirrorBtn.style.top = y + (starR + 30) * t.k + 'px'; // below the star and its name label
  }
  mirrorBtn.onclick = e => { e.stopPropagation(); state.mirror ? exitMirror() : enterMirror(state.focus); };

  function onLeaderClick(d) {
    if (!state.focus || state.focus === d) focusLeader(d);
    else openMatchup(state.focus.id, findPair(state.focus.id, d.id));
  }

  // ---- side panel ------------------------------------------------------
  const panel = document.getElementById('panel');
  const body = document.getElementById('panelBody');
  const cell = s => `<span class="wr" style="color:${wrColor(s.wr)}">${pct(s.wr)}</span>`;
  function openPanel() {
    const wasDown = sheetDown;
    panel.hidden = false; document.body.classList.add('panel-open');
    setSheet(false, wasDown); // new content always shows the full sheet
  }
  function closePanel() { panel.hidden = true; document.body.classList.remove('panel-open'); setSheet(false, false); }

  // ---- phones: the panel is a bottom sheet -------------------------------
  // Swipe it down to a slim bar (the map gets the whole screen), swipe up or tap the bar to bring it back.
  function setSheet(down, relayout = true) {
    sheetDown = down;
    panel.classList.toggle('down', down);
    document.body.classList.toggle('sheet-down', down);
    if (!relayout) return;
    if (state.mirror) placeMirror();
    else if (state.focus) placeRing(state.focus);
    else { applyTargets(); sim.alpha(0.4).restart(); }
  }

  const grab = document.getElementById('grab');
  let drag = null;
  panel.addEventListener('touchstart', e => {
    if (innerWidth > 760 || e.target.closest('#close, textarea, button')) return;
    const onGrab = grab.contains(e.target);
    // drag from the handle, from the slim bar, or from the sheet when it's scrolled to the top
    if (!onGrab && !sheetDown && panel.scrollTop > 0) return;
    drag = { y0: e.touches[0].clientY, dy: 0, onGrab, moving: false, base: sheetDown ? panel.offsetHeight - peek() : 0 };
  }, { passive: true });
  panel.addEventListener('touchmove', e => {
    if (!drag) return;
    drag.dy = e.touches[0].clientY - drag.y0;
    if (!drag.moving) {
      if (Math.abs(drag.dy) < 6) return;
      if (!drag.onGrab && !sheetDown && drag.dy < 0) { drag = null; return; } // upward on an open sheet = normal scroll
      drag.moving = true;
      panel.style.transition = 'none';
    }
    e.preventDefault();
    const y = Math.max(0, Math.min(panel.offsetHeight - peek(), drag.base + drag.dy));
    panel.style.transform = `translateY(${y}px)`;
  }, { passive: false });
  panel.addEventListener('touchend', () => {
    if (!drag) return;
    const { moving, dy, onGrab } = drag;
    drag = null;
    panel.style.transition = ''; panel.style.transform = '';
    if (!moving) { if (onGrab || sheetDown) setSheet(!sheetDown); return; } // a tap toggles
    if (dy > 50 && !sheetDown) setSheet(true);
    else if (dy < -50 && sheetDown) setSheet(false);
  });
  const peek = () => grab.offsetHeight + 44; // handle + the title line stay visible
  document.getElementById('close').onclick = e => { e.stopPropagation(); exitMirror(); state.focus ? unfocus() : closePanel(); };

  // Short caveats about the leader's real matchup numbers, as HTML.
  function dataNotes(d, rows) {
    const real = rows.filter(v => v.real);
    const games = v => v.first.games + v.second.games;
    const missing = rows.length - real.length;
    if (!real.length) return '<p class="muted">No real matchup data yet.</p>';

    const general = [];
    if (d.stats) {
      const mi = mirrorOf.get(d.id);
      const covered = d3.sum(real, games) + (mi ? games(mi) : 0);
      general.push(`<b>${pct0(covered / d.stats.games)}%</b> of ${esc(d.name)}'s games covered `
        + `<span class="muted">(${covered.toLocaleString()} / ${d.stats.games.toLocaleString()})</span>`);
    }
    if (missing) general.push(`<b>${missing}</b> matchup${missing > 1 ? 's' : ''} without data`);

    const group = (title, hint, items) => (items.length ? `
      <div class="note-group"><div class="note-title">${title} <span class="muted">${hint}</span></div>
        ${items.map(([name, val]) => `<div class="note-row"><span>${esc(name)}</span><span class="muted">${val}</span></div>`).join('')}
      </div>` : '');

    const small = real.filter(v => games(v) < 100).sort((a, b) => games(a) - games(b));
    const close = real.filter(v => Math.abs(avg(v) - 0.5) < margin(v)).sort((a, b) => margin(b) - margin(a));
    return (general.length ? `<div class="note-general">${general.map(g => `<div>${g}</div>`).join('')}</div>` : '')
      + group('Small samples', '&lt;100 games', small.map(v => [v.opp.name, `${games(v)} games · ±${pct0(margin(v))} pts`]))
      + group('Too close to call', 'could still be 50/50', close.map(v => [v.opp.name, `${pct0(avg(v))}% ±${pct0(margin(v))}`]));
  }

  function showLeaderPanel(d) {
    const rows = pairsOf(d.id).sort(byResult);
    const st = d.stats;
    const mi = mirrorOf.get(d.id);
    body.innerHTML = `
      <h2>${esc(d.name)}${d.code ? ` <span class="muted">${esc(d.code)}</span>` : ''}</h2>
      <div class="muted">${(d.colors || []).join(' / ')} · play rate ${pct(d.share || 0)}</div>
      ${st ? `<div class="muted">overall ${cell({ wr: st.wtd })} weighted · 1st ${cell({ wr: st.first })} · 2nd ${cell({ wr: st.second })}
        · ${st.games.toLocaleString()} games</div>` : ''}
      <table class="mu">
        <thead><tr><th>vs</th><th>1st</th><th>2nd</th><th>games</th></tr></thead>
        <tbody>${mi
          ? `<tr class="mirror-row" data-mirror><td>⇄ Mirror</td><td>${cell(mi.first)}</td><td>${cell(mi.second)}</td>
            <td class="muted">${mi.first.games + mi.second.games}</td></tr>`
          : '<tr class="mirror-row empty"><td>⇄ Mirror</td><td class="muted" colspan="3">no data yet</td></tr>'}${rows.map(v => `
          <tr data-opp="${esc(v.opp.id)}"><td>${esc(v.opp.name)}</td>${v.real
            ? `<td>${cell(v.first)}</td><td>${cell(v.second)}</td><td class="muted">${v.first.games + v.second.games}</td>`
            : '<td class="muted" colspan="3">no data yet</td>'}</tr>`).join('')}
        </tbody>
      </table>
      <h3>Data notes</h3>
      ${dataNotes(d, rows)}`;
    body.querySelectorAll('tr[data-opp]').forEach(tr => {
      tr.onclick = () => openMatchup(d.id, findPair(d.id, tr.dataset.opp));
    });
    const mirrorRow = body.querySelector('tr[data-mirror]');
    if (mirrorRow) mirrorRow.onclick = () => enterMirror(d);
    openPanel();
  }

  function openMatchup(pid, m) {
    const v = viewOf(m, pid);
    const isMirror = m.a === m.b;
    const swing = (v.first.wr - v.second.wr) * 100;
    const key = 'note:' + [m.a, m.b].sort().join('|');
    let saved = '';
    try { saved = localStorage.getItem(key) || ''; } catch (_) { /* storage unavailable */ }

    body.innerHTML = `
      <button class="link back">← ${esc(v.me.name)}</button>
      <h2>${esc(v.me.name)} <span class="muted">${isMirror ? 'mirror' : 'vs ' + esc(v.opp.name)}</span></h2>
      ${v.real ? `<div class="big">
        <div><label>Going 1st</label><b style="color:${wrColor(v.first.wr)}">${pct(v.first.wr)}</b><small>${v.first.games} games</small></div>
        <div><label>Going 2nd</label><b style="color:${wrColor(v.second.wr)}">${pct(v.second.wr)}</b><small>${v.second.games} games</small></div>
      </div>
      <p class="muted">${Math.abs(swing) < 1 ? 'Turn order barely matters here.'
        : `${Math.abs(swing).toFixed(0)} pts better going ${swing > 0 ? '1st' : '2nd'}.`}</p>`
        : '<p class="muted">No data for this matchup yet.</p>'}
      ${m.notes ? `<h3>Notes</h3><p>${esc(m.notes)}</p>` : ''}
      <h3>My notes</h3>
      <textarea placeholder="Key cards, mulligan, how it plays out…">${esc(saved)}</textarea>
      <div class="muted" style="font-size:12px">Saved in this browser only, for now.</div>
      ${isMirror ? '' : `<button class="action flip">See it from ${esc(v.opp.name)}'s side</button>`}`;

    body.querySelector('.back').onclick = () => { exitMirror(); state.focus === v.me ? showLeaderPanel(v.me) : focusLeader(v.me); };
    if (!isMirror) body.querySelector('.flip').onclick = () => { focusLeader(v.opp); openMatchup(v.opp.id, m); };
    body.querySelector('textarea').oninput = e => {
      try { localStorage.setItem(key, e.target.value); } catch (_) { /* storage unavailable */ }
    };
    openPanel();
  }

  // ---- controls --------------------------------------------------------
  const minGames = document.getElementById('minGames');
  minGames.oninput = () => {
    state.minGames = +minGames.value;
    document.getElementById('minGamesOut').textContent = minGames.value;
    restyle();
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') (state.mirror ? exitMirror() : unfocus()); });

  addEventListener('resize', () => {
    W = innerWidth; H = innerHeight;
    drawStars();
    if (state.focus) focusLeader(state.focus); else { applyTargets(); sim.alpha(0.4).restart(); }
    if (state.mirror) enterMirror(state.mirror);
  });

  // header line: what's covered, when, and where the numbers come from
  const day = DATA.updated && new Date(DATA.updated + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('about').innerHTML = [
    DATA.scope && esc(DATA.scope),
    day && `data from <b>${esc(day)}</b>`,
    DATA.source && `source: <b>${esc(DATA.source)}</b>${DATA.queue ? ` (${esc(DATA.queue)})` : ''}`,
  ].filter(Boolean).join(' · ');
  document.getElementById('source').textContent = [DATA.source || 'unknown', DATA.queue && `(${DATA.queue})`].filter(Boolean).join(' ');
  const nReal = pairs.filter(m => m.real).length;
  const banner = document.getElementById('banner');
  banner.textContent = `${nReal} of ${pairs.length} matchups have real data so far`;
  banner.hidden = nReal === pairs.length;
  restyle();
})();
