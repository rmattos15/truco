import { canAskBid, cardLabel, cardPower, handWinner, manilhaRank, newHand, nextBidValue, winningTeam } from './game.js';
import { chooseBotBidResponse, chooseBotCard, shouldBotAskBid, shouldBotPlayHandOfEleven } from './bot.js';
import { audio } from './audio.js';
import { DEFAULT_LOCALE, getTranslations, translate } from './translations.js';
import { DEFAULT_MATCH_CONFIG, normalizeMatchConfig } from './config.js';

const $ = (selector) => document.querySelector(selector);
const state = { scores: [0, 0], seriesWins: [0, 0], dealer: 3, hand: null, currentPlayer: 0, log: [], gameOver: false, config: normalizeMatchConfig(DEFAULT_MATCH_CONFIG), awaitingHandOfEleven: false };
let locale = DEFAULT_LOCALE;
const text = (key, values) => translate(locale, key, values);
const playerName = (player) => {
  const configured = state.config.names[player];
  return !configured || configured === DEFAULT_MATCH_CONFIG.names[player] ? getTranslations(locale).players[player] : configured;
};
const teamName = (team) => team === 0 ? `${playerName(0)} + ${playerName(2)}` : `${playerName(1)} + ${playerName(3)}`;
let trucoTimer;

function addLog(message) { state.log.unshift(message); render(); }
function suitClass(card) { return ['♥', '♦'].includes(card.suit.symbol) ? 'red' : ''; }

function startHand() {
  if (state.scores.some((score) => score >= 12)) { finishMatch(state.scores[0] >= 12 ? 0 : 1); return; }
  state.hand = newHand(state.dealer);
  state.currentPlayer = state.hand.leader;
  state.dealer = (state.dealer + 1) % 4;
  const elevenTeam = state.config.handOfEleven ? state.scores.findIndex((score) => score === 11) : -1;
  if (elevenTeam !== -1) {
    state.hand.value = 3;
    state.hand.handOfEleven = true;
    state.awaitingHandOfEleven = true;
    render();
    if (elevenTeam === 0) {
      $('#hand-eleven-dialog').showModal();
    }
    else window.setTimeout(() => resolveBotHandOfEleven(elevenTeam), 500);
    return;
  }
  beginHand();
}
function beginHand() {
  state.awaitingHandOfEleven = false;
  addLog(text('game.newHandLog', { name: playerName(state.currentPlayer), turnUp: cardLabel(state.hand.vira), trump: manilhaRank(state.hand.vira) }));
  progressBots();
}
function resolveBotHandOfEleven(team) {
  const bot = team === 1 ? 1 : 2;
  if (shouldBotPlayHandOfEleven({ player: bot, hand: state.hand, difficulty: state.config.difficulty })) beginHand();
  else finishHand(1 - team, 1, text('game.handOfElevenBotRan'));
}
function resolveHumanHandOfEleven(play) {
  $('#hand-eleven-dialog').close();
  if (play) beginHand();
  else finishHand(1, 1, text('game.handOfElevenPlayersRan'));
}

function finishHand(team, points = state.hand.value, reason = '') {
  state.scores[team] += points;
  state.hand.finished = true;
  audio.roundEnd(team === 0);
  addLog(text('game.handWon', { team: teamName(team), points, pointLabel: text(points > 1 ? 'game.points' : 'game.point'), reason: reason ? ` (${reason})` : '' }));
  window.setTimeout(startHand, 1000);
}
function finishMatch(winner) {
  state.gameOver = true;
  if (state.config.format === 'series') {
    state.seriesWins[winner] += 1;
    if (state.seriesWins[winner] < 2) {
      const completed = [...state.scores];
      state.scores = [0, 0];
      state.hand = null;
      addLog(text('game.seriesWon', { team: teamName(winner), score: completed.join('–'), series: state.seriesWins.join('–') }));
      window.setTimeout(() => { state.gameOver = false; startHand(); }, 1200);
      return;
    }
  }
  render();
}

function resolveTrick() {
  const team = winningTeam(state.hand.table, state.hand.vira);
  const winningPlay = team === null ? null : state.hand.table.find((play) => play.player % 2 === team && cardPower(play.card, state.hand.vira) === Math.max(...state.hand.table.map((p) => cardPower(p.card, state.hand.vira))));
  state.hand.tricks.push({ team, plays: [...state.hand.table] });
  const number = state.hand.tricks.length;
  addLog(team === null ? text('game.trickTied', { number }) : text('game.trickWon', { team: teamName(team), number }));
  const victor = handWinner(state.hand);
  if (victor !== null) { finishHand(victor); return; }
  state.hand.leader = winningPlay ? winningPlay.player : state.hand.leader;
  state.hand.table = [];
  state.currentPlayer = state.hand.leader;
  progressBots();
}

function playCard(player, index) {
  if (!state.hand || state.hand.finished || state.hand.pendingBid || player !== state.currentPlayer) return;
  const [card] = state.hand.hands[player].splice(index, 1);
  state.hand.table.push({ player, card });
  audio.card();
  addLog(text('game.playedCard', { name: playerName(player), card: cardLabel(card) }));
  state.currentPlayer = (player + 1) % 4;
  if (state.hand.table.length === 4) window.setTimeout(resolveTrick, 450);
  else progressBots();
}

function askBid(player, value = nextBidValue(state.hand)) {
  if (!state.hand || state.hand.handOfEleven || !canAskBid(state.hand, player) || value !== nextBidValue(state.hand)) return;
  state.hand.pendingBid = { from: player, value, resumePlayer: state.currentPlayer };
  state.hand.lastBidTeam = player % 2;
  audio.truco();
  addLog(text('game.askedBid', { name: playerName(player), value: value === 3 ? 'TRUCO' : value }));
  if (value === 3) showTrucoCallout();
  if (player % 2 === 0) window.setTimeout(botRespondBid, 500);
}
function showTrucoCallout() {
  const callout = $('#truco-callout');
  window.clearTimeout(trucoTimer);
  callout.textContent = 'TRUCO!';
  callout.classList.remove('is-visible');
  void callout.offsetWidth;
  callout.classList.add('is-visible');
  trucoTimer = window.setTimeout(() => callout.classList.remove('is-visible'), 1250);
}
function botRespondBid() {
  const bid = state.hand.pendingBid;
  if (!bid) return;
  // The next seat is an opponent of the caller and represents that team for
  // this decision (a player never needs to see their partner's cards).
  const responder = (bid.from + 1) % 4;
  const response = chooseBotBidResponse({ player: responder, hand: state.hand, scores: state.scores, difficulty: state.config.difficulty });
  if (response === 'raise') { state.hand.value = bid.value; state.hand.pendingBid = null; askBid(responder, nextBidValue(state.hand)); return; }
  if (response === 'run') { state.hand.pendingBid = null; finishHand(bid.from % 2, state.hand.value, text('game.opponentsRan')); return; }
  state.hand.value = bid.value; state.hand.pendingBid = null; addLog(text('game.opponentsAccepted')); progressBots();
}
function respondToBid(response) {
  const bid = state.hand.pendingBid;
  if (!bid || bid.from % 2 === 0) return;
  if (response === 'run') { state.hand.pendingBid = null; finishHand(1, state.hand.value, text('game.playersRan')); return; }
  if (response === 'raise') {
    state.hand.value = bid.value;
    state.hand.pendingBid = null;
    askBid(0, nextBidValue(state.hand));
    return;
  }
  state.hand.value = bid.value;
  state.hand.pendingBid = null;
  addLog(text('game.playersAccepted'));
  progressBots();
}

function botPlay(player) {
  playCard(player, chooseBotCard({ player, hand: state.hand, difficulty: state.config.difficulty }));
}
function botDelay() { return 1280 + Math.round(Math.random() * 360); }
function progressBots() {
  render();
  if (!state.hand || state.hand.finished || state.hand.pendingBid || state.currentPlayer === 0) {
    if (state.hand && !state.hand.finished && !state.hand.pendingBid && state.currentPlayer === 0) audio.yourTurn();
    return;
  }
  window.setTimeout(() => {
    if (!state.hand || state.hand.finished || state.hand.pendingBid) return;
    if (!state.hand.handOfEleven && canAskBid(state.hand, state.currentPlayer) && shouldBotAskBid({ player: state.currentPlayer, hand: state.hand, scores: state.scores, difficulty: state.config.difficulty })) askBid(state.currentPlayer);
    else botPlay(state.currentPlayer);
  }, botDelay());
}

function renderCard(card, options = {}) {
  const el = document.createElement(options.button ? 'button' : 'div');
  el.className = `card ${suitClass(card)} suit-${card.suit.id} ${options.playable ? 'playable' : ''}`;
  el.setAttribute('aria-label', card.rank === '?' ? text('game.unknownCard') : `${card.rank} ${getTranslations(locale).suits[card.suit.id]}`);
  el.innerHTML = `<span class="card-corner top"><b>${card.rank}</b><i>${card.suit.symbol}</i></span><span class="card-pip">${card.suit.symbol}</span><span class="card-corner bottom"><b>${card.rank}</b><i>${card.suit.symbol}</i></span>`;
  if (options.button) { el.type = 'button'; el.disabled = !options.playable; el.addEventListener('click', options.onClick); }
  return el;
}
function renderHandOfElevenPreview(hand) {
  const visible = Boolean(hand?.handOfEleven && state.awaitingHandOfEleven);
  if (!visible) return;

  $('#hand-eleven-copy').textContent = text('game.handOfElevenDialog');
  $('#hand-eleven-player-cards').replaceChildren(...hand.hands[0].map((card) => renderCard(card)));
  $('#hand-eleven-partner-cards-list').replaceChildren(...hand.hands[2].map((card) => renderCard(card)));
  $('#hand-eleven-vira-card').replaceChildren(renderCard(hand.vira));
  $('#hand-eleven-trump-copy').textContent = text('game.handOfElevenTrumpCopy', {
    turnUp: cardLabel(hand.vira),
    trump: manilhaRank(hand.vira),
  });
}
function render() {
  const hand = state.hand;
  $('#score-us').textContent = state.scores[0]; $('#score-them').textContent = state.scores[1];
  $('#score-us-label').textContent = `${playerName(0)} + ${playerName(2)}`; $('#score-them-label').textContent = `${playerName(1)} + ${playerName(3)}`;
  $('#series-score').classList.toggle('hidden', state.config.format !== 'series'); $('#series-score-value').textContent = `${state.seriesWins[0]}–${state.seriesWins[1]}`;
  $('#hand-value').textContent = hand?.value ?? '-';
  $('#status').textContent = state.gameOver ? (state.config.format === 'series' ? text('game.seriesWonMatch', { team: teamName(state.seriesWins[0] >= 2 ? 0 : 1) }) : text('game.matchWon', { team: teamName(state.scores[0] >= 12 ? 0 : 1) })) : state.awaitingHandOfEleven ? text('game.handOfElevenWaiting') : hand?.pendingBid ? text('game.waitingBidResponse') : text('game.playsNow', { name: playerName(state.currentPlayer) });
  const viraCard = renderCard(hand?.vira ?? { rank: '?', suit: { symbol: '?' } });
  viraCard.id = 'vira-card';
  viraCard.classList.add('is-vira');
  $('#vira-card').replaceWith(viraCard);
  const table = $('#trick-cards'); table.replaceChildren(...(hand?.table ?? []).map(({ player, card }) => { const el = renderCard(card); el.classList.add(`player-${player}`); el.title = playerName(player); return el; }));
  $('#trick-summary').textContent = hand?.tricks.length ? hand.tricks.map((trick, i) => text('game.trickResult', { number: i + 1, team: trick.team === null ? text('game.tied') : teamName(trick.team) })).join(' · ') : text('game.noTricks');
  const opponents = $('#opponents');
  opponents.replaceChildren(...[1, 2, 3].map((player) => {
    const el = document.createElement('div');
    el.className = `opponent-seat player-${player} ${player === state.currentPlayer ? 'current' : ''}`;
    el.setAttribute('aria-label', text('game.cardsInHand', { name: playerName(player), count: hand?.hands[player].length ?? 0 }));
    el.replaceChildren(...(hand?.hands[player] ?? []).map(() => {
      const back = document.createElement('span'); back.className = 'card-back'; back.setAttribute('aria-hidden', 'true'); return back;
    }));
    return el;
  }));
  const playerHand = $('#player-hand'); playerHand.replaceChildren(...(hand?.hands[0] ?? []).map((card, index) => renderCard(card, { button: true, playable: state.currentPlayer === 0 && !hand.pendingBid && !hand.finished, onClick: () => playCard(0, index) })));
  const nextBid = hand ? nextBidValue(hand) : null; const canBid = !!hand && !hand.finished && !hand.handOfEleven && !state.awaitingHandOfEleven && !hand.pendingBid && state.currentPlayer === 0 && canAskBid(hand, 0); $('#call-truco').textContent = hand?.handOfEleven ? text('game.handOfElevenValue') : nextBid === 3 ? text('game.askTruco') : nextBid ? `${text('game.askTruco')} ${nextBid}` : text('game.maxBid'); $('#call-truco').disabled = !canBid; $('#call-truco').classList.toggle('truco-ready', canBid);
  $('#call-truco').onclick = () => askBid(0);
  const isHumanResponse = hand?.pendingBid && hand.pendingBid.from % 2 === 1;
  $('#response-actions').classList.toggle('hidden', !isHumanResponse);
  if (isHumanResponse) { $('#bid-message').textContent = text('game.bidMessage', { name: playerName(hand.pendingBid.from), value: hand.pendingBid.value }); document.querySelectorAll('[data-bid-response]').forEach((button) => { button.disabled = button.dataset.bidResponse === 'raise' && !nextBidValue(hand); button.onclick = () => respondToBid(button.dataset.bidResponse); }); }
  renderHandOfElevenPreview(hand);
}

window.addEventListener('truco:localechange', (event) => { locale = event.detail.locale; render(); });
window.addEventListener('truco:configchange', (event) => { state.config = normalizeMatchConfig(event.detail.config); render(); });

$('#hand-eleven-play').addEventListener('click', () => resolveHumanHandOfEleven(true));
$('#hand-eleven-run').addEventListener('click', () => resolveHumanHandOfEleven(false));
$('#new-game').addEventListener('click', () => { state.scores = [0, 0]; state.seriesWins = [0, 0]; state.dealer = 3; state.log = []; state.gameOver = false; startHand(); });
startHand();
