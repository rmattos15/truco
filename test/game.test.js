import test from 'node:test';
import assert from 'node:assert/strict';
import { RANKS, SUITS, canAskBid, cardPower, handWinner, makeDeck, manilhaRank } from '../src/game.js';
import { chooseBotBidResponse, chooseBotCard, shouldBotAskBid } from '../src/bot.js';
import { DEFAULT_MATCH_CONFIG, normalizeMatchConfig } from '../src/config.js';

const card = (rank, suit = SUITS[0]) => ({ rank, suit });

test('baralho tem 40 cartas únicas', () => {
  const deck = makeDeck();
  assert.equal(deck.length, 40);
  assert.equal(new Set(deck.map((item) => `${item.rank}${item.suit.id}`)).size, 40);
});

test('a manilha segue a vira e volta de 3 para 4', () => {
  assert.equal(manilhaRank(card('5')), '6');
  assert.equal(manilhaRank(card('3')), '4');
});

test('manilhas vencem 3 e respeitam a ordem dos naipes', () => {
  const vira = card('5');
  assert.ok(cardPower(card('6', SUITS[0]), vira) > cardPower(card('3'), vira));
  assert.ok(cardPower(card('6', SUITS[0]), vira) > cardPower(card('6', SUITS[3]), vira));
});

test('uma dupla vence a mão ao ganhar duas vazas', () => {
  assert.equal(handWinner({ leader: 0, tricks: [{ team: 1 }, { team: 1 }] }), 1);
  assert.equal(handWinner({ leader: 0, tricks: [{ team: 0 }, { team: null }] }), 0);
});

test('a dupla que pediu truco não pode pedir o próximo aumento', () => {
  const hand = { value: 3, lastBidTeam: 0 };
  assert.equal(canAskBid(hand, 0), false);
  assert.equal(canAskBid(hand, 2), false);
  assert.equal(canAskBid(hand, 1), true);
  assert.equal(canAskBid(hand, 3), true);
});

test('bot preserva carta forte quando seu parceiro já vence a vaza', () => {
  const vira = card('5');
  const hand = {
    vira, tricks: [],
    hands: [[], [card('6'), card('4')], [], []],
    table: [{ player: 3, card: card('3') }],
  };
  assert.equal(chooseBotCard({ player: 1, hand }), 1);
});

test('bot usa a menor carta que vence quando precisa disputar a vaza', () => {
  const vira = card('5');
  const hand = {
    vira, tricks: [],
    hands: [[], [card('A'), card('2'), card('3')], [], []],
    table: [{ player: 0, card: card('K') }],
  };
  assert.equal(chooseBotCard({ player: 1, hand }), 0);
});

test('bot corre de aumento alto com mão fraca e pede truco com mão excepcional', () => {
  const vira = card('5');
  const weakHand = { vira, tricks: [], table: [], value: 3, pendingBid: { value: 6 }, hands: [[], [card('4'), card('5'), card('7')], [], []] };
  assert.equal(chooseBotBidResponse({ player: 1, hand: weakHand, scores: [0, 0], rng: () => 0 }), 'run');
  const strongHand = { vira, tricks: [], table: [], value: 1, hands: [[], [card('6', SUITS[0]), card('6', SUITS[1]), card('3')], [], []] };
  assert.equal(shouldBotAskBid({ player: 1, hand: strongHand, scores: [0, 0], rng: () => .99 }), true);
});

test('configuração da partida preserva somente opções válidas e nomes utilizáveis', () => {
  const config = normalizeMatchConfig({ names: [' Ana ', '', ' Caio ', 'Duda'], difficulty: 'competitive', format: 'series', highContrast: 1, handOfEleven: true });
  assert.deepEqual(config.names, ['Ana', DEFAULT_MATCH_CONFIG.names[1], 'Caio', 'Duda']);
  assert.equal(config.difficulty, 'competitive');
  assert.equal(config.format, 'series');
  assert.equal(config.highContrast, true);
  assert.equal(config.handOfEleven, true);
});
