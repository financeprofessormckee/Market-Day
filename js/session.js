(function (root, factory) {
  var api = factory(root.BarterModel || (typeof require === 'function' ? require('./model.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MarketSession = api;
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';
  function signature(b) { return JSON.stringify([b.id, b.version || 'practice-v1', b.start, b.cap || null, b.stalls, b.best]); }
  function replay(b, log) {
    if (!Array.isArray(log) || log.length > b.stalls.reduce(function (n, s) { return n + s.times; }, 0)) throw new Error('Invalid saved trade log');
    return log.reduce(function (s, id) { return M.trade(b, s, id); }, M.start(b));
  }
  function fresh(b, first) { return { state: M.start(b), closed: false, replay: !!first, first: first || null }; }
  function restore(b, data) {
    if (!data) return fresh(b);
    if (data.schema !== 1 || data.signature !== signature(b) || typeof data.closed !== 'boolean' || typeof data.replay !== 'boolean') throw new Error('Saved market does not match this puzzle');
    var first = null;
    if (data.first) { first = { log: replay(b, data.first.log).log }; }
    if ((data.closed && !first) || (data.replay && !first) || (first && !data.replay && (!data.closed || JSON.stringify(first.log) !== JSON.stringify(data.log)))) throw new Error('Invalid saved result');
    return { state: replay(b, data.log), closed: data.closed, replay: data.replay, first: first };
  }
  function pack(b, attempt) {
    return { schema: 1, signature: signature(b), log: attempt.state.log, closed: attempt.closed, replay: attempt.replay, first: attempt.first };
  }
  function trade(b, attempt, id) {
    if (attempt.closed) throw new Error('Market closed');
    return Object.assign({}, attempt, { state: M.trade(b, attempt.state, id) });
  }
  function undo(b, attempt) {
    if (attempt.closed) return attempt;
    return Object.assign({}, attempt, { state: replay(b, attempt.state.log.slice(0, -1)) });
  }
  function close(b, attempt) {
    if (attempt.closed) return attempt;
    return Object.assign({}, attempt, { closed: true, first: attempt.first || { log: attempt.state.log.slice() } });
  }
  return { signature: signature, replay: replay, fresh: fresh, restore: restore, pack: pack, trade: trade, undo: undo, close: close };
});
