export const SLOT_CONFIG = {
    jackpotStart: 1000,
    jackpotContribution: 0.04,
    freeSpinsAwarded: 5,

    reels: 3,
    rows: 3,

    paylines: [
        {
            id: 'horizontal-1',
            name: 'HORIZONTAL SUPERIOR',
            positions: [[0, 0], [1, 0], [2, 0]]
        },
        {
            id: 'horizontal-2',
            name: 'HORIZONTAL CENTRAL',
            positions: [[0, 1], [1, 1], [2, 1]]
        },
        {
            id: 'horizontal-3',
            name: 'HORIZONTAL INFERIOR',
            positions: [[0, 2], [1, 2], [2, 2]]
        },
        {
            id: 'vertical-1',
            name: 'VERTICAL IZQUIERDA',
            positions: [[0, 0], [0, 1], [0, 2]]
        },
        {
            id: 'vertical-2',
            name: 'VERTICAL CENTRAL',
            positions: [[1, 0], [1, 1], [1, 2]]
        },
        {
            id: 'vertical-3',
            name: 'VERTICAL DERECHA',
            positions: [[2, 0], [2, 1], [2, 2]]
        },
        {
            id: 'diagonal-1',
            name: 'DIAGONAL DESCENDENTE',
            positions: [[0, 0], [1, 1], [2, 2]]
        },
        {
            id: 'diagonal-2',
            name: 'DIAGONAL ASCENDENTE',
            positions: [[0, 2], [1, 1], [2, 0]]
        }
    ]
};

export const SLOT_SYMBOLS = [
    {
        id: 'cherry',
        name: 'Cerezas',
        emoji: '🍒',
        weight: 240,
        multiplier: 7,
        pairMultiplier: 0.5
    },
    {
        id: 'lemon',
        name: 'Limón',
        emoji: '🍋',
        weight: 200,
        multiplier: 9,
        pairMultiplier: 0.75
    },
    {
        id: 'grapes',
        name: 'Uvas',
        emoji: '🍇',
        weight: 160,
        multiplier: 12,
        pairMultiplier: 1
    },
    {
        id: 'bell',
        name: 'Campana',
        emoji: '🔔',
        weight: 130,
        multiplier: 18,
        pairMultiplier: 1.5
    },
    {
        id: 'diamond',
        name: 'Diamante',
        emoji: '💎',
        weight: 90,
        multiplier: 35,
        pairMultiplier: 2
    },
    {
        id: 'seven',
        name: 'Siete',
        emoji: '7️⃣',
        weight: 60,
        multiplier: 100,
        pairMultiplier: 5
    },
    {
        id: 'wild',
        name: 'Wild',
        emoji: '⭐',
        weight: 45,
        multiplier: 150,
        pairMultiplier: 0
    },
    {
        id: 'scatter',
        name: 'Scatter',
        emoji: '🎰',
        weight: 40,
        multiplier: 0,
        pairMultiplier: 0
    },
    {
        id: 'jackpot',
        name: 'Jackpot',
        emoji: '👑',
        weight: 5,
        multiplier: 0,
        pairMultiplier: 0
    }
];

export function getRandomSymbol(random = Math.random) {
    const totalWeight = SLOT_SYMBOLS.reduce(
        (total, symbol) => total + symbol.weight,
        0
    );

    let randomValue = random() * totalWeight;

    for (const symbol of SLOT_SYMBOLS) {
        randomValue -= symbol.weight;

        if (randomValue < 0) {
            return symbol;
        }
    }

    return SLOT_SYMBOLS[0];
}