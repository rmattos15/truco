import { audio } from './audio.js';
import { DEFAULT_LOCALE, getTranslations } from './translations.js';
import { DEFAULT_MATCH_CONFIG, normalizeMatchConfig } from './config.js';

const welcome = document.querySelector('#welcome-screen');
const match = document.querySelector('#match-screen');
const start = document.querySelector('#start-game');
const replay = document.querySelector('#play-again');
const newGame = document.querySelector('#new-game');
const status = document.querySelector('#status');
const settingsDialog = document.querySelector('#settings-dialog');
const rulesDialog = document.querySelector('#rules-dialog');
const musicVolume = document.querySelector('#music-volume');
const musicVolumeValue = document.querySelector('#music-volume-value');
const effectsEnabled = document.querySelector('#effects-enabled');
const savedSettings = JSON.parse(localStorage.getItem('truco-settings') ?? '{}');
let matchConfig = normalizeMatchConfig(JSON.parse(localStorage.getItem('truco-match-config') ?? 'null') ?? DEFAULT_MATCH_CONFIG);
let locale = savedSettings.locale ?? DEFAULT_LOCALE;
musicVolume.value = savedSettings.musicVolume ?? musicVolume.value;
effectsEnabled.checked = savedSettings.effectsEnabled ?? effectsEnabled.checked;
document.querySelector('#language-select').value = locale;
audio.setMusicVolume(Number(musicVolume.value));
audio.setEffectsEnabled(effectsEnabled.checked);
function saveSettings() { localStorage.setItem('truco-settings', JSON.stringify({ musicVolume: Number(musicVolume.value), effectsEnabled: effectsEnabled.checked, locale })); }
function saveMatchConfig() { localStorage.setItem('truco-match-config', JSON.stringify(matchConfig)); }

function syncMusicVolume() { musicVolumeValue.textContent = `${musicVolume.value}%`; audio.setMusicVolume(Number(musicVolume.value)); saveSettings(); }
function showDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}
function openSettings() { showDialog(settingsDialog); }
function openRules() {
  if (settingsDialog.open) settingsDialog.close();
  showDialog(rulesDialog);
}
function closeRules() {
  if (rulesDialog.open) rulesDialog.close();
  showDialog(settingsDialog);
}
async function beginMusic() { try { await audio.enable(); } catch { /* The page remains playable without audio. */ } }

function applyLocale() {
  const text = getTranslations(locale);
  document.documentElement.lang = locale;
  document.title = text.documentTitle;
  document.querySelector('#welcome-screen .eyebrow').textContent = text.welcome.eyebrow;
  document.querySelector('#welcome-title').textContent = text.welcome.title;
  document.querySelector('.welcome-copy').textContent = text.welcome.copy;
  document.querySelector('#start-game').innerHTML = `${text.welcome.start} <span>→</span>`;
  document.querySelector('#play-again').innerHTML = `${text.match.replay} <span>→</span>`;
  document.querySelector('#match-screen .eyebrow').textContent = text.match.eyebrow;
  document.querySelector('#match-title').textContent = text.match.title;
  document.querySelector('.welcome-note').textContent = text.welcome.note;
  document.querySelector('header .eyebrow').textContent = text.game.eyebrow;
  document.querySelector('header h1').textContent = text.game.title;
  document.querySelector('#new-game').textContent = text.game.newGame;
  document.querySelector('#score-us').previousElementSibling.textContent = text.game.us;
  document.querySelector('#score-them').previousElementSibling.textContent = text.game.them;
  document.querySelector('#hand-value').previousElementSibling.textContent = text.game.handValue;
  document.querySelector('.vira > span').textContent = text.game.turnUp;
  document.querySelector('.hand-area h2').textContent = text.game.yourHand;
  document.querySelector('.scoreboard').setAttribute('aria-label', text.game.scoreboard);
  document.querySelector('.table').setAttribute('aria-label', text.game.table);
  document.querySelector('#opponents').setAttribute('aria-label', text.game.otherPlayersCards);
  document.querySelector('#trick-cards').setAttribute('aria-label', text.game.trickCards);
  document.querySelector('.controls').setAttribute('aria-label', text.game.actions);
  document.querySelector('.hand-area').setAttribute('aria-label', text.game.yourHand);
  document.querySelector('#series-score').firstElementChild.textContent = text.customization.series;
  document.querySelector('[data-bid-response="accept"]').textContent = text.game.accept;
  document.querySelector('[data-bid-response="raise"]').textContent = text.game.raise;
  document.querySelector('[data-bid-response="run"]').textContent = text.game.run;
  document.querySelectorAll('#settings-button, #welcome-settings').forEach((button) => { button.textContent = text.options.trigger; });
  document.querySelector('.settings-heading .eyebrow').textContent = text.options.eyebrow;
  document.querySelector('#settings-title').textContent = text.options.title;
  document.querySelector('label[for="music-volume"] > span').firstChild.textContent = `${text.options.music} `;
  document.querySelector('.setting-toggle strong').textContent = text.options.effects;
  document.querySelector('.setting-toggle small').textContent = text.options.effectsHint;
  document.querySelector('.setting-language > span').textContent = text.options.language;
  document.querySelector('#how-to-play').textContent = text.options.howToPlay;
  document.querySelector('#settings-dialog .close-settings').setAttribute('aria-label', text.options.close);
  document.querySelector('#customize-game').textContent = text.customization.trigger;
  document.querySelector('#customize-button').textContent = text.customization.trigger;
  document.querySelector('#customization-dialog .eyebrow').textContent = text.customization.eyebrow;
  document.querySelector('#customization-title').textContent = text.customization.title;
  document.querySelector('#close-customization').setAttribute('aria-label', text.customization.close);
  ['player0', 'player1', 'player2', 'player3'].forEach((key, index) => { document.querySelector(`#name-${index}`).parentElement.firstChild.textContent = text.customization[key]; });
  document.querySelectorAll('.custom-section legend')[0].textContent = text.customization.players;
  document.querySelectorAll('.custom-section legend')[1].textContent = text.customization.difficulty;
  document.querySelectorAll('.custom-section legend')[2].textContent = text.customization.format;
  document.querySelectorAll('.custom-section legend')[3].textContent = text.customization.appearance;
  document.querySelectorAll('.custom-section legend')[4].textContent = text.customization.rules;
  const difficulty = document.querySelectorAll('input[name="difficulty"]');
  [text.customization.easy, text.customization.normal, text.customization.competitive].forEach((label, index) => { difficulty[index].parentElement.lastChild.textContent = ` ${label}`; });
  const formats = document.querySelectorAll('input[name="format"]');
  formats[0].parentElement.childNodes[1].textContent = ` ${text.customization.quick} `; formats[0].parentElement.querySelector('small').textContent = text.customization.quickHint;
  formats[1].parentElement.childNodes[1].textContent = ` ${text.customization.series} `; formats[1].parentElement.querySelector('small').textContent = text.customization.seriesHint;
  const toggles = document.querySelectorAll('#customization-dialog .setting-toggle');
  toggles[0].querySelector('strong').textContent = text.customization.highContrast; toggles[0].querySelector('small').textContent = text.customization.highContrastHint;
  toggles[1].querySelector('strong').textContent = text.customization.handOfEleven; toggles[1].querySelector('small').textContent = text.customization.handOfElevenHint;
  document.querySelector('#restore-defaults').textContent = text.customization.restore;
  document.querySelector('#customization-form button[type="submit"]').innerHTML = `${text.customization.start} <span>→</span>`;
  document.querySelector('#rules-eyebrow').textContent = text.rules.eyebrow;
  document.querySelector('#rules-title').textContent = text.rules.title;
  document.querySelector('#rules-intro').textContent = text.rules.intro;
  document.querySelector('#rules-list').innerHTML = [[text.rules.objective, text.rules.objectiveCopy], [text.rules.yourTurn, text.rules.yourTurnCopy], [text.rules.winHand, text.rules.winHandCopy], [text.rules.turnUp, text.rules.turnUpCopy], [text.rules.callTruco, text.rules.callTrucoCopy]].map(([title, copy]) => `<li><strong>${title}</strong> ${copy}</li>`).join('');
  document.querySelector('#rules-order').innerHTML = `<strong>${text.rules.normalPower}</strong> ${text.rules.normalPowerCopy}`;
  document.querySelector('#rules-tip').innerHTML = `<span>✦</span> ${text.rules.tip}`;
  document.querySelector('#rules-eleven-title').textContent = text.rules.elevenTitle;
  document.querySelector('#rules-eleven-copy').textContent = text.rules.elevenCopy;
  document.querySelector('#close-rules').textContent = text.rules.close;
  document.querySelector('#hand-eleven-dialog .eyebrow').textContent = text.game.handOfElevenEyebrow;
  document.querySelector('#hand-eleven-title').textContent = text.game.handOfElevenTitle;
  document.querySelector('#hand-eleven-your-cards').textContent = text.game.handOfElevenYourCards;
  document.querySelector('#hand-eleven-partner-cards').textContent = text.game.handOfElevenPartnerCards;
  document.querySelector('#hand-eleven-trump-title').textContent = text.game.handOfElevenTrumpTitle;
  document.querySelector('#hand-eleven-run').textContent = text.game.handOfElevenRun;
  document.querySelector('#hand-eleven-play').textContent = text.game.handOfElevenPlay;
  window.dispatchEvent(new CustomEvent('truco:localechange', { detail: { locale } }));
}

async function begin() {
  await beginMusic();
  welcome.classList.add('is-hidden');
  welcome.setAttribute('aria-hidden', 'true');
  newGame.click();
}
function restart() {
  match.classList.remove('is-visible');
  match.setAttribute('aria-hidden', 'true');
  newGame.click();
}
start.addEventListener('click', begin);
replay.addEventListener('click', restart);
document.querySelector('#settings-button').addEventListener('click', openSettings);
document.querySelector('#welcome-settings').addEventListener('click', openSettings);
document.querySelector('#how-to-play').addEventListener('click', openRules);
document.querySelector('#close-rules').addEventListener('click', closeRules);
rulesDialog.addEventListener('cancel', (event) => { event.preventDefault(); closeRules(); });
const customizationDialog = document.querySelector('#customization-dialog');
const customizationForm = document.querySelector('#customization-form');
function fillCustomization() {
  matchConfig.names.forEach((name, index) => { document.querySelector(`#name-${index}`).value = name; });
  customizationForm.elements.difficulty.value = matchConfig.difficulty;
  customizationForm.elements.format.value = matchConfig.format;
  document.querySelector('#high-contrast').checked = matchConfig.highContrast;
  document.querySelector('#hand-of-eleven').checked = matchConfig.handOfEleven;
}
function openCustomization() { fillCustomization(); customizationDialog.showModal(); }
function applyMatchConfig() {
  matchConfig = normalizeMatchConfig({
    names: [0, 1, 2, 3].map((index) => document.querySelector(`#name-${index}`).value),
    difficulty: customizationForm.elements.difficulty.value,
    format: customizationForm.elements.format.value,
    highContrast: document.querySelector('#high-contrast').checked,
    handOfEleven: document.querySelector('#hand-of-eleven').checked,
  });
  saveMatchConfig();
  document.body.classList.toggle('high-contrast-suits', matchConfig.highContrast);
  window.dispatchEvent(new CustomEvent('truco:configchange', { detail: { config: matchConfig } }));
}
document.querySelector('#customize-game').addEventListener('click', openCustomization);
document.querySelector('#customize-button').addEventListener('click', openCustomization);
document.querySelector('#close-customization').addEventListener('click', () => customizationDialog.close());
document.querySelector('#restore-defaults').addEventListener('click', () => { matchConfig = normalizeMatchConfig(DEFAULT_MATCH_CONFIG); fillCustomization(); });
customizationForm.addEventListener('submit', async (event) => { event.preventDefault(); applyMatchConfig(); customizationDialog.close(); await begin(); });
musicVolume.addEventListener('input', syncMusicVolume);
effectsEnabled.addEventListener('change', () => { audio.setEffectsEnabled(effectsEnabled.checked); saveSettings(); });
document.querySelector('#language-select').addEventListener('change', (event) => { locale = event.target.value; saveSettings(); applyLocale(); });
syncMusicVolume();
applyLocale();
document.body.classList.toggle('high-contrast-suits', matchConfig.highContrast);
window.dispatchEvent(new CustomEvent('truco:configchange', { detail: { config: matchConfig } }));
document.addEventListener('pointerdown', beginMusic, { once: true });
new MutationObserver(() => {
  const message = status.textContent;
  if (!message.includes('venceu a partida!') && !message.includes('venceu a série!') && !message.includes('won the match!') && !message.includes('won the series!')) return;
  document.querySelector('#match-title').textContent = message;
  document.querySelector('#match-copy').textContent = getTranslations(locale).match.replayCopy;
  match.classList.add('is-visible');
  match.setAttribute('aria-hidden', 'false');
}).observe(status, { childList: true, characterData: true, subtree: true });
