# Who Wins?

A separate side app in this repo (not part of the NORM prototype). Friends debate "who would win" matchups in two modes, **Team vs Team** and **Bracket**, with random fight conditions rolled for each fight.

Single self-contained file: `index.html` (vanilla JS, no build). State lives in this browser's `localStorage` under `debate-bracket-v1`.

## Run it

```
cd who-wins
python3 -m http.server 8000
```

Or just open `index.html`. Full product spec: [SPEC.md](SPEC.md).
