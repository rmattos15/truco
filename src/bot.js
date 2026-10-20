import { cardPower } from './game.js';

// These decisions intentionally only use information a player at the table has:
// its cards, the vira, exposed cards and the score.  The bots do not inspect a
// partner's hand.
const teamOf = (player) => player % 2;

function strength(card, vira) {
  const power = cardPower(card, vira);
  if (power >= 100) return 10 + (power - 100) * 0.3;
  // 3, 2 and Ás are valuable enough to lead or answer a trick, while lower
  // cards are primarily useful as discards.
  return power * 0.72;
}

export function assessHand(cards, vira) {
  const values = cards.map((card) => strength(card, vira)).sort((a, b) => b - a);
  const manilhas = cards.filter((card) => cardPower(card, vira) >= 100).length;
  const strongCards = values.filter((value) => value >= 5).length;
  let confidence = values.reduce((total, value) => total + value, 0);
  if (manilhas >= 1) confidence += 2;
  if (strongCards >= 2) confidence += 2;
  if (manilhas >= 2) confidence += 3;
  return { confidence, manilhas, strongCards };
}

function currentWinner(table, vira) {
  if (!table.length) return null;
  const powers = table.map((play) => cardPower(play.card, vira));
  const highest = Math.max(...powers);
  return powers.filter((power) => power === highest).length === 1
    ? table[powers.indexOf(highest)]
    : null;
}

function weakestIndex(cards, vira) {
  return cards.reduce((best, card, index) => (
    strength(card, vira) < strength(cards[best], vira) ? index : best
  ), 0);
}

function cheapestWinnerIndex(cards, table, vira) {
  const high = Math.max(...table.map((play) => cardPower(play.card, vira)));
  const candidates = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => cardPower(card, vira) > high)
    .sort((a, b) => cardPower(a.card, vira) - cardPower(b.card, vira));
  return candidates[0]?.index ?? null;
}

/** Choose a card while preserving winning cards whenever the partner has it. */
export function chooseBotCard({ player, hand, difficulty = 'normal', rng = Math.random }) {
  const cards = hand.hands[player];
  // Easy players occasionally make a plausible but strategically weak choice.
  if (difficulty === 'easy' && cards.length > 1 && rng() < 0.32) return Math.floor(rng() * cards.length);
  const { table, vira, tricks } = hand;
  const mine = teamOf(player);
  const winner = currentWinner(table, vira);
  const cheapestWinner = table.length ? cheapestWinnerIndex(cards, table, vira) : null;
  const weakest = weakestIndex(cards, vira);

  // A partner already winning means a cheap discard is usually strictly best.
  if (winner && teamOf(winner.player) === mine) return weakest;
  if (table.length && cheapestWinner !== null) return cheapestWinner;
  if (table.length) return weakest;

  // When leading, avoid donating a manilha or a 3 without a reason. Lead the
  // lowest card that still has real chance to command the trick; on the final
  // trick, cash the best card instead.
  const ordered = cards.map((card, index) => ({ card, index, value: strength(card, vira) }))
    .sort((a, b) => a.value - b.value);
  if (tricks.length === 2) return ordered.at(-1).index;
  const lead = ordered.find(({ value }) => value >= 3.6 && value < 10);
  return lead?.index ?? weakest;
}

export function shouldBotAskBid({ player, hand, scores, difficulty = 'normal', rng = Math.random }) {
  if (!hand.hands[player].length) return false;
  const { confidence, manilhas } = assessHand(hand.hands[player], hand.vira);
  const team = teamOf(player);
  const theirScore = scores[1 - team];
  const ourScore = scores[team];
  const alreadyWon = hand.tricks.filter((trick) => trick.team === team).length;
  const threshold = hand.value === 1 ? 11 : hand.value === 3 ? 15 : hand.value === 6 ? 18 : 21;
  const pressure = theirScore >= 9 ? 1.2 : 0;
  const leadBonus = hand.table.length === 0 ? 0.8 : 0;
  const lateGameBonus = ourScore >= 10 ? 0.7 : 0;
  const adjustment = difficulty === 'easy' ? 2.4 : difficulty === 'competitive' ? -1.35 : 0;
  const certain = confidence + pressure + leadBonus + lateGameBonus >= threshold + adjustment;
  // A rare, believable initiative keeps the game from becoming mechanical;
  // it is only allowed with at least one strong card or a won trick.
  const calculatedTry = (manilhas > 0 || alreadyWon > 0) && confidence >= threshold - 2.2 + adjustment && rng() < (difficulty === 'competitive' ? 0.27 : 0.16);
  // Easy bots bluff and overcall too often; competitive bots only do so with a
  // defensible hand and public table information.
  const poorCall = difficulty === 'easy' && confidence < threshold - 2 && rng() < 0.18;
  return certain || calculatedTry || poorCall;
}

export function chooseBotBidResponse({ player, hand, scores, difficulty = 'normal', rng = Math.random }) {
  const { confidence, manilhas, strongCards } = assessHand(hand.hands[player], hand.vira);
  const team = teamOf(player);
  const proposed = hand.pendingBid.value;
  const opponentNearWin = scores[1 - team] >= 10;
  const thresholds = { 3: 8.5, 6: 12, 9: 15.5, 12: 19 };
  const required = (thresholds[proposed] ?? 99) - (opponentNearWin ? 1 : 0) + (difficulty === 'easy' ? 2 : difficulty === 'competitive' ? -1 : 0);
  const hasPosition = hand.tricks.some((trick) => trick.team === team);
  const accept = confidence >= required || (hasPosition && confidence >= required - 1.2 && rng() < (difficulty === 'competitive' ? 0.42 : 0.25));
  if (!accept) return 'run';

  const nextThreshold = { 3: 15.5, 6: 19, 9: 22 }[proposed];
  const canRaise = nextThreshold && confidence >= nextThreshold && (manilhas > 0 || strongCards >= 3);
  return canRaise && rng() < (difficulty === 'competitive' ? 0.62 : difficulty === 'easy' ? 0.18 : 0.38) ? 'raise' : 'accept';
}

export function shouldBotPlayHandOfEleven({ player, hand, difficulty = 'normal', rng = Math.random }) {
  const { confidence, manilhas, strongCards } = assessHand(hand.hands[player], hand.vira);
  const threshold = difficulty === 'easy' ? 9 : difficulty === 'competitive' ? 6.5 : 7.7;
  return confidence >= threshold || manilhas > 0 || strongCards >= 2 || (difficulty === 'easy' && rng() < 0.2);
}
