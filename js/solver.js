/* Exact breadth-first search. State limits are failures, never approximate answers. */
(function (root, factory) {
  var api = factory(root.BarterModel || (typeof require === 'function' ? require('./model.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BarterSolver = api;
})(typeof self !== 'undefined' ? self : this, function (model) {
  'use strict';

  function solve(board, options) {
    options = options || {};
    model.validate(board);
    var limit = options.maxStates === undefined ? 100000 : options.maxStates;
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid state limit');
    var seen = new Set(), finals = new Set(), queue = [model.start(board)];
    function key(s) { return JSON.stringify([s.holdings, s.used]); }
    seen.add(key(queue[0]));
    var best = -Infinity, line = [], optimalStates = 0, transitions = 0, usable = new Set();
    for (var head = 0; head < queue.length; head++) {
      var state = queue[head], score = state.holdings[board.home];
      var qualifies = !options.requiredStalls || options.requiredStalls.every(function (id) { return state.used[id] > 0; });
      if (qualifies) {
        finals.add(score);
        if (score > best) { best = score; line = state.log; optimalStates = 1; }
        else if (score === best) optimalStates++;
      }
      board.stalls.forEach(function (stall) {
        if (options.excludeMixed && model.costs(stall).length > 1) return;
        if (options.excludeStalls && options.excludeStalls.indexOf(stall.id) >= 0) return;
        if (model.blocked(board, state, stall.id)) return;
        usable.add(stall.id);
        transitions++;
        var next = model.trade(board, state, stall.id), k = key(next);
        if (seen.has(k)) return;
        if (seen.size >= limit) throw new Error('Solver state limit exceeded (' + limit + ')');
        seen.add(k); queue.push(next);
      });
    }
    var reachable = Array.from(finals).sort(function (a, b) { return a - b; });
    return { best: best, reachable: reachable, states: seen.size, line: line,
      runnerUp: reachable.length > 1 ? reachable[reachable.length - 2] : null,
      metrics: { shortestOptimalTrades: line.length, optimalStates: optimalStates, transitions: transitions,
        deadStalls: board.stalls.filter(function (s) { return !usable.has(s.id); }).map(function (s) { return s.id; }) } };
  }

  return { solve: solve };
});
