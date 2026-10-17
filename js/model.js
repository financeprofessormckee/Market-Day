/* Pure game rules: whole-lot trades, limited repeats, only the home good counts at close. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BarterModel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function costs(stall) { return Array.isArray(stall.give) ? stall.give : [stall.give]; }
  function normalize(board) {
    var b = JSON.parse(JSON.stringify(board));
    b.stalls.forEach(function (s) { s.give = costs(s); });
    validate(b);
    return b;
  }
  function validate(board) {
    var goods = ['fish', 'bread', 'salt', 'wool'];
    function qty(n) { return Number.isSafeInteger(n) && n > 0 && n <= 100; }
    if (!board || board.home !== 'fish' || !board.start || !qty(board.start.fish) ||
        !Array.isArray(board.stalls) || board.stalls.length < 1 || board.stalls.length > 7) throw new Error('Invalid board');
    if (Object.keys(board.start).some(function (g) { return goods.indexOf(g) < 0 || !Number.isSafeInteger(board.start[g]) || board.start[g] < 0; })) throw new Error('Invalid starting goods');
    if (board.cap !== undefined && !qty(board.cap)) throw new Error('Invalid basket capacity');
    var ids = new Set();
    board.stalls.forEach(function (s) {
      if (!s || !/^[a-z][a-z0-9-]*$/.test(s.id) || ids.has(s.id) || !qty(s.times) || s.times > 8) throw new Error('Invalid stall');
      ids.add(s.id);
      var give = costs(s), names = new Set();
      if (!give.length || give.length > 4) throw new Error('Invalid trade costs');
      give.concat([s.get]).forEach(function (g) {
        if (!g || goods.indexOf(g.good) < 0 || !qty(g.qty)) throw new Error('Invalid trade good');
      });
      give.forEach(function (g) {
        if (names.has(g.good)) throw new Error('Duplicate trade ingredient');
        names.add(g.good);
      });
    });
    if (board.cap !== undefined && basket(board, start(board)) > board.cap) throw new Error('Starting basket over capacity');
    return board;
  }

  function goodsOf(board) {
    var ids = [board.home];
    Object.keys(board.start).forEach(function (g) { if (ids.indexOf(g) < 0) ids.push(g); });
    board.stalls.forEach(function (s) {
      costs(s).concat([s.get]).forEach(function (lot) { if (ids.indexOf(lot.good) < 0) ids.push(lot.good); });
    });
    return ids;
  }

  function start(board) {
    var holdings = {}, used = {};
    goodsOf(board).forEach(function (g) { holdings[g] = board.start[g] || 0; });
    board.stalls.forEach(function (s) { used[s.id] = 0; });
    return { holdings: holdings, used: used, log: [] };
  }

  function findStall(board, id) {
    var s = board.stalls.find(function (x) { return x.id === id; });
    if (!s) throw new Error('Unknown stall: ' + id);
    return s;
  }

  /* Returns null when the trade is allowed, otherwise a short player-facing reason. */
  function blocked(board, state, stallId) {
    var s = findStall(board, stallId);
    if (state.used[s.id] >= s.times) return 'Sold out';
    var give = costs(s);
    for (var i = 0; i < give.length; i++) {
      var lot = give[i], have = state.holdings[lot.good];
      if (have < lot.qty) return 'Need ' + lot.qty + ' ' + lot.good + ', you have ' + have;
    }
    if (board.cap) {
      var after = basket(board, state) + (s.get.good === board.home ? 0 : s.get.qty);
      give.forEach(function (lot) { if (lot.good !== board.home) after -= lot.qty; });
      if (after > board.cap) return 'Basket full (max ' + board.cap + ')';
    }
    return null;
  }

  /* Goods carried other than the home good; only limited on boards with a `cap`. */
  function basket(board, state) {
    var n = 0;
    Object.keys(state.holdings).forEach(function (g) { if (g !== board.home) n += state.holdings[g]; });
    return n;
  }

  function trade(board, state, stallId) {
    var reason = blocked(board, state, stallId);
    if (reason) throw new Error(reason);
    var s = findStall(board, stallId);
    var holdings = Object.assign({}, state.holdings), used = Object.assign({}, state.used);
    costs(s).forEach(function (lot) { holdings[lot.good] -= lot.qty; });
    holdings[s.get.good] += s.get.qty;
    used[s.id] += 1;
    return { holdings: holdings, used: used, log: state.log.concat([s.id]) };
  }

  function score(board, state) {
    var wasted = {};
    Object.keys(state.holdings).forEach(function (g) {
      if (g !== board.home && state.holdings[g] > 0) wasted[g] = state.holdings[g];
    });
    var final = state.holdings[board.home];
    return { final: final, start: board.start[board.home], best: board.best, perfect: final === board.best, wasted: wasted };
  }

  return { costs: costs, normalize: normalize, validate: validate, goodsOf: goodsOf, start: start, blocked: blocked, basket: basket, trade: trade, score: score };
});
