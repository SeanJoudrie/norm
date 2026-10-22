/* NORM prototype: interest swiping, Top 20, daily drop, text-only chat.
   Vanilla JS. State lives in memory and is mirrored to localStorage when available. */
(() => {
  'use strict';

  const UNLOCK_AT = 20;
  const STAR_CAP = 20;
  const PICK_GAP_MS = 12 * 60 * 60 * 1000;
  const WEIGHT = { star: 3, yes: 1, maybe: 0.5 };
  const STORE_KEY = 'norm-prototype-v1';

  /* ---------- Interest tree ---------- */
  const NODES = {};
  const ORDER = [];
  (function walk(list, parent, depth) {
    list.forEach((n) => {
      NODES[n.id] = { ...n, parent, depth, childIds: (n.children || []).map((c) => c.id) };
      ORDER.push(n.id);
      if (n.children) walk(n.children, n.id, depth + 1);
    });
  })(TREE, null, 0);

  const rootOf = (id) => { let n = NODES[id]; while (n.parent) n = NODES[n.parent]; return n; };
  const pathOf = (id) => { const out = []; let n = NODES[id]; while (n) { out.unshift(n); n = n.parent ? NODES[n.parent] : null; } return out; };
  const inheritsPrivate = (id) => pathOf(id).some((n) => n.private);

  const LABELS = {
    default: { yes: 'Into it', no: 'Nope', maybe: 'Curious' },
    title: { yes: 'Love it', no: 'Not for me', maybe: "Haven't seen" },
    artist: { yes: 'Love them', no: 'Not for me', maybe: "Haven't heard" },
    team: { yes: 'Fan', no: 'Not a fan', maybe: "Don't follow" },
  };
  const labelsFor = (id) => LABELS[NODES[id].kind] || LABELS.default;
  /* Swipe up on a title, artist or team means "no opinion", stored as skip. */
  const upValue = (id) => (NODES[id].kind && LABELS[NODES[id].kind] ? 'skip' : 'maybe');

  /* ---------- State ---------- */
  const fresh = () => ({
    answers: {},
    stars: [],
    priv: [],
    history: [],
    deck: TREE.map((n) => n.id),
    settings: { lookingFor: 'both', iAm: 'man', showMe: ['woman'], ageMin: 21, ageMax: 40, miles: 25 },
    name: '',
    age: '',
    drop: null,
    threads: {},
    unread: [],
  });
  let state = load() || fresh();
  const photos = [null, null, null];
  let tab = 'swipe';
  let openThread = null;
  let busy = false;

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && s.answers && s.deck ? { ...fresh(), ...s } : null;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (name, cls = 'icon') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  const swipeCount = () => Object.keys(state.answers).length;
  const isPositive = (v) => v === 'yes' || v === 'maybe';
  const tierOf = (id) => {
    const v = state.answers[id];
    if (!v) return null;
    if (isPositive(v) && state.stars.includes(id)) return 'star';
    return v;
  };
  const fmtClock = (ms) => {
    const t = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const listJoin = (arr) => arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr.at(-1);

  /* ---------- Matching ---------- */
  function compare(p) {
    let shared = 0, conflict = 0, tu = 0, tp = 0;
    const agree = [], differ = [];
    Object.keys(state.answers).forEach((id) => {
      const them = p.answers[id];
      if (!them) return;
      const you = tierOf(id);
      const wu = WEIGHT[you] || 0, wp = WEIGHT[them] || 0;
      tu += wu; tp += wp;
      if (wu > 0 && wp > 0) {
        shared += Math.min(wu, wp);
        agree.push({ id, w: wu + wp });
      } else if ((wu > 0 && them === 'no') || (wp > 0 && you === 'no')) {
        conflict += Math.max(wu, wp) * 0.5;
        differ.push({ id, you, them });
      }
    });
    const denom = (tu + tp) / 2;
    const pct = denom ? Math.round(Math.min(99, Math.max(1, (100 * (shared - conflict)) / denom))) : 0;
    agree.sort((a, b) => b.w - a.w || NODES[b.id].depth - NODES[a.id].depth);
    return { pct, agree: agree.slice(0, 5).map((a) => a.id), differ: differ.slice(0, 4) };
  }

  function visibleProfiles() {
    const s = state.settings;
    return PROFILES.filter((p) => {
      const modeOk = s.lookingFor === 'both' || p.mode === 'both' || p.mode === s.lookingFor;
      return modeOk && s.showMe.includes(p.gender) && p.age >= s.ageMin && p.age <= s.ageMax && p.miles <= s.miles;
    }).map((p) => ({ p, ...compare(p) })).sort((a, b) => b.pct - a.pct);
  }

  const picks = () => (state.drop ? state.drop.picks : []);
  const isPicked = (id) => picks().some((x) => x.id === id);
  const nextPickAt = () => (picks().length === 1 ? picks()[0].at + PICK_GAP_MS : null);
  const pickAvailable = () => {
    const ps = picks();
    if (!state.drop || ps.length >= 2) return false;
    return ps.length === 0 || Date.now() >= nextPickAt();
  };
  const modeLabel = { romance: 'Romance', friends: 'Friends', both: 'Romance or friends' };

  /* ---------- Shell ---------- */
  const screen = $('#screen');
  const status = $('#status');

  function setTab(next) {
    tab = next;
    if (next !== 'messages') openThread = null;
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === next)));
    render();
    screen.scrollTop = 0;
  }

  function render() {
    const views = { swipe: renderSwipe, matches: renderMatches, messages: renderMessages, profile: renderProfile };
    screen.innerHTML = views[tab]();
    if (tab === 'swipe') mountDeck();
    if (tab === 'messages' && openThread) mountChat();
    renderStatus();
  }

  function renderStatus() {
    const n = swipeCount();
    const text = {
      swipe: `${n} swiped`,
      matches: state.drop ? `${visibleProfiles().length} in today's drop` : n >= UNLOCK_AT ? 'Drop ready' : `${UNLOCK_AT - n} to unlock`,
      messages: `${Object.keys(state.threads).length} chats`,
      profile: `${state.stars.length} of ${STAR_CAP} starred`,
    }[tab];
    status.textContent = text;
    $('#msg-dot').hidden = state.unread.length === 0;
  }

  /* ---------- Swipe ---------- */
  function cardHTML(id, cls) {
    const n = NODES[id];
    const L = labelsFor(id);
    const level = n.kind ? n.kind[0].toUpperCase() + n.kind.slice(1) : n.depth === 0 ? 'Category' : n.childIds.length ? 'Sub-category' : 'Interest';
    let hint;
    if (n.childIds.length) hint = `Yes or Curious opens ${n.childIds.length} more`;
    else if (n.kind === 'title') hint = "Swipe up if you haven't seen it";
    else if (n.kind === 'artist') hint = "Swipe up if you haven't heard them";
    else if (n.kind === 'team') hint = "Swipe up if you don't follow them";
    else hint = 'Swipe up if you want to try it';
    return `<div class="card ${cls}" data-id="${id}" aria-hidden="${cls.includes('is-next')}">
      <span class="stamp stamp-yes">${esc(L.yes)}</span>
      <span class="stamp stamp-no">${esc(L.no)}</span>
      <span class="stamp stamp-maybe">${esc(L.maybe)}</span>
      <div class="card-top">
        <div class="card-icon">${ic(n.icon)}</div>
        <div class="card-body">
          <span class="label">${level}</span>
          <h2>${esc(n.name)}</h2>
          <p>${esc(n.desc)}</p>
        </div>
      </div>
      <div class="card-foot"><span class="small">${esc(hint)}</span>${n.private || inheritsPrivate(id) ? `<span class="tag">${ic('lock')}Private</span>` : ''}</div>
    </div>`;
  }

  function renderSwipe() {
    const n = swipeCount();
    const cur = state.deck[0];
    const progress = n < UNLOCK_AT
      ? `<div class="progress"><div class="progress-row"><span>Swipes until your first matches</span><span class="num">${n} of ${UNLOCK_AT}</span></div><div class="bar"><span style="width:${(n / UNLOCK_AT) * 100}%"></span></div></div>`
      : `<div class="pickbar"><span><strong>Matches unlocked.</strong> Keep swiping to sharpen them.</span><button class="btn btn-text" data-action="go" data-to="matches">See matches</button></div>`;

    if (!cur) {
      return `<div class="screen-inner">
        <div class="screen-head"><span class="label">Your interests</span><h1>You've seen every interest in the demo</h1></div>
        ${progress}
        <div class="empty"><p>${n} answers saved. Star your favorites so matching knows what matters most.</p>
          <div class="btn-row"><button class="btn btn-primary" data-action="go" data-to="profile">Star your Top 20</button>
          <button class="btn btn-secondary" data-action="undo" ${state.history.length ? '' : 'disabled'}>${ic('undo-2')}Undo last</button></div></div>
      </div>`;
    }
    const L = labelsFor(cur);
    const crumbs = pathOf(cur).slice(0, -1).map((p) => esc(p.name)).join(' / ');
    return `<div class="screen-inner">
      <div class="screen-head"><span class="label">Your interests</span><h1>What are you into?</h1></div>
      ${progress}
      <div class="section">
        <div class="crumbs label">${crumbs || 'All categories'}</div>
        <div class="deck" id="deck" role="group" aria-label="Interest card">
          ${state.deck[1] ? cardHTML(state.deck[1], 'is-next') : ''}
          ${cardHTML(cur, 'is-top is-promote')}
        </div>
      </div>
      <div class="actions">
        <button class="action action-no" data-action="swipe" data-v="no">${ic('x')}${esc(L.no)}</button>
        <button class="action action-maybe" data-action="swipe" data-v="up">${ic('circle-help')}${esc(L.maybe)}</button>
        <button class="action action-yes" data-action="swipe" data-v="yes">${ic('check')}${esc(L.yes)}</button>
      </div>
      <div class="deck-tools">
        <button class="btn btn-text" data-action="undo" ${state.history.length ? '' : 'disabled'}>${ic('undo-2')}Undo</button>
        <span class="small">Drag the card, or use arrow keys</span>
      </div>
      <p id="deck-live" class="visually-hidden" aria-live="polite">${esc(NODES[cur].name)}</p>
    </div>`;
  }

  function mountDeck() {
    const card = $('#deck .is-top');
    if (!card) return;
    // Promote the card from its "next" position so the stack moves up smoothly.
    card.style.transform = 'translateY(12px) scale(0.96)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      card.classList.add('is-settling');
      card.style.transform = '';
      card.classList.remove('is-promote');
    }));

    const stamps = { yes: $('.stamp-yes', card), no: $('.stamp-no', card), maybe: $('.stamp-maybe', card) };
    let d = null;
    const paint = (dx, dy) => {
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
      const vertical = -dy > Math.abs(dx);
      stamps.yes.style.opacity = vertical ? 0 : Math.min(1, Math.max(0, dx / 100));
      stamps.no.style.opacity = vertical ? 0 : Math.min(1, Math.max(0, -dx / 100));
      stamps.maybe.style.opacity = vertical ? Math.min(1, -dy / 100) : 0;
    };
    card.addEventListener('pointerdown', (e) => {
      if (busy) return;
      d = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
      card.setPointerCapture(e.pointerId);
      card.classList.remove('is-settling');
      card.classList.add('is-dragging');
    });
    card.addEventListener('pointermove', (e) => {
      if (!d) return;
      d.dx = e.clientX - d.x; d.dy = e.clientY - d.y;
      paint(d.dx, d.dy);
    });
    const end = () => {
      if (!d) return;
      const { dx, dy } = d; d = null;
      card.classList.remove('is-dragging');
      if (dx > 110) return fly('yes', dx, dy);
      if (dx < -110) return fly('no', dx, dy);
      if (dy < -110 && -dy > Math.abs(dx)) return fly('up', dx, dy);
      card.classList.add('is-settling');
      paint(0, 0);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }

  function fly(dir, dx = 0, dy = 0) {
    const card = $('#deck .is-top');
    if (!card || busy) return;
    busy = true;
    const id = card.dataset.id;
    const stamp = dir === 'yes' ? '.stamp-yes' : dir === 'no' ? '.stamp-no' : '.stamp-maybe';
    $(stamp, card).style.opacity = 1;
    card.classList.remove('is-settling');
    card.classList.add('is-leaving');
    const to = dir === 'yes' ? `translate(520px, ${dy}px) rotate(24deg)` : dir === 'no' ? `translate(-520px, ${dy}px) rotate(-24deg)` : `translate(${dx}px, -640px)`;
    requestAnimationFrame(() => { card.style.transform = to; card.style.opacity = 0; });
    setTimeout(() => {
      commit(id, dir === 'up' ? upValue(id) : dir);
      busy = false;
      render();
    }, 260);
  }

  function commit(id, v) {
    state.deck = state.deck.filter((x) => x !== id);
    state.answers[id] = v;
    const inserted = [];
    if (isPositive(v)) {
      NODES[id].childIds.forEach((k) => { if (!(k in state.answers) && !state.deck.includes(k)) inserted.push(k); });
      state.deck.unshift(...inserted);
      if (inheritsPrivate(id) && !state.priv.includes(id)) state.priv.push(id);
    }
    state.history.push({ id, inserted });
    const before = swipeCount() - 1;
    save();
    if (before < UNLOCK_AT && swipeCount() >= UNLOCK_AT) toast('Matches unlocked. Your first drop is ready.', 'See matches', () => setTab('matches'));
  }

  function undo() {
    const h = state.history.pop();
    if (!h) return;
    state.deck = state.deck.filter((x) => !h.inserted.includes(x));
    delete state.answers[h.id];
    state.stars = state.stars.filter((x) => x !== h.id);
    state.deck.unshift(h.id);
    save();
    render();
  }

  /* ---------- Matches ---------- */
  function renderMatches() {
    const n = swipeCount();
    const head = `<div class="screen-head"><span class="label">Matches</span><h1>Today's drop</h1></div>`;
    if (n < UNLOCK_AT) {
      return `<div class="screen-inner">${head}
        <div class="empty">
          <h2>Swipe ${UNLOCK_AT - n} more to unlock your first drop</h2>
          <p class="small">NORM matches on interests first. Faces come after.</p>
          <div class="bar" style="width:100%"><span style="width:${(n / UNLOCK_AT) * 100}%"></span></div>
          <div class="btn-row">
            <button class="btn btn-primary" data-action="go" data-to="swipe">Keep swiping</button>
            <button class="btn btn-secondary" data-action="sample">Fill with sample answers</button>
          </div>
          <p class="small">Sample answers are a demo shortcut. They answer ${Object.keys(SAMPLE_ANSWERS).length} interests and star ${SAMPLE_STARS.length}.</p>
        </div></div>`;
    }
    if (!state.drop) {
      return `<div class="screen-inner">${head}
        <div class="empty" id="drop-empty">
          <h2>Your first drop is ready</h2>
          <p class="small">NORM compares your ${n} answers with people nearby and shows the closest matches. You can message one now and one more 12 hours later.</p>
          <button class="btn btn-primary" data-action="scan" id="scan-btn">${ic('radar')}Find my matches</button>
        </div>
        <div class="matches" id="drop-list"></div></div>`;
    }
    const list = visibleProfiles();
    const ps = picks();
    let bar;
    if (pickAvailable()) {
      bar = `<div class="pickbar"><span><strong>${2 - ps.length} ${2 - ps.length === 1 ? 'pick' : 'picks'} left today.</strong> Tap a card to see photos and what you share.</span></div>`;
    } else if (ps.length === 1) {
      bar = `<div class="pickbar"><span>Next pick in <strong class="num" data-countdown>${fmtClock(nextPickAt() - Date.now())}</strong></span><button class="btn btn-text" data-action="skip-wait">Skip wait (demo)</button></div>`;
    } else {
      bar = `<div class="pickbar"><span><strong>Both picks used.</strong> A new drop arrives tomorrow.</span></div>`;
    }
    const cards = list.length
      ? list.map((m) => matchCardHTML(m)).join('')
      : `<div class="empty"><h2>No one in today's drop fits your settings</h2><p class="small">Try widening age, distance, or who you want to see.</p><button class="btn btn-secondary" data-action="go" data-to="profile" data-anchor="settings">Edit match settings</button></div>`;
    return `<div class="screen-inner">${head}${bar}<div class="matches">${cards}</div>
      <p class="small">The demo has ${PROFILES.length} people. The full app shows 5 a day. Cards you don't pick leave at the next drop.</p></div>`;
  }

  function matchCardHTML(m) {
    const { p, pct, agree } = m;
    const picked = isPicked(p.id);
    const kept = state.drop.kept.includes(p.id);
    const state_ = picked ? `<span class="tag tag-accent">${ic('message-circle')}Chatting</span>` : kept ? `<span class="tag">${ic('lock')}Kept</span>` : `<span class="tag">${ic('clock')}Leaves at next drop</span>`;
    return `<button class="match ${picked ? 'is-picked' : ''}" data-action="open-match" data-id="${p.id}" aria-label="${esc(p.name)}, ${pct} percent match">
      <span class="veil tone-${p.tone}">${ic('eye-off')}</span>
      <span class="match-main">
        <span class="match-top"><span class="score">${pct}<small>%</small></span>${state_}</span>
        <span class="match-shared">${agree.length ? 'You share ' + esc(listJoin(agree.slice(0, 3).map((id) => NODES[id].name))) : 'Not much overlap yet'}</span>
        <span class="tags"><span class="tag">${ic('users')}${modeLabel[p.mode]}</span><span class="tag">${ic('map-pin')}${p.miles} mi</span></span>
      </span>
    </button>`;
  }

  async function scan(btn) {
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = `${ic('loader-circle', 'icon spinner')}Comparing interests`;
    $('#drop-list').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    await wait(1400);
    state.drop = { at: Date.now(), picks: [], kept: [] };
    save();
    render();
  }

  function openMatch(id) {
    const m = visibleProfiles().find((x) => x.p.id === id) || { p: PROFILES.find((x) => x.id === id), ...compare(PROFILES.find((x) => x.id === id)) };
    const { p, pct, agree, differ } = m;
    const picked = isPicked(p.id);
    const kept = state.drop.kept.includes(p.id);
    const chips = agree.length
      ? agree.map((a) => `<span class="chip chip-static">${ic(NODES[a].icon)}${esc(NODES[a].name)}</span>`).join('')
      : '<p class="small">No shared interests yet. Keep swiping.</p>';
    const diffs = differ.length
      ? `<ul class="diff">${differ.map((d) => {
          const name = esc(NODES[d.id].name);
          const you = d.you === 'star' ? 'one of your Top 20' : d.you === 'maybe' ? 'you\'re curious' : 'you\'re into it';
          const line = d.them === 'no' ? `${name}: ${you}, ${esc(p.name)} passed` : `${name}: ${esc(p.name)} is into it, you passed`;
          return `<li>${ic('x')}${line}</li>`;
        }).join('')}</ul>`
      : '<p class="small">No direct conflicts.</p>';
    let cta;
    if (picked) cta = `<button class="btn btn-primary btn-block" data-action="open-thread" data-id="${p.id}">${ic('message-circle')}Open chat</button>`;
    else if (pickAvailable()) cta = `<button class="btn btn-primary btn-block" data-action="pick" data-id="${p.id}">${ic('send')}Message ${esc(p.name)}</button><p class="small">Uses 1 of your 2 picks today. ${esc(p.name)} gets your message in their inbox.</p>`;
    else if (picks().length >= 2) cta = `<p class="small">Both picks are used. ${kept ? 'This card is kept for tomorrow.' : 'This card leaves at the next drop.'}</p>${kept ? '' : keepBtn(p)}`;
    else cta = `<p class="small">Next pick in <strong class="num" data-countdown>${fmtClock(nextPickAt() - Date.now())}</strong>.</p>${kept ? `<span class="chip chip-static">${ic('lock')}Kept until your next pick</span>` : keepBtn(p)}`;

    openSheet(`${p.name}, ${p.age}`, `
      <div class="scoreline"><span class="score">${pct}%</span><span class="small">interest match</span></div>
      <div class="tags"><span class="tag">${ic('users')}${modeLabel[p.mode]}</span><span class="tag">${ic('map-pin')}${p.miles} mi away</span></div>
      <div class="section">
        <div class="reveal">${[1, 2, 3].map((i) => `<div class="veil tone-${p.tone}" role="img" aria-label="Photo ${i} of ${esc(p.name)}">${esc(p.name[0])}</div>`).join('')}</div>
        <p class="small">Demo profiles have no real photos.</p>
      </div>
      <div class="section"><h3 class="label">Top ${agree.length} you agree on</h3><div class="chips">${chips}</div></div>
      <div class="section"><h3 class="label">Where you differ</h3>${diffs}</div>
      <div class="section">${cta}</div>`);
  }
  const keepBtn = (p) => `<button class="btn btn-secondary btn-block" data-action="keep" data-id="${p.id}">Keep this card for $1.99</button>`;

  function pick(id) {
    const p = PROFILES.find((x) => x.id === id);
    const { agree, pct } = compare(p);
    state.drop.picks.push({ id, at: Date.now() });
    const top = agree.slice(0, 3).map((a) => NODES[a].name);
    state.threads[id] = {
      pct,
      socials: 'none',
      replies: 0,
      log: [{ from: 'sys', text: `You matched ${pct}%${top.length ? ' on ' + listJoin(top) : ''}. Chat is text only. Links and photos are off.` }],
    };
    save();
    closeSheet();
    openThread = id;
    setTab('messages');
    reply(id, 1600);
  }

  async function keep(btn, id) {
    btn.classList.add('is-loading');
    btn.innerHTML = `${ic('loader-circle', 'icon spinner')}Processing`;
    await wait(900);
    state.drop.kept.push(id);
    save();
    closeSheet();
    render();
    toast('Card kept. The prototype does not charge.');
  }

  /* ---------- Messages ---------- */
  const REPLIES = {
    lisa: ['Hi! Okay, a Patriots fan who also loves The Shining. Which one wins on a Sunday?', 'Ha, fair answer. Have you done any good hikes around here yet?', 'I know a trail with a taco place at the bottom. That might be the move.'],
    anne: ['Hey! I just moved here too. Do you play any board games, or should I teach you Wingspan?', 'Ha, deal. There is a game night at a coffee shop near me on Thursdays.', "I'll bring the snacks. You bring the competitive energy."],
    elizabeth: ['Hi! I never get matched on coffee and travel at the same time. Where was your last trip?', 'That sounds amazing. I am trying to plan one around a pottery workshop.', 'If you are ever up for a museum day, I am in.'],
  };

  function reply(id, delay) {
    const t = state.threads[id];
    const lines = REPLIES[id];
    if (!t || t.replies >= lines.length) return;
    t.typing = true;
    if (openThread === id) paintLog();
    setTimeout(() => {
      t.typing = false;
      t.log.push({ from: 'them', text: lines[t.replies] });
      t.replies += 1;
      if (!(tab === 'messages' && openThread === id) && !state.unread.includes(id)) state.unread.push(id);
      save();
      if (tab === 'messages' && openThread === id) paintLog();
      else if (tab === 'messages') render();
      renderStatus();
    }, delay);
  }

  function renderMessages() {
    if (openThread) {
      const p = PROFILES.find((x) => x.id === openThread);
      const t = state.threads[openThread];
      const socialsLabel = t.socials === 'done' ? 'Socials swapped' : t.socials === 'pending' ? 'Request sent' : 'Swap socials';
      return `<div class="chat">
        <div class="chat-head">
          <button class="icon-btn" data-action="close-thread" aria-label="Back to chats">${ic('chevron-left')}</button>
          <span class="avatar tone-${p.tone}" aria-hidden="true">${esc(p.name[0])}</span>
          <span class="chat-title"><strong>${esc(p.name)}</strong><span class="small num">${t.pct}% match</span></span>
          <button class="chip" data-action="socials" ${t.socials !== 'none' ? 'disabled aria-disabled="true"' : ''}>${ic('share-2')}${socialsLabel}</button>
        </div>
        <div class="chat-log" id="chat-log" aria-live="polite"></div>
        <form class="composer" id="composer">
          <div class="composer-row">
            <label for="msg" class="visually-hidden">Message ${esc(p.name)}</label>
            <textarea id="msg" class="input" rows="1" maxlength="500" placeholder="Message ${esc(p.name)}"></textarea>
            <button class="btn btn-primary" type="submit" aria-label="Send">${ic('send')}</button>
          </div>
          <p class="notice" id="msg-error" hidden></p>
          <p class="small">Text only. Links and photos are off to keep catfish out.</p>
        </form>
      </div>`;
    }
    const ids = Object.keys(state.threads);
    const head = `<div class="screen-head"><span class="label">Messages</span><h1>Chats</h1></div>`;
    if (!ids.length) {
      return `<div class="screen-inner">${head}<div class="empty"><h2>No chats yet</h2><p class="small">Pick someone from today's drop to start one. You get one pick now and one more 12 hours later.</p><button class="btn btn-primary" data-action="go" data-to="matches">See today's drop</button></div></div>`;
    }
    const rows = ids.map((id) => {
      const p = PROFILES.find((x) => x.id === id);
      const t = state.threads[id];
      const last = t.log.filter((m) => m.from !== 'sys').at(-1);
      const unread = state.unread.includes(id);
      return `<li><button class="thread-link" data-action="open-thread" data-id="${id}">
        <span class="avatar tone-${p.tone}" aria-hidden="true">${esc(p.name[0])}</span>
        <span class="thread-preview"><strong>${esc(p.name)}</strong><span class="small">${last ? esc((last.from === 'me' ? 'You: ' : '') + last.text) : 'Say hi. You matched on interests first.'}</span></span>
        ${unread ? '<span class="unread-dot" role="img" aria-label="Unread"></span>' : `<span class="small num">${t.pct}%</span>`}
      </button></li>`;
    }).join('');
    return `<div class="screen-inner">${head}<ul class="threads">${rows}</ul></div>`;
  }

  function paintLog() {
    const log = $('#chat-log');
    if (!log || !openThread) return;
    const t = state.threads[openThread];
    log.innerHTML = t.log.map((m) => m.from === 'sys' ? `<p class="sys">${esc(m.text)}</p>` : `<p class="bubble ${m.from}">${esc(m.text)}</p>`).join('')
      + (t.typing ? '<p class="bubble them" aria-label="Typing"><span class="typing"><span></span><span></span><span></span></span></p>' : '');
    log.scrollTop = log.scrollHeight;
  }

  const LINK_RE = /(https?:\/\/|www\.|@[a-z0-9_.]{2,}\b|\b[a-z0-9-]+\.(com|net|org|io|co|app|me|gg|ly|tv|xyz)\b)/i;

  function mountChat() {
    state.unread = state.unread.filter((x) => x !== openThread);
    save();
    paintLog();
    const form = $('#composer');
    const ta = $('#msg');
    const err = $('#msg-error');
    ta.addEventListener('input', () => {
      err.hidden = true;
      ta.style.height = 'auto';
      ta.style.height = Math.min(120, ta.scrollHeight) + 'px';
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = ta.value.trim();
      if (!text) return;
      if (LINK_RE.test(text)) {
        err.textContent = 'Links and handles can\'t be sent in chat. Use Swap socials once you both want to.';
        err.hidden = false;
        return;
      }
      const t = state.threads[openThread];
      t.log.push({ from: 'me', text });
      ta.value = '';
      ta.style.height = '';
      save();
      paintLog();
      reply(openThread, 1800);
    });
  }

  function openSocials() {
    const p = PROFILES.find((x) => x.id === openThread);
    openSheet('Swap socials', `
      <p>Both of you have to agree. Your handle stays hidden until ${esc(p.name)} says yes.</p>
      <div class="field"><label class="label" for="handle">Your Instagram handle</label><input class="input" id="handle" autocomplete="off" value=""></div>
      <p class="notice" id="handle-error" hidden>Add a handle first.</p>
      <button class="btn btn-primary btn-block" data-action="send-socials">Send request</button>`);
  }

  async function sendSocials(btn) {
    const h = $('#handle').value.trim();
    if (!h) { $('#handle-error').hidden = false; return; }
    const id = openThread;
    const p = PROFILES.find((x) => x.id === id);
    const t = state.threads[id];
    btn.classList.add('is-loading');
    btn.innerHTML = `${ic('loader-circle', 'icon spinner')}Sending`;
    await wait(700);
    t.socials = 'pending';
    t.log.push({ from: 'sys', text: `You asked to swap socials. Waiting for ${p.name}.` });
    save();
    closeSheet();
    render();
    setTimeout(() => {
      t.socials = 'done';
      t.log.push({ from: 'sys', text: `${p.name} agreed. In the full app, both handles appear here.` });
      save();
      if (tab === 'messages' && openThread === id) render();
    }, 2500);
  }

  /* ---------- Profile ---------- */
  function renderProfile() {
    const s = state.settings;
    const groups = TREE.map((root) => {
      const ids = ORDER.filter((id) => rootOf(id).id === root.id && isPositive(state.answers[id]));
      if (!ids.length) return '';
      ids.sort((a, b) => (state.stars.includes(b) - state.stars.includes(a)));
      return `<div class="panel"><h3 class="label">${esc(root.name)}</h3><ul class="rows">${ids.map(rowHTML).join('')}</ul></div>`;
    }).join('');
    const photoSlots = photos.map((src, i) => src
      ? `<div class="photo has-img"><img src="${src}" alt="Your photo ${i + 1}"><button class="icon-btn remove" data-action="remove-photo" data-i="${i}" aria-label="Remove photo ${i + 1}">${ic('x')}</button></div>`
      : `<div class="photo"><label for="photo-${i}">${ic('image-plus')}Add photo</label><input type="file" id="photo-${i}" accept="image/*" data-photo="${i}"></div>`).join('');
    const seg = (key, opts) => `<div class="seg" role="radiogroup">${opts.map(([v, l]) => `<button class="chip" role="radio" aria-checked="${s[key] === v}" data-action="set" data-key="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const starPct = (state.stars.length / STAR_CAP) * 100;

    return `<div class="screen-inner">
      <div class="screen-head"><span class="label">Your profile</span><h1>Photos and interests. No bio.</h1></div>

      <section class="section">
        <div class="section-head"><h2>Photos</h2><span class="small num">${photos.filter(Boolean).length} of 3</span></div>
        <div class="photos">${photoSlots}</div>
        <p class="small">People see these only after they open your card in their drop.</p>
      </section>

      <section class="section">
        <div class="pair">
          <div class="field"><label class="label" for="first-name">First name</label><input class="input" id="first-name" autocomplete="given-name" value="${esc(state.name)}"></div>
          <div class="field"><label class="label" for="my-age">Age</label><input class="input num" id="my-age" type="number" min="18" max="99" inputmode="numeric" value="${esc(state.age)}"></div>
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Top 20</h2><span class="small num">${state.stars.length} of ${STAR_CAP}</span></div>
        <div class="bar"><span style="width:${starPct}%;background:var(--star)"></span></div>
        <p class="small">Starred interests count 3 times as much in matching. Save them for what you'd do six days a week.</p>
        <p class="notice" id="star-error" hidden>You've starred 20. Unstar one to add another.</p>
      </section>

      <section class="section">
        <div class="section-head"><h2>Interests</h2><span class="small num">${Object.values(state.answers).filter(isPositive).length} liked</span></div>
        ${groups || `<div class="empty"><p>Nothing here yet. Swipe right or up on interests to add them.</p><button class="btn btn-primary" data-action="go" data-to="swipe">Start swiping</button></div>`}
      </section>

      <section class="section" id="settings">
        <div class="section-head"><h2>Match settings</h2></div>
        <div class="panel panel-form">
          <div class="field"><span class="label">Looking for</span>${seg('lookingFor', [['romance', 'Romance'], ['friends', 'Friends'], ['both', 'Both']])}</div>
          <div class="field"><span class="label">I am</span>${seg('iAm', [['man', 'Man'], ['woman', 'Woman'], ['nonbinary', 'Non-binary or other']])}</div>
          <div class="field"><span class="label">Show me</span><div class="seg">${[['man', 'Men'], ['woman', 'Women'], ['nonbinary', 'Non-binary or other']].map(([v, l]) => `<button class="chip" aria-pressed="${s.showMe.includes(v)}" data-action="toggle-show" data-v="${v}">${l}</button>`).join('')}</div></div>
          <div class="field"><span class="label">Age range</span><div class="pair">
            <div class="field"><label class="small" for="age-min">From</label><input class="input num" id="age-min" type="number" min="18" max="99" inputmode="numeric" value="${s.ageMin}"></div>
            <div class="field"><label class="small" for="age-max">To</label><input class="input num" id="age-max" type="number" min="18" max="99" inputmode="numeric" value="${s.ageMax}"></div>
          </div></div>
          <div class="field"><label class="label" for="miles">Distance</label><div class="range-row"><input type="range" id="miles" min="1" max="50" value="${s.miles}"><output for="miles" class="num" id="miles-out">${s.miles} mi</output></div></div>
        </div>
      </section>

      <section class="section">
        <div class="panel" id="reset-panel">
          <p class="small">Clears swipes, stars, matches and chats on this device.</p>
          <button class="btn btn-secondary" data-action="reset-ask">${ic('rotate-ccw')}Reset demo</button>
        </div>
      </section>
    </div>`;
  }

  function rowHTML(id) {
    const n = NODES[id];
    const t = tierOf(id);
    const L = labelsFor(id);
    const starred = t === 'star';
    const priv = state.priv.includes(id);
    const tierText = starred ? 'Top 20' : t === 'maybe' ? L.maybe : L.yes;
    return `<li class="row">${ic(n.icon)}
      <span class="row-main"><span class="row-name">${esc(n.name)}</span><span class="tier tier-${t}">${esc(tierText)}${priv ? ' · Private' : ''}</span></span>
      <button class="icon-btn star-btn" aria-pressed="${starred}" data-action="star" data-id="${id}" aria-label="${starred ? 'Unstar' : 'Star'} ${esc(n.name)}">${ic('star')}</button>
      <button class="icon-btn lock-btn" aria-pressed="${priv}" data-action="private" data-id="${id}" aria-label="${priv ? 'Show on profile' : 'Make private'}: ${esc(n.name)}">${ic(priv ? 'lock' : 'lock-open')}</button>
    </li>`;
  }

  function toggleStar(id) {
    if (state.stars.includes(id)) state.stars = state.stars.filter((x) => x !== id);
    else if (state.stars.length >= STAR_CAP) { $('#star-error').hidden = false; return; }
    else state.stars.push(id);
    save();
    keepScroll(render);
  }
  function togglePrivate(id) {
    state.priv = state.priv.includes(id) ? state.priv.filter((x) => x !== id) : [...state.priv, id];
    save();
    keepScroll(render);
    toast(state.priv.includes(id) ? `${NODES[id].name} is private. It still counts in matching.` : `${NODES[id].name} shows on your profile.`);
  }
  function keepScroll(fn) { const y = screen.scrollTop; fn(); screen.scrollTop = y; }

  function applySample() {
    Object.entries(SAMPLE_ANSWERS).forEach(([id, v]) => {
      if (!(id in state.answers)) state.answers[id] = v;
      if (isPositive(v) && inheritsPrivate(id) && !state.priv.includes(id)) state.priv.push(id);
    });
    SAMPLE_STARS.forEach((id) => { if (!state.stars.includes(id)) state.stars.push(id); });
    // Rebuild the deck: unanswered children of positive answers first, then untouched categories.
    const deck = [];
    ORDER.forEach((id) => {
      if (id in state.answers) return;
      const n = NODES[id];
      if (!n.parent || isPositive(state.answers[n.parent])) deck.push(id);
    });
    state.deck = deck;
    state.history = [];
    save();
    render();
    toast('Sample answers added. You can still change them.');
  }

  /* ---------- Sheet ---------- */
  const sheet = $('#sheet');
  const scrim = $('#scrim');
  let lastFocus = null;
  function openSheet(title, body) {
    lastFocus = document.activeElement;
    $('#toast').classList.remove('is-on');
    $('#sheet-title').textContent = title;
    $('#sheet-body').innerHTML = body;
    sheet.hidden = false; scrim.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => { sheet.classList.add('is-open'); scrim.classList.add('is-open'); }));
    $('#sheet-close').focus();
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.remove('is-open'); scrim.classList.remove('is-open');
    setTimeout(() => { sheet.hidden = true; scrim.hidden = true; }, 260);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(text, actionLabel, fn) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(text)}</span>${actionLabel ? `<button type="button">${esc(actionLabel)}</button>` : ''}`;
    if (actionLabel) el.querySelector('button').onclick = () => { el.classList.remove('is-on'); fn(); };
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 3600);
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action], .tab');
    if (!el) return;
    if (el.classList.contains('tab')) return setTab(el.dataset.tab);
    const { action, id } = el.dataset;
    switch (action) {
      case 'go':
        setTab(el.dataset.to);
        if (el.dataset.anchor) $('#' + el.dataset.anchor)?.scrollIntoView();
        break;
      case 'swipe': fly(el.dataset.v); break;
      case 'undo': undo(); break;
      case 'sample': applySample(); break;
      case 'scan': scan(el); break;
      case 'open-match': openMatch(id); break;
      case 'pick': pick(id); break;
      case 'keep': keep(el, id); break;
      case 'skip-wait':
        state.drop.picks[0].at -= PICK_GAP_MS;
        save(); render(); toast('Second pick unlocked.');
        break;
      case 'open-thread': closeSheet(); openThread = id; if (tab !== 'messages') setTab('messages'); else render(); break;
      case 'close-thread': openThread = null; render(); break;
      case 'socials': openSocials(); break;
      case 'send-socials': sendSocials(el); break;
      case 'star': toggleStar(id); break;
      case 'private': togglePrivate(id); break;
      case 'set': state.settings[el.dataset.key] = el.dataset.v; save(); keepScroll(render); break;
      case 'toggle-show': {
        const v = el.dataset.v, cur = state.settings.showMe;
        state.settings.showMe = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
        save(); keepScroll(render); break;
      }
      case 'remove-photo': photos[+el.dataset.i] = null; keepScroll(render); break;
      case 'reset-ask':
        $('#reset-panel').innerHTML = `<p class="small">Reset everything? This can't be undone.</p><div class="seg"><button class="btn btn-primary" data-action="reset">Reset demo</button><button class="btn btn-secondary" data-action="reset-cancel">Cancel</button></div>`;
        break;
      case 'reset-cancel': keepScroll(render); break;
      case 'reset':
        state = fresh(); photos.fill(null); save(); setTab('swipe'); toast('Demo reset.');
        break;
    }
  });
  $('#sheet-close').addEventListener('click', closeSheet);
  scrim.addEventListener('click', closeSheet);

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.photo !== undefined && t.files && t.files[0]) {
      const i = +t.dataset.photo;
      const reader = new FileReader();
      reader.onload = () => { photos[i] = reader.result; keepScroll(render); };
      reader.readAsDataURL(t.files[0]);
    }
    if (t.id === 'age-min' || t.id === 'age-max') {
      const v = Math.min(99, Math.max(18, parseInt(t.value, 10) || 18));
      state.settings[t.id === 'age-min' ? 'ageMin' : 'ageMax'] = v;
      if (state.settings.ageMin > state.settings.ageMax) state.settings.ageMax = state.settings.ageMin;
      save(); keepScroll(render);
    }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'miles') { state.settings.miles = +t.value; $('#miles-out').textContent = `${t.value} mi`; save(); }
    if (t.id === 'first-name') { state.name = t.value; save(); }
    if (t.id === 'my-age') { state.age = t.value; save(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return closeSheet();
    if (tab !== 'swipe' || !sheet.hidden || e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); fly('yes'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); fly('no'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); fly('up'); }
    else if (e.key.toLowerCase() === 'z') undo();
  });

  setInterval(() => {
    const els = document.querySelectorAll('[data-countdown]');
    if (!els.length) return;
    const at = nextPickAt();
    if (at && Date.now() >= at) { closeSheet(); render(); return; }
    els.forEach((el) => { el.textContent = fmtClock(at - Date.now()); });
  }, 1000);

  // Tab icons are drawn here so the markup stays free of inline SVG.
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = ic(el.dataset.icon); });
  setTab('swipe');
})();
