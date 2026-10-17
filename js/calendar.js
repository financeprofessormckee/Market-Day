(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MarketCalendar = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  function valid(date) {
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !isNaN(Date.parse(date + 'T12:00:00Z')) && new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date;
  }
  function today(now) {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now || new Date());
    function part(type) { return parts.find(function (p) { return p.type === type; }).value; }
    return part('year') + '-' + part('month') + '-' + part('day');
  }
  function add(date, n) {
    if (!valid(date) || !Number.isInteger(n)) throw new Error('Invalid calendar date');
    var d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function weekday(date) {
    if (!valid(date)) throw new Error('Invalid calendar date');
    return (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
  }
  function week(date) { var mon = add(date, -weekday(date)); return days.map(function (_, i) { return add(mon, i); }); }
  function label(date) {
    if (!valid(date)) throw new Error('Invalid calendar date');
    return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date + 'T12:00:00Z'));
  }
  function link(base, kind, id) {
    var url = new URL(base); url.search = ''; url.hash = '';
    url.searchParams.set(kind === 'practice' ? 'practice' : 'puzzle', id);
    return url.href;
  }
  function selection(search, current) {
    var p = new URLSearchParams(search);
    if (p.has('puzzle')) {
      var date = p.get('puzzle');
      if (!valid(date)) return { error: 'That puzzle link has an invalid date.' };
      if (date > current) return { error: 'That market has not opened yet.' };
      return { kind: 'daily', id: date };
    }
    if (p.has('practice')) {
      var id = p.get('practice');
      return days.indexOf(id) >= 0 ? { kind: 'practice', id: id } : { error: 'That practice market does not exist.' };
    }
    return { kind: 'daily', id: current };
  }
  return { days: days, valid: valid, today: today, add: add, weekday: weekday, week: week, label: label, link: link, selection: selection };
});
