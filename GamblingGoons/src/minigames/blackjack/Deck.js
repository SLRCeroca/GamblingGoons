
import { Card } from './Card.js';

export class Deck {
    constructor({
        modelFolder = '/models/Juegos/blackjack/'
    } = {}) {
        this.modelFolder = modelFolder;

        this.suits = [
            'diamantes',
            'treboles',
            'picas',
            'corazones'
        ];

        this.values = [
            'AS', '2', '3', '4', '5',
            '6', '7', '8', '9', '10',
            'J', 'Q', 'K'
        ];

        this.cards = [];
        this.createDeck();
    }

    createDeck() {
        this.cards = [];

        for (const suit of this.suits) {
            for (const value of this.values) {
                const filename = `${value}${suit}.glb`;

                this.cards.push({
                    value,
                    suit,
                    modelPath: `${this.modelFolder}${filename}`
                });
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [this.cards[i], this.cards[j]] =
                [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) {
            return null;
        }

        const data = this.cards.pop();

        return new Card(data);
    }

    reset() {
        this.createDeck();
        this.shuffle();
    }

    getRemainingCards() {
        return this.cards.length;
    }
}
