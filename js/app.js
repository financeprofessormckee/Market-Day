/* Static daily game. Calendar and attempt logic stay separately testable. */
(function () {
  'use strict';
  var B = window.BarterBoards, M = window.BarterModel, C = window.MarketCalendar, S = window.MarketSession;
  var $ = function (id) { return document.getElementById(id); };
  var GOOD = Object.fromEntries(B.goods.map(function (g) { return [g.id, g]; }));
  var board = null, attempt = null, selected = null, manifest = null, progress = {};
  var currentDay = C.today(), view = 'today', months = new Map(), loadingToken = 0, flashTimer, announceTimer;
  var requested = C.selection(location.search, currentDay);

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, cls, action) {
    var node = el('button', cls, text); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function icon(good) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.setAttribute('class', 'good-icon'); node.setAttribute('aria-hidden', 'true'); node.setAttribute('focusable', 'false');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', 'assets/goods.svg#' + good); node.appendChild(use); return node;
  }
  function lot(g) {
    var node = el('span', 'lot');
    node.append(icon(g.good), el('span', '', g.qty + ' ' + GOOD[g.good].name)); return node;
  }
  function costsText(stall) { return M.costs(stall).map(function (g) { return g.qty + ' ' + g.good; }).join(' + '); }
  function announce(text) {
    clearTimeout(announceTimer); $('announce').textContent = '';
    announceTimer = setTimeout(function () { $('announce').textContent = text; }, 25);
  }
  function flash(text) {
    clearTimeout(flashTimer); $('toast').textContent = text; $('toast').hidden = false; announce(text);
    flashTimer = setTimeout(function () { $('toast').hidden = true; }, 3000);
  }
  function storageNotice(text) { $('storage-notice').textContent = text; $('storage-notice').hidden = false; }
  function read(key) {
    try { return localStorage.getItem(key); }
    catch (e) { storageNotice('Progress cannot be saved in this browser. You can still play.'); return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); }
    catch (e) { storageNotice('Progress cannot be saved in this browser. Keep this page open to continue your game.'); }
  }
  function parse(text) { return text ? JSON.parse(text) : null; }
  try { progress = parse(read('market-day:progress')) || {}; if (typeof progress !== 'object' || Array.isArray(progress)) progress = {}; }
  catch (e) { progress = {}; }
  var theme = read('market-day:theme');
  if (['light', 'dark', 'system'].indexOf(theme) < 0) theme = 'system';
  function applyTheme(value) {
    if (value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = value;
    $('theme').value = value;
  }
  applyTheme(theme);
  $('theme').addEventListener('change', function () { applyTheme(this.value); write('market-day:theme', this.value); });
  if (window.ResizeObserver) new ResizeObserver(function () {
    document.documentElement.style.setProperty('--ledger-space', Math.ceil($('ledger').getBoundingClientRect().height + 12) + 'px');
  }).observe($('ledger'));

  function storageKey() { return 'market-day:attempt:' + selected.kind + ':' + selected.id + ':' + (board.version || 'practice-v1'); }
  function progressKey(kind, id) { return kind + ':' + id; }
  function save() {
    if (!board || !attempt) return;
    write(storageKey(), JSON.stringify(S.pack(board, attempt)));
    var key = progressKey(selected.kind, selected.id), old = progress[key] || {};
    progress[key] = { completed: !!attempt.first, perfect: !!old.perfect || (attempt.closed && M.score(board, attempt.state).perfect), started: attempt.state.log.length > 0 };
    write('market-day:progress', JSON.stringify(progress)); renderDays();
  }
  function status(kind, id) {
    var p = progress[progressKey(kind, id)];
    return p && p.perfect ? '★' : p && p.completed ? '✓' : p && p.started ? '·' : '';
  }
  function statusLabel(kind, id) {
    var value = status(kind, id);
    return value === '★' ? ', perfect' : value === '✓' ? ', completed' : value === '·' ? ', in progress' : '';
  }
  function nav() {
    ['today', 'archive', 'practice'].forEach(function (id) { $(id).setAttribute('aria-pressed', String(view === id)); });
    $('archive').setAttribute('aria-expanded', String(!$('archive-picker').hidden));
  }
  function available(date) { return manifest && manifest.dates.indexOf(date) >= 0; }
  function renderDays() {
    $('days').replaceChildren();
    var practice = view === 'practice', list = practice ? C.days : C.week(currentDay);
    list.forEach(function (id, i) {
      var short = B.boards[i].short;
      var b = button('', '', function () { open({ kind: practice ? 'practice' : 'daily', id: id }, true, true); });
      b.append(el('span', '', short), el('span', 'day-number', practice ? B.boards[i].difficulty.split(' ')[0] : String(Number(id.slice(-2)))),
        el('span', 'day-status', status(practice ? 'practice' : 'daily', id) || '\u00a0'));
      if (practice) b.querySelector('.day-number').hidden = true;
      var future = !practice && id > currentDay;
      b.disabled = !practice && (future || !available(id));
      b.setAttribute('aria-description', (practice ? B.boards[i].day + ' practice, ' + B.boards[i].difficulty : C.label(id)) +
        (future ? ', opens later' : !practice && !available(id) ? ', unavailable' : statusLabel(practice ? 'practice' : 'daily', id)));
      if (selected && selected.id === id && selected.kind === (practice ? 'practice' : 'daily')) b.setAttribute('aria-current', 'true');
      $('days').appendChild(b);
    });
    nav();
  }
  async function fetchJSON(url) {
    var response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error('Market data could not be loaded');
    return response.json();
  }
  function loadMonth(month) {
    if (!/^\d{4}-\d{2}$/.test(month)) return Promise.reject(new Error('Invalid month'));
    if (!months.has(month)) {
      months.set(month, fetchJSON('data/' + month + '.json').then(function (data) {
        if (!data || !Array.isArray(data.puzzles)) throw new Error('Invalid market data');
        return data.puzzles;
      }).catch(function (error) { months.delete(month); throw error; }));
    }
    return months.get(month);
  }
  function setUrl(selection, push) {
    var url = C.link(location.href, selection.kind, selection.id);
    if (push && url !== location.href) history.pushState(null, '', url);
  }
  function hideGame() {
    ['intro', 'welcome', 'ledger', 'play-area', 'result', 'log-wrap'].forEach(function (id) { $(id).hidden = true; });
  }
  async function open(selection, push, focus) {
    var token = ++loadingToken; selected = selection;
    view = selection.kind === 'practice' ? 'practice' : selection.id === currentDay ? 'today' : 'archive';
    board = null; attempt = null; hideGame(); $('archive-picker').hidden = true;
    $('unavailable').hidden = true; $('loading').hidden = false; $('toast').hidden = true;
    renderDays(); setUrl(selection, push);
    try {
      var next;
      if (selection.kind === 'practice') next = B.board(selection.id);
      else {
        if (!C.valid(selection.id) || selection.id > currentDay || !available(selection.id)) throw new Error('This date is not in the published schedule.');
        next = (await loadMonth(selection.id.slice(0, 7))).find(function (b) { return b.date === selection.id; });
        if (!next || next.id !== selection.id || !next.version || !Number.isSafeInteger(next.best) ||
            !Array.isArray(next.solution) || !next.solution.every(function (s) { return typeof s === 'string'; })) throw new Error('This market’s data is unavailable.');
      }
      if (token !== loadingToken) return;
      board = M.normalize(next);
      try { attempt = S.restore(board, parse(read(storageKey()))); }
      catch (e) {
        attempt = S.fresh(board);
        storageNotice('A saved attempt could not be read for this market. A fresh attempt is ready.');
      }
      ['intro', 'ledger', 'play-area', 'log-wrap'].forEach(function (id) { $(id).hidden = false; });
      $('welcome').hidden = read('market-day:welcome') === 'seen';
      $('loading').hidden = true; renderIntro(); render(); save();
      if (attempt.closed) renderResult(false);
      if (focus) { $('puzzle-heading').focus(); announce('Opened ' + puzzleLabel() + '.'); }
    } catch (e) {
      if (token !== loadingToken) return;
      board = null; attempt = null; hideGame(); $('loading').hidden = true;
      $('unavailable').hidden = false;
      $('unavailable-message').textContent = manifest && currentDay < manifest.first ?
        'The first daily market opens ' + C.label(manifest.first) + '. The seven practice markets are open now.' :
        manifest && selection.id > manifest.last ?
        'This market has not been posted yet. Choose an earlier date in Archive, or visit the seven practice markets.' :
        'This market could not be opened. Try again, choose an earlier date in Archive, or visit the seven practice markets.';
      if (focus) { $('unavailable-heading').tabIndex = -1; $('unavailable-heading').focus(); }
    }
  }
  function puzzleLabel() { return selected.kind === 'practice' ? board.day + ' practice' : C.label(selected.id); }
  function renderIntro() {
    $('intro').replaceChildren();
    $('intro').append(el('p', 'eyebrow', selected.kind === 'practice' ? 'Practice market · ' + board.difficulty : 'Daily market · ' + board.difficulty));
    var heading = el('h2', '', puzzleLabel()); heading.id = 'puzzle-heading'; heading.tabIndex = -1;
    $('intro').append(heading, el('p', 'goal', 'Start with ' + board.start.fish + ' fish. Bring home the best possible haul.'),
      el('p', 'note', board.note || 'Fixed offers, whole lots, limited stock. Look for the profitable route.'));
    if (attempt.replay) $('intro').append(el('p', 'muted', 'Replay · your first result is kept.'));
    document.title = 'Market Day · ' + puzzleLabel();
  }
  function stallArt() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 40 34'); svg.setAttribute('class', 'stall-art'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.innerHTML = '<path d="M7 13v17h26V13M3 13l6-9h22l6 9zM7 23h26M14 4l-2 9m8-9v9m6-9 2 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>';
    return svg;
  }
  function render(previous) {
    var state = attempt.state;
    $('holdings').replaceChildren();
    M.goodsOf(board).forEach(function (good) {
      var hold = el('div', 'hold' + (good === board.home ? ' home' : ''));
      if (previous && previous.holdings[good] !== state.holdings[good]) hold.classList.add(state.holdings[good] > previous.holdings[good] ? 'up' : 'down');
      hold.append(icon(good), el('span', 'n', String(state.holdings[good])), el('span', 'nm', GOOD[good].name));
      $('holdings').appendChild(hold);
    });
    $('basket').hidden = !board.cap;
    if (board.cap) {
      var carried = M.basket(board, state);
      $('basket').replaceChildren(icon('basket'), el('span', '', 'Basket: ' + carried + ' / ' + board.cap + ' · fish take no space'));
      $('basket').classList.toggle('full', carried === board.cap);
    }
    $('stalls').replaceChildren();
    board.stalls.forEach(function (stall) {
      var reason = attempt.closed ? 'Market closed' : M.blocked(board, state, stall.id);
      var remaining = stall.times - state.used[stall.id];
      var node = button('', 'stall', function () { doTrade(stall.id); }); node.id = 'stall-' + stall.id;
      if (reason) node.setAttribute('aria-disabled', 'true');
      var heading = el('span', 'stall-heading'), who = el('span', 'who');
      who.append(stallArt(), el('span', '', stall.name));
      heading.append(who, el('span', 'left', remaining === 0 ? 'Sold out' : remaining + (remaining === 1 ? ' trade left' : ' trades left')));
      var deal = el('span', 'deal');
      M.costs(stall).forEach(function (g, i) { if (i) deal.append(el('span', 'plus', '+')); deal.append(lot(g)); });
      deal.append(el('span', 'arrow', '→'), lot(stall.get));
      var foot = el('span', 'stall-foot'), pips = el('span', 'pips'); pips.setAttribute('aria-hidden', 'true');
      for (var n = 0; n < stall.times; n++) pips.append(el('span', 'pip' + (n < state.used[stall.id] ? ' used' : '')));
      foot.append(pips, el('span', 'why', reason || 'Ready to trade'));
      node.append(heading, deal, foot);
      node.setAttribute('aria-description', 'Give ' + costsText(stall) + ', get ' + stall.get.qty + ' ' + stall.get.good + '. ' +
        remaining + ' of ' + stall.times + ' trades left.' + (reason ? ' ' + reason + '.' : ''));
      $('stalls').appendChild(node);
    });
    $('undo').disabled = attempt.closed || !state.log.length;
    $('close').disabled = attempt.closed;
    $('log-count').textContent = state.log.length; $('log').replaceChildren();
    state.log.forEach(function (id) {
      var s = board.stalls.find(function (x) { return x.id === id; });
      $('log').append(el('li', '', s.name + ': give ' + costsText(s) + ', get ' + s.get.qty + ' ' + s.get.good + '.'));
    });
  }
  function doTrade(id) {
    if (!attempt || attempt.closed) return;
    var reason = M.blocked(board, attempt.state, id);
    if (reason) {
      var node = $('stall-' + id); node.classList.remove('nope'); void node.offsetWidth; node.classList.add('nope');
      flash(reason + '.'); return;
    }
    var previous = attempt.state, s = board.stalls.find(function (x) { return x.id === id; });
    attempt = S.trade(board, attempt, id); save(); render(previous); $('stall-' + id).focus({ preventScroll: true });
    announce('Gave ' + costsText(s) + ' for ' + s.get.qty + ' ' + s.get.good + '. Now carrying ' +
      Object.entries(attempt.state.holdings).map(function (x) { return x[1] + ' ' + x[0]; }).join(', ') +
      (board.cap ? '. Basket ' + M.basket(board, attempt.state) + ' of ' + board.cap : '') + '.');
  }
  function renderResult(focus) {
    var score = M.score(board, attempt.state), result = $('result');
    result.replaceChildren(); result.hidden = false; result.classList.toggle('celebrate', !!focus && score.perfect);
    var heading = el('h2', '', attempt.replay ? 'Market closed · replay' : 'Market closed'); heading.id = 'result-heading'; heading.tabIndex = -1;
    var tally = el('p', 'score ' + (score.perfect ? 'perfect' : 'short'), score.final + ' fish ');
    tally.append(el('small', '', '/ ' + score.best + ' possible'));
    result.append(heading, tally, el('p', '', score.perfect ? 'Best possible haul. Beautiful trading!' :
      score.final > score.start ? 'A good haul. There’s a little more to find.' :
      score.final === score.start ? 'You broke even. Another route could bring home more.' : 'A few fish went astray. There’s a better route through the market.'));
    var waste = Object.entries(score.wasted).map(function (x) { return x[1] + ' ' + x[0]; });
    if (waste.length) result.append(el('p', 'muted', 'Left unsold: ' + waste.join(', ') + '.'));
    if (attempt.replay) result.append(el('p', 'muted', 'Your first result: ' + M.score(board, S.replay(board, attempt.first.log)).final + ' fish. This attempt is a replay.'));
    var share = 'Market Day · ' + puzzleLabel() + (attempt.replay ? ' · Replay' : '') + '\n' +
      '🐟 ' + score.final + '/' + score.best + (score.perfect ? ' ★' : '') + ' · ' + attempt.state.log.length + ' trades\n' +
      C.link(location.href, selected.kind, selected.id);
    var preview = el('pre', 'share-preview', share); preview.id = 'share-text'; preview.tabIndex = 0;
    result.append(preview);
    var actions = el('div', 'actions');
    actions.append(button('Copy result + link', 'btn primary', async function () {
      try { await navigator.clipboard.writeText(share); flash('Result and puzzle link copied. Ready to paste into Discord.'); }
      catch (e) {
        preview.focus(); var range = document.createRange(); range.selectNodeContents(preview);
        var selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        flash('Result selected. Use your browser’s Copy command.');
      }
    }));
    if (typeof navigator.share === 'function') actions.append(button('Share', 'btn', async function () {
      try { await navigator.share({ title: 'Market Day', text: share }); }
      catch (e) { if (e.name !== 'AbortError') flash('Sharing is unavailable. Use Copy result + link.'); }
    }));
    result.append(actions);
    var solution = el('details', 'solution'), summary = el('summary', '', 'See a route to ' + score.best + ' fish'), steps = el('ol');
    board.solution.forEach(function (step) { steps.append(el('li', '', step)); });
    solution.append(summary, steps); result.append(solution);
    result.append(button('Play this market again', 'btn', reset));
    if (focus) { heading.focus(); announce('Market closed. ' + score.final + ' of ' + score.best + ' fish.'); }
  }
  function reset() {
    if (!board || !attempt) return;
    attempt = S.fresh(board, attempt.first); $('result').hidden = true; save(); renderIntro(); render();
    $('puzzle-heading').focus(); announce(attempt.replay ? 'Replay started. Your first result is kept.' : 'Market reset.');
  }
  $('undo').addEventListener('click', function () {
    if (!attempt || attempt.closed || !attempt.state.log.length) return;
    var previous = attempt.state; attempt = S.undo(board, attempt); save(); render(previous);
    if ($('undo').disabled) $('reset').focus();
    announce('Undid the last trade. You have ' + attempt.state.holdings.fish + ' fish.');
  });
  $('reset').addEventListener('click', reset);
  $('close').addEventListener('click', function () {
    if (!attempt || attempt.closed) return;
    attempt = S.close(board, attempt); save(); render(); renderResult(true);
  });
  $('dismiss-welcome').addEventListener('click', function () { write('market-day:welcome', 'seen'); $('welcome').hidden = true; $('puzzle-heading').focus(); });

  function archiveDates() {
    $('archive-dates').replaceChildren();
    var month = $('archive-month').value;
    var dates = manifest ? manifest.dates.filter(function (d) { return d <= currentDay && d.startsWith(month); }) : [];
    if (!dates.length) { $('archive-dates').append(el('p', '', 'No earlier markets are available yet.')); return; }
    dates.forEach(function (date) {
      var b = button(C.label(date).replace(/, \d{4}$/, '') + ' ' + status('daily', date), '', function () { open({ kind: 'daily', id: date }, true, true); });
      b.setAttribute('aria-description', C.label(date) + statusLabel('daily', date)); $('archive-dates').appendChild(b);
    });
  }
  function showArchive() {
    view = 'archive'; $('archive-picker').hidden = false;
    var list = manifest ? manifest.months.filter(function (m) { return m <= currentDay.slice(0, 7); }).slice().reverse() : [];
    $('archive-month').replaceChildren();
    list.forEach(function (month) { var option = el('option', '', month); option.value = month; $('archive-month').append(option); });
    $('archive-month').disabled = !list.length; archiveDates(); renderDays();
    $('archive-heading').tabIndex = -1; $('archive-heading').focus();
  }
  $('archive-month').addEventListener('change', archiveDates);
  $('archive').addEventListener('click', showArchive);
  $('today').addEventListener('click', function () { open({ kind: 'daily', id: currentDay }, true, true); });
  function practice() { open({ kind: 'practice', id: 'mon' }, true, true); }
  $('practice').addEventListener('click', practice); $('choose-practice').addEventListener('click', practice);
  $('retry').addEventListener('click', async function () {
    months.clear(); await refreshManifest(); open(selected || { kind: 'daily', id: currentDay }, false, true);
  });
  window.addEventListener('popstate', function () {
    var choice = C.selection(location.search, C.today());
    if (choice.error) { flash(choice.error); open({ kind: 'daily', id: currentDay }, false, true); }
    else open(choice, false, true);
  });
  function checkDay() {
    var now = C.today();
    if (now !== currentDay) {
      currentDay = now; $('new-market').hidden = false; refreshManifest().then(renderDays);
      announce('A new market is open. Your current game is kept.');
    }
  }
  setInterval(checkDay, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkDay(); });
  $('new-market').addEventListener('click', function () { $('new-market').hidden = true; open({ kind: 'daily', id: currentDay }, true, true); });
  async function refreshManifest() {
    try {
      var data = await fetchJSON('data/manifest.json');
      if (data.schema !== 1 || !Array.isArray(data.dates) || !data.dates.every(C.valid) ||
          !Array.isArray(data.months) || !data.months.every(function (m) { return /^\d{4}-\d{2}$/.test(m); })) throw new Error('Invalid schedule');
      manifest = data;
    } catch (e) { manifest = null; }
  }
  renderDays();
  refreshManifest().then(function () {
    // Do not overwrite a practice market chosen while the initial fetch was pending.
    if (loadingToken > 0) { renderDays(); return; }
    if (requested.error) {
      $('loading').hidden = true; $('unavailable').hidden = false; $('unavailable-message').textContent = requested.error + ' Choose Today, Archive, or Practice.';
      selected = { kind: 'daily', id: currentDay }; renderDays();
    } else open(requested, false, false);
  });
})();
