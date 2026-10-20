# Truco Paulista

A dependency-free, browser-based implementation of **Truco Paulista** for one human player and three computer-controlled players. Sit at a four-player table, play with a partner, call or answer Truco, and win hands on the way to 12 points. The game is entirely client-side: it uses native HTML, CSS, JavaScript modules, `localStorage`, and the Web Audio API.

## Contents

- [Features](#features)
- [Rules implemented](#rules-implemented)
- [Run locally](#run-locally)
- [Configuration and interface](#configuration-and-interface)
- [Project structure](#project-structure)
- [Architecture and bot behavior](#architecture-and-bot-behavior)
- [Internationalization](#internationalization)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Developing and contributing](#developing-and-contributing)
- [Current limitations](#current-limitations)

## Features

- Four seats in two teams: the human is player 0, partnered with player 2; players 1 and 3 are opponents.
- A 40-card deck, three cards per player, a visible turn-up card (*vira*), rotating dealer, tricks (*vazas*), hand resolution, and scoring to 12.
- Dynamic manilhas: the rank immediately after the vira in `4, 5, 6, 7, Q, J, K, A, 2, 3` becomes trump. Manilhas are ordered Clubs, Hearts, Spades, Diamonds.
- Bidding progression of 1 → **Truco** (3) → 6 → 9 → 12, with accept, raise, and run actions. A team that made the latest call cannot make the next raise until the other team raises.
- Optional Mão de Onze: the team on 11 may inspect both partners’ cards and choose to play a 3-point, no-Truco hand or run for one point to the opposition.
- Configurable player names, bot difficulty (Easy, Normal, Competitive), quick match or best-of-three series, high-contrast suits, and Mão de Onze.
- Portuguese (Brazil) and English interfaces, in-game guide, match/replay screen, responsive table, keyboard-native dialog elements, and generated background/effect audio.
- Preferences and match configuration persisted in browser `localStorage`.

## Rules implemented

### Objective and table

Four players sit in alternating teams: seats 0 and 2 versus seats 1 and 3. Each hand deals three cards to every player and exposes one vira. A quick match ends when a team reaches at least 12 points; a series requires two such match wins.

### Cards, manilhas, and tricks

The deck contains 4, 5, 6, 7, Q, J, K, A, 2, and 3 in each suit. Non-manilha ranks increase in exactly that order. The next rank after the vira wraps around (a 3 vira makes 4 the manilha). A manilha beats every ordinary card; equal-rank manilhas are ordered Clubs > Hearts > Spades > Diamonds.

The player after the dealer leads the first trick. Everyone plays one card in turn; the highest card wins the trick and leads the next one. The hand finishes when a team wins two tricks. Tied tricks follow the engine’s implemented resolution: after two tricks, a tie awards the hand to the team that won the other trick; after three, the first non-tied trick wins, falling back to the original leader’s team if all are tied. A tied trick does not change the leader.

### Points, bids, and Hand of Eleven (Mão de Onze)

Hands start at one point. A successful Truco call raises the hand to 3; later opposing raises set it to 6, 9, then 12. If the challenged team runs, the calling team receives the hand’s **current** value, rather than the proposed value.

With the optional Hand of Eleven enabled, a team exactly on 11 triggers the special decision before cards are played. The human team sees its partner’s cards; the bot team makes the same decision using its heuristic. Playing fixes the hand at 3 points and disables bidding; running gives the other team 1 point. No other special rules are implemented.

## Run locally

### Requirements

- A modern browser with ES module, `<dialog>`, `localStorage`, and Web Audio support.
- Python 3 is the recommended way to serve the files. Node.js is only required to run the automated tests.

Clone or copy the project, then open a terminal in its root:

```sh
cd path/to/truco
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) and stop the server with <kbd>Ctrl</kbd>+<kbd>C</kbd>. This works on macOS, Linux, and Windows installations where `python3` is available (on Windows, `py -m http.server 8000` is a common equivalent).

There are no npm runtime dependencies and no `dev` script. Opening `index.html` through `file://` is not recommended: the application imports JavaScript modules, whose loading behavior is more consistently supported from an HTTP origin. Serving the project also better reflects browser storage and audio permission behavior.

## Configuration and interface

Use **Customization** before a game (or from the table header) to set all four names, difficulty, match format, high-contrast suits, and Mão de Onze. The default is a quick, Normal-difficulty match without Mão de Onze. Names are trimmed and limited to 24 characters.

**Options** provides music volume, interaction-sound toggle, language switching, and the in-app rule guide. Audio begins after browser interaction and failing to initialize it does not block play. High contrast changes suit colors to hearts red, clubs blue, diamonds yellow, and spades black.

## Project structure

```text
.
├── index.html                 # Page structure, dialogs, controls, module entry points
├── styles.css                 # Responsive game/table, dialog, and contrast styling
├── package.json               # ES-module mode and Node test script
├── src/
│   ├── app.js                 # Match state, turn flow, bidding, rendering, DOM events
│   ├── game.js                # Deck, ranking, bidding eligibility, hand/trick rules
│   ├── bot.js                 # Heuristic bot card, bid, and Mão de Onze decisions
│   ├── config.js              # Defaults and validation for match settings
│   ├── translations.js        # Portuguese and English text resources
│   ├── ui.js                  # Welcome/settings/customization dialogs and persistence
│   └── audio.js               # Web Audio music and game effects
└── test/
    ├── game.test.js           # Rule, bot, and configuration unit tests
    └── translations.test.js   # Translation and UI-structure checks
```

Cards are rendered from rank and Unicode suit data; the repository has no card-image or other asset directory.

## Architecture and bot behavior

`src/game.js` contains the reusable rule functions and creates a hand. `src/app.js` owns live state—scores, dealer, current player, hand, series wins, configuration, and the Mão de Onze waiting state—and connects state changes to the DOM. `src/ui.js` controls dialogs and publishes configuration and locale changes as browser custom events; `app.js` receives those events and rerenders. `audio.js` synthesizes sound with the Web Audio API rather than loading audio files.

Bots are seats 1–3, including the human player’s partner. Their logic is heuristic, not machine learning. They estimate their own hand from card strength, manilhas, and strong-card count; consider public table cards, completed tricks, hand value, score pressure, and difficulty; then decide whether to play, bid, accept, raise, run, or play a Mão de Onze. When playing, a bot discards cheaply if its partner is currently winning, otherwise uses the cheapest winning card or a conservative lead. Easy bots sometimes choose a random plausible card and can overcall; Competitive bots use lower bid thresholds and are more likely to raise.

Bot decision functions receive only that bot’s hand, the vira, exposed table cards, tricks, and score. They do not inspect their partner’s hidden cards. The UI also renders every non-human hand face-down, except when it intentionally reveals the human partnership during Mão de Onze.

## Internationalization

`src/translations.js` supports `pt-BR` (the default) and `en`. `src/ui.js` updates static UI text and dispatches `truco:localechange`; `src/app.js` rerenders dynamic game text with the selected locale. The selected locale is saved in `truco-settings` in `localStorage`.

To add text, add matching keys to both language objects and use `translate(locale, 'group.key', values)` for dynamic text. To add a language, add a full translation object and an option in `#language-select`. Run the tests afterward: they assert that every Portuguese key has an English counterpart, but do not automatically validate any additional language.

## Testing

With a current Node.js installation, run:

```sh
npm test
```

This invokes Node’s built-in test runner (`node --test`). Tests cover deck uniqueness, manilha/rank behavior, hand and bid rules, representative bot choices, configuration normalization, translations, and selected HTML/UI wiring. Manually test a browser session as well: start a quick game, call/answer bids, complete a series, switch both languages, enable high contrast, and exercise both Mão de Onze choices.

## Troubleshooting

| Symptom | Check and fix |
| --- | --- |
| Changes do not appear | Hard-refresh the browser (typically Ctrl/Cmd+Shift+R). If settings appear stale, clear this site’s local storage; both settings and match configuration are intentionally persisted. |
| Blank page or module error | Serve the repository root, not a parent or `src/` directory: run `python3 -m http.server 8000` from the folder containing `index.html`, then open `http://localhost:8000`. Inspect the browser console for the first import error. |
| `file://` launch behaves oddly | Use the local HTTP server above. Module imports and browser permissions are designed for an HTTP origin. |
| Audio is silent | Interact with the page first; browsers restrict audio before a user gesture. Also check Options for music volume and interaction sounds. Gameplay continues without audio. |
| Language text is missing or mixed | Confirm matching translation keys in `src/translations.js`, then reload and switch languages. The test suite detects missing English keys for Portuguese entries. |
| `npm test` fails before tests start | Confirm Node.js and npm are installed and run the command from the repository root. No `npm install` is needed because the tests use Node’s built-in runner. |

## Developing and contributing

Keep rule changes concentrated in `src/game.js` and add or update tests in `test/game.test.js`, especially around ties, bid transitions, and scoring. Adjust bot strategy in `src/bot.js` without giving a bot access to its partner’s private hand. For visual work, update `index.html` and `styles.css`; for settings, extend `DEFAULT_MATCH_CONFIG`, `normalizeMatchConfig`, the customization dialog, and its UI event payload together. For new user-facing text, update both language resources and retain the locale-change flow.

After changes, run `npm test` and manually validate a browser round. There is no declared license or contributor policy in this repository, so do not assume one.

## Current limitations

- This is a local single-browser game: it has no online multiplayer, accounts, server, persistence beyond browser local storage, or card-image assets.
- The player is always seat 0; all other seats are automated.
- Bot strategy is intentionally lightweight and heuristic-based, with no simulation, learning, or long-term opponent modeling.
- Tests target core logic and selected UI contracts; they do not run the application in a real browser or provide full end-to-end coverage.
