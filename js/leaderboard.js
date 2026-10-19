/* Leaderboard rules shared by the page and the server: the server recomputes every score from the trade log. */
(function (root, factory) {
  var api = factory(root.BarterModel || (typeof require === 'function' ? require('./model.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MarketLeaderboard = api;
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';
  var NAME = /^[\p{L}\p{N}][\p{L}\p{N} _.'-]{0,19}$/u, TOKEN = /^[0-9a-f]{32}$/, LIMIT = 50;
  var NAME_RULE = 'Nicknames use 1–20 letters, numbers, spaces, or . _ \' - and start with a letter or number.';

  function nickname(value) {
    var name = typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
    if (!NAME.test(name)) throw new Error(NAME_RULE);
    return name;
  }
  function validToken(value) { return typeof value === 'string' && TOKEN.test(value); }
  function newToken(crypto) {
    var bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
  }
  /* Replays a first-attempt log; throws on any illegal or malformed trade. */
  function verify(board, log) {
    var most = board.stalls.reduce(function (n, s) { return n + s.times; }, 0);
    if (!Array.isArray(log) || log.length > most || !log.every(function (id) { return typeof id === 'string' && id.length <= 40; })) throw new Error('Invalid trade log');
    var state = log.reduce(function (s, id) { return M.trade(board, s, id); }, M.start(board));
    var score = M.score(board, state);
    return { fish: score.final, trades: log.length, best: score.best, perfect: score.perfect };
  }
  /* Higher haul first, then fewer trades, then whoever posted first. */
  function compare(a, b) { return b.fish - a.fish || a.trades - b.trades || a.submitted - b.submitted; }
  /* Competition ranking: ties on haul and trades share a rank. */
  function rank(rows) {
    var sorted = rows.slice().sort(compare);
    return sorted.map(function (row, i) {
      var prev = sorted[i - 1];
      row.rank = prev && prev.fish === row.fish && prev.trades === row.trades ? prev.rank : i + 1;
      return row;
    });
  }
  function payload(board, date, log, name, token) {
    return { date: date, version: board.version, log: log.slice(), nickname: nickname(name), token: token };
  }
  return { LIMIT: LIMIT, NAME_RULE: NAME_RULE, nickname: nickname, validToken: validToken, newToken: newToken, verify: verify, compare: compare, rank: rank, payload: payload };
});
