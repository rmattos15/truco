import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getTranslations, translate, translations } from '../src/translations.js';

test('english translation contains the game interface text', () => {
  const english = getTranslations('en');
  assert.equal(english.game.askTruco, 'Call Truco');
  assert.equal(english.game.turnUp, 'Turn-up');
  assert.equal(english.suits.clubs, 'Clubs');
});

test('translation interpolates dynamic game values', () => {
  assert.equal(translate('en', 'game.cardsInHand', { name: 'Bot A', count: 3 }), 'Bot A: 3 cards in hand');
  assert.equal(translate('en', 'game.handWon', { team: 'Us', points: 3, pointLabel: 'points', reason: '' }), 'Us won 3 points.');
});

test('every Portuguese translation key has an English counterpart', () => {
  const compare = (portuguese, english, path = '') => {
    for (const [key, value] of Object.entries(portuguese)) {
      const keyPath = path ? `${path}.${key}` : key;
      assert.ok(key in english, `Missing English key: ${keyPath}`);
      if (value && typeof value === 'object' && !Array.isArray(value)) compare(value, english[key], keyPath);
    }
  };
  compare(translations['pt-BR'], translations.en);
});

test('guide and customization have complete English content', () => {
  const english = getTranslations('en');
  assert.equal(english.options.howToPlay, 'How to play Truco');
  assert.equal(english.rules.elevenTitle, 'Hand of Eleven');
  assert.match(english.rules.elevenCopy, /3 points/);
  assert.equal(english.customization.competitive, 'Competitive');
  assert.equal(english.customization.highContrast, 'High-contrast suits');
});

test('Hand of Eleven preview labels are translated', () => {
  const english = getTranslations('en');
  assert.equal(english.game.handOfElevenYourCards, 'Your cards');
  assert.equal(english.game.handOfElevenPartnerCards, 'Your partner’s cards');
  assert.equal(translate('en', 'game.handOfElevenTrumpCopy', { turnUp: '5♣', trump: '6' }), 'Turn-up: 5♣. The trump rank is 6.');
});

test('the welcome screen has no direct guide and Options owns the guide entry', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const welcome = html.match(/<section id="welcome-screen"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.doesNotMatch(welcome, /rules-panel|how-to-play|Como jogar Truco/);
  assert.match(html, /id="how-to-play"/);
  assert.match(html, /id="rules-dialog"/);
  assert.match(html, /id="close-rules"/);
});

test('the locale application targets the welcome note that exists in the page', async () => {
  const [html, ui] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui.js', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /class="welcome-note"/);
  assert.match(ui, /querySelector\('\.welcome-note'\)\.textContent = text\.welcome\.note/);
});

test('guide navigation safely opens and returns to Options', async () => {
  const ui = await readFile(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /function openRules\(\) \{\s*if \(settingsDialog\.open\) settingsDialog\.close\(\);\s*showDialog\(rulesDialog\);\s*\}/);
  assert.match(ui, /function closeRules\(\) \{\s*if \(rulesDialog\.open\) rulesDialog\.close\(\);\s*showDialog\(settingsDialog\);\s*\}/);
});

test('Hand of Eleven dialog provides visual-card regions for the team and turn-up', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="hand-eleven-player-cards"/);
  assert.match(html, /id="hand-eleven-partner-cards-list"/);
  assert.match(html, /id="hand-eleven-vira-card"/);
});
