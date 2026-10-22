# NORM prototype

A clickable front-end prototype of NORM. Nothing here talks to a server. State is kept in the browser's localStorage.

## Run it

```
cd prototype
python3 -m http.server 8000
```

Open http://localhost:8000. It's built for a phone-width screen, and on desktop it shows as a centered column.

## What works

- **Swipe**: drag the card, or use the buttons or arrow keys. Right means Into it, left means Nope, up means Curious. On movies, artists and teams, up means Haven't seen / Haven't heard / Don't follow, and those answers don't count toward matching. Saying Yes or Curious to a category opens its sub-categories. Undo (or press `z`) takes back the last swipe.
- **Matches**: unlock after 20 swipes. "Fill with sample answers" skips ahead. Tap a card to see the score, the top 5 interests you share, where you differ, and photos. You can message one person now and a second 12 hours later ("Skip wait" is a demo control). Cards you don't pick can be kept for $1.99, which is simulated and charges nothing.
- **Messages**: text only. Links and @handles are blocked. "Swap socials" needs both people to agree.
- **Profile**: 3 photo slots (stored only in memory), Top 20 stars, private interests, and match settings (looking for, gender, age, distance). Reset demo is at the bottom.

## Matching

Weights: starred = 3, liked = 1, curious = 0.5. The score is the shared weight minus half the weight of direct conflicts, divided by the average weight of the interests both people answered. Lisa, Anne and Elizabeth are tuned to score high, medium and low against the sample answers.

## Files

| File | Contents |
| --- | --- |
| `index.html` | Shell, meta tags, favicon |
| `styles.css` | Design tokens and components |
| `data.js` | Interest tree and demo profiles |
| `app.js` | All behavior |
| `icons.js` | Lucide icons (ISC license), inlined |
