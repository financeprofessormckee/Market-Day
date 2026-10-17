# Market Day

A daily barter puzzle in a little harbor market. You start with a basket of fish,
trade whole lots at the stalls (each with limited stock), and close the market
with the biggest haul you can manage. Only fish count at the end.

**Play it:** https://financeprofessormckee.github.io/Market-Day/

No login, no account, no ads, nothing tracked. Your progress stays in your own
browser.

## How a week works

There's a new market every day (Central time), and the days get harder through
the week:

| Day | What's new |
|---|---|
| Monday | A clear profitable loop, plus a tempting weaker one |
| Tuesday | Stalls that only trade once, and competing routes |
| Wednesday | Splitting goods between routes; awkward lot sizes |
| Thursday | A longer chain of trades, with a shortcut |
| Friday | A basket that only holds so much |
| Saturday | Trades that cost several goods at once |
| Sunday | All of it together |

Undo and Reset are free. Closing the market shows your score against the best
possible haul, with a walkthrough of the best route if you want it. Seven
**practice markets**, one per weekday, are always open, and **Archive** has
every earlier day.

## Share your result

When you close a market, **Copy result + link** gives you something like:

```text
Market Day · Monday, Oct 19, 2026
🐟 14/16 · 6 trades
https://financeprofessormckee.github.io/Market-Day/?puzzle=2026-10-19
```

Paste it into a group chat or Discord. The link opens that same market for your
friends so they can try to beat you. It never includes your moves.

## Credits

Inspired by David Friedman's Arbitrage game proposal. Game design, puzzles,
illustrations and code by Eric McKee. Every puzzle is
checked by an exact solver, so the "best possible" score really is the best.

© 2026 Eric McKee. All rights reserved. You're welcome to play and to share
links, but please don't copy or rehost the game.

<!-- Maintainer note: the schedule runs through 2027-04-04. Renew in the dev
folder (tools/generate.cjs), rebuild with tools/prepare-site.cjs --first 2026-10-19,
and recopy data/ here before then. -->
