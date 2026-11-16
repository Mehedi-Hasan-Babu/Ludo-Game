# Ludo Royale

A polished, responsive browser Ludo game for 2–4 local players, with an optional CPU opponent.

## Play

Open `index.html` in a modern browser, or serve this folder locally:

```bash
python3 -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## Features

- 2, 3, or 4 player games, plus a CPU opponents mode.
- Dice animation, optional sound effects, and highlighted legal token moves.
- Captures, safe spaces, exact rolls to finish, and extra turns for sixes and captures.
- Live turn status, player progress, move history, round counter, and victory celebration.
- Responsive layout, accessibility labels, keyboard-focus styling, and a quick rules dialog.

No build step or dependencies are required. Google Fonts are used when an internet connection is available; system fallbacks keep the game playable offline.
