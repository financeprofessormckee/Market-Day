/* Hand-authored prototype boards. `best` is confirmed by js/solver.js in tests. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BarterBoards = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var GOODS = [
    { id: 'fish', name: 'fish', icon: '🐟' },
    { id: 'bread', name: 'bread', icon: '🍞' },
    { id: 'salt', name: 'salt', icon: '🧂' },
    { id: 'wool', name: 'wool', icon: '🧶' }
  ];

  function stall(id, name, giveQty, giveGood, getQty, getGood, times) {
    return { id: id, name: name, give: { good: giveGood, qty: giveQty }, get: { good: getGood, qty: getQty }, times: times };
  }

  var BOARDS = [
    {
      id: 'mon', day: 'Monday', short: 'Mon', difficulty: 'Gentle',
      home: 'fish', start: { fish: 6 }, best: 8, trap: 6,
      stalls: [
        stall('baker', 'Baker', 2, 'fish', 3, 'bread', 2),
        stall('weaver', 'Weaver', 3, 'bread', 1, 'wool', 3),
        stall('fishmonger', 'Fishmonger', 1, 'wool', 3, 'fish', 3),
        stall('salter', 'Salter', 1, 'fish', 2, 'salt', 4),
        stall('shepherd', 'Shepherd', 5, 'salt', 1, 'wool', 2)
      ],
      solution: [
        'Baker twice: 4 fish become 6 bread.',
        'Weaver twice: 6 bread become 2 wool.',
        'Fishmonger twice: 2 wool become 6 fish. You finish with 8.',
        'The salt route only breaks even. Salt comes in pairs, so 5 salt costs 3 fish and one salt is wasted.'
      ],
      line: ['baker', 'baker', 'weaver', 'weaver', 'fishmonger', 'fishmonger']
    },
    {
      id: 'tue', day: 'Tuesday', short: 'Tue', difficulty: 'Easy',
      home: 'fish', start: { fish: 7 }, best: 13, trap: 8,
      note: 'Some stalls trade only once.',
      stalls: [
        stall('baker', 'Baker', 1, 'fish', 4, 'bread', 3),
        stall('weaver', 'Weaver', 2, 'bread', 1, 'wool', 2),
        stall('salter', 'Salter', 1, 'fish', 3, 'salt', 1),
        stall('dyer', 'Dyer', 2, 'salt', 3, 'wool', 1),
        stall('shepherd', 'Shepherd', 1, 'wool', 2, 'fish', 4)
      ],
      solution: [
        'Baker once: 1 fish becomes 4 bread. Weaver twice: 4 bread become 2 wool.',
        'Salter, then Dyer: 1 fish becomes 3 salt, and 2 of them become 3 wool.',
        'Shepherd four times: 4 wool become 8 fish. You finish with 13.',
        'The Baker looks like the best deal, but the Weaver only takes 4 bread. Extra bread is wasted.'
      ],
      line: ['baker', 'weaver', 'weaver', 'salter', 'dyer', 'shepherd', 'shepherd', 'shepherd', 'shepherd']
    },
    {
      id: 'wed', day: 'Wednesday', short: 'Wed', difficulty: 'Tricky',
      home: 'fish', start: { fish: 12 }, best: 16, trap: 13,
      stalls: [
        stall('baker', 'Baker', 2, 'fish', 3, 'bread', 3),
        stall('miller', 'Miller', 2, 'bread', 1, 'salt', 4),
        stall('salter', 'Salter', 1, 'salt', 3, 'fish', 2),
        stall('weaver', 'Weaver', 3, 'bread', 2, 'wool', 2),
        stall('shepherd', 'Shepherd', 1, 'wool', 2, 'fish', 2)
      ],
      solution: [
        'Baker three times: 6 fish become 9 bread.',
        'Miller twice, then Salter twice: 4 bread become 6 fish.',
        'Weaver once, then Shepherd twice: 3 bread become 4 fish.',
        '12 − 6 + 6 + 4 = 16, with 2 bread left over. Leaning on the wool route strands wool the Shepherd cannot take.'
      ],
      line: ['baker', 'baker', 'baker', 'miller', 'miller', 'salter', 'salter', 'weaver', 'shepherd', 'shepherd']
    },
    {
      id: 'thu', day: 'Thursday', short: 'Thu', difficulty: 'Hard',
      home: 'fish', start: { fish: 12 }, best: 21, trap: 20,
      note: 'A four-stop loop. Watch the lot sizes.',
      stalls: [
        stall('baker', 'Baker', 1, 'fish', 4, 'bread', 4),
        stall('miller', 'Miller', 4, 'bread', 4, 'salt', 2),
        stall('carter', 'Carter', 3, 'salt', 1, 'wool', 3),
        stall('shepherd', 'Shepherd', 1, 'wool', 5, 'fish', 3),
        stall('cook', 'Cook', 4, 'bread', 2, 'fish', 1)
      ],
      solution: [
        'Baker three times: 3 fish become 12 bread.',
        'Miller twice: 8 bread become 8 salt. Carter twice: 6 salt become 2 wool.',
        'Shepherd twice: 2 wool become 10 fish. Cook once: the last 4 bread become 2 fish.',
        '12 − 3 + 10 + 2 = 21. The Carter wants salt in threes, so 8 salt only makes 2 wool, and a fourth Baker lot has nowhere to go.'
      ],
      line: ['baker', 'baker', 'baker', 'miller', 'miller', 'carter', 'carter', 'shepherd', 'shepherd', 'cook']
    },
    {
      id: 'fri', day: 'Friday', short: 'Fri', difficulty: 'Devious',
      home: 'fish', start: { fish: 12 }, best: 22, trap: 19, cap: 5,
      note: 'Your basket holds only 5 goods besides fish.',
      stalls: [
        stall('baker', 'Baker', 1, 'fish', 4, 'bread', 4),
        stall('weaver', 'Weaver', 3, 'bread', 1, 'wool', 3),
        stall('shepherd', 'Shepherd', 1, 'wool', 4, 'fish', 4),
        stall('salter', 'Salter', 3, 'fish', 3, 'salt', 2),
        stall('cook', 'Cook', 3, 'salt', 5, 'fish', 4)
      ],
      solution: [
        'Baker, Weaver, Shepherd: 1 fish becomes 4 fish, with 1 bread left in the basket.',
        'Do that loop again: 4 more fish, now 2 bread in the basket.',
        'Salter then Cook, twice: each pass turns 3 fish into 5.',
        '12 + 3 + 3 + 2 + 2 = 22. Buying bread up front fills the basket before you can turn it back into fish.'
      ],
      line: ['baker', 'weaver', 'shepherd', 'baker', 'weaver', 'shepherd', 'salter', 'cook', 'salter', 'cook']
    }
  ];

  BOARDS.push({
    id: 'sat', day: 'Saturday', short: 'Sat', difficulty: 'Intricate',
    home: 'fish', start: { fish: 12 }, best: 25, trap: 13,
    note: 'Some trades need two different goods together. Bring every ingredient.',
    stalls: [
      stall('baker', 'Baker', 1, 'fish', 4, 'bread', 3),
      stall('salter', 'Salter', 2, 'fish', 3, 'salt', 2),
      { id: 'dyer', name: 'Dyer', give: [{ good: 'bread', qty: 3 }, { good: 'salt', qty: 2 }], get: { good: 'wool', qty: 2 }, times: 3 },
      stall('shepherd', 'Shepherd', 1, 'wool', 4, 'fish', 4),
      stall('cook', 'Cook', 4, 'bread', 2, 'fish', 1),
      stall('miller', 'Miller', 2, 'bread', 1, 'salt', 2)
    ],
    solution: [
      'Baker three times, then Salter once: you have 7 fish, 12 bread and 3 salt.',
      'Dyer needs BOTH 3 bread and 2 salt. Trade once, then Shepherd twice: you have 15 fish, 9 bread and 1 salt.',
      'Cook once: sell 4 bread for 2 fish. Miller once: trade 2 bread for the missing salt.',
      'Dyer once more, then Shepherd twice: finish with 25 fish. The Cook alone only brings you to 13.'
    ],
    line: ['baker', 'baker', 'baker', 'salter', 'dyer', 'shepherd', 'shepherd', 'cook', 'miller', 'dyer', 'shepherd', 'shepherd']
  });
  BOARDS.push({
    id: 'sun', day: 'Sunday', short: 'Sun', difficulty: 'Grand market',
    home: 'fish', start: { fish: 12 }, best: 28, trap: 19, cap: 7,
    note: 'Mixed trades meet a seven-good basket. Plan what to carry and when to sell.',
    stalls: [
      stall('baker', 'Baker', 1, 'fish', 4, 'bread', 4),
      stall('salter', 'Salter', 2, 'fish', 3, 'salt', 2),
      { id: 'dyer', name: 'Dyer', give: [{ good: 'bread', qty: 3 }, { good: 'salt', qty: 2 }], get: { good: 'wool', qty: 2 }, times: 3 },
      stall('shepherd', 'Shepherd', 1, 'wool', 4, 'fish', 5),
      stall('cook', 'Cook', 4, 'bread', 2, 'fish', 1),
      stall('miller', 'Miller', 2, 'bread', 1, 'salt', 2),
      stall('weaver', 'Weaver', 3, 'bread', 1, 'wool', 2)
    ],
    solution: [
      'Baker, Salter, Dyer, Shepherd: assemble both ingredients, then sell one wool to free basket space.',
      'Baker, Shepherd, Cook: buy another bread lot, sell the other wool, then sell 4 bread.',
      'Baker, Miller, Dyer: make the missing salt from bread and assemble a second mixed trade.',
      'Baker, Shepherd twice, Weaver, Shepherd: use the remaining bread and all five Shepherd trades to finish with 28 fish.',
      'Two Baker trades upfront would overflow the basket. Ignoring the Dyer leaves at most 19 fish.'
    ],
    line: ['baker', 'salter', 'dyer', 'shepherd', 'baker', 'shepherd', 'cook', 'baker', 'miller', 'dyer', 'baker', 'shepherd', 'shepherd', 'weaver', 'shepherd']
  });

  function board(id) {
    var b = BOARDS.find(function (x) { return x.id === id; });
    if (!b) throw new Error('Unknown board: ' + id);
    return b;
  }

  return { goods: GOODS, boards: BOARDS, board: board };
});
