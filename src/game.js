export const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
export const SUITS = [
  { id: 'clubs', symbol: '♣', label: 'Paus', power: 4 },
  { id: 'hearts', symbol: '♥', label: 'Copas', power: 3 },
  { id: 'spades', symbol: '♠', label: 'Espadas', power: 2 },
  { id: 'diamonds', symbol: '♦', label: 'Ouros', power: 1 },
];
export const BID_VALUES = [1, 3, 6, 9, 12];

export function nextBidValue(hand) {
  return BID_VALUES[BID_VALUES.indexOf(hand.value) + 1] ?? null;
}

// Each new raise belongs to the other team.  Once a team calls Truco (or 6,
// 9, or 12), it cannot call the following value unless the opponents raise
// first.
export function canAskBid(hand, player) {
  return Boolean(nextBidValue(hand))
    && (hand.lastBidTeam === null || hand.lastBidTeam !== player % 2);
}

const shuffle = (cards) => {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
};

export function makeDeck() {
  return shuffle(RANKS.flatMap((rank) => SUITS.map((suit) => ({ rank, suit }))));
}

export function cardLabel(card) { return `${card.rank}${card.suit.symbol}`; }

export function manilhaRank(vira) {
  return RANKS[(RANKS.indexOf(vira.rank) + 1) % RANKS.length];
}

export function cardPower(card, vira) {
  const manilha = manilhaRank(vira);
  return card.rank === manilha ? 100 + card.suit.power : RANKS.indexOf(card.rank);
}

export function newHand(dealer = 3) {
  const deck = makeDeck();
  const hands = Array.from({ length: 4 }, () => []);
  for (let card = 0; card < 3; card += 1) {
    for (let player = 0; player < 4; player += 1) hands[player].push(deck.pop());
  }
  return { dealer, leader: (dealer + 1) % 4, hands, vira: deck.pop(), tricks: [], table: [], value: 1, lastBidTeam: null, pendingBid: null, finished: false };
}

export function winningTeam(table, vira) {
  const powers = table.map((play) => cardPower(play.card, vira));
  const highest = Math.max(...powers);
  const leaders = table.filter((_, index) => powers[index] === highest);
  return leaders.length === 1 ? leaders[0].player % 2 : null;
}

export function handWinner(hand) {
  const wins = [0, 0];
  for (const trick of hand.tricks) if (trick.team !== null) wins[trick.team] += 1;
  if (wins[0] === 2) return 0;
  if (wins[1] === 2) return 1;
  if (hand.tricks.length < 2) return null;

  const [first, second, third] = hand.tricks;
  if (second && first.team !== null && second.team === null) return first.team;
  if (second && first.team === null && second.team !== null) return second.team;
  if (hand.tricks.length < 3) return null;
  return first.team ?? second.team ?? third.team ?? hand.leader % 2;
}
