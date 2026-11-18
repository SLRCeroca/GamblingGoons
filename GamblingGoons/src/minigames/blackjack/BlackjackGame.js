
import * as THREE from 'three';
import { Deck } from './Deck.js';

export class BlackjackGame {
    constructor({
        scene,
        gameState,
        player,
        ui = null,

        dealerPosition = new THREE.Vector3(0, 0, -1),
        playerPosition = new THREE.Vector3(0, 0, 1),

        cardSpacing = 0.2,
        cardHeight = 0
    }) {
        this.scene = scene;
        this.gameState = gameState;
        this.player = player;
        this.ui = ui;

        this.dealerPosition = dealerPosition.clone();
        this.playerPosition = playerPosition.clone();

        this.cardSpacing = cardSpacing;
        this.cardHeight = cardHeight;

        this.deck = new Deck({
            modelFolder: '/models/Juegos/blackjack/'
        });

        this.playerHand = [];
        this.dealerHand = [];
        this.cardModels = [];

        this.hiddenDealerCard = null;

        this.state = 'idle';
        this.bet = 0;
        this.result = null;

        this.busy = false;
        this.betPaid = false;
        this.settled = false;
    }

    // =====================================
    // DINERO
    // =====================================

    getMoney() {
        return this.gameState?.money ?? 0;
    }

    updateMoney(amount) {
        if (typeof this.gameState?.setMoney === 'function') {
            this.gameState.setMoney(amount);
        } else {
            this.gameState.money = amount;
            this.gameState.updateHUD?.();
        }
    }

    // =====================================
    // INICIAR PARTIDA
    // =====================================

    async startGame(bet = 50) {
        if (this.state !== 'idle' || this.busy) return;

        if (!Number.isFinite(bet) || bet <= 0) return;

        if (this.getMoney() < bet) {
            console.warn('No tienes suficiente dinero.');
            return;
        }

        this.busy = true;

        try {
            this.clearTable();

            this.bet = bet;
            this.result = null;

            this.betPaid = false;
            this.settled = false;

            this.deck.reset();

            // Descontar la apuesta una sola vez.
            this.updateMoney(this.getMoney() - bet);
            this.betPaid = true;

            this.state = 'playing';

            // Reparto inicial alternado.
            await this.dealCard(
                this.playerHand,
                this.playerPosition
            );

            await this.dealCard(
                this.dealerHand,
                this.dealerPosition
            );

            await this.dealCard(
                this.playerHand,
                this.playerPosition
            );

            const dealerSecondCard = await this.dealCard(
                this.dealerHand,
                this.dealerPosition
            );

            // Ocultar provisionalmente la segunda carta de la banca.
            if (dealerSecondCard) {
                this.hiddenDealerCard = dealerSecondCard;
                dealerSecondCard.setVisible(false);
            }

            this.printHands();

            // Comprobar Blackjack natural.
            const playerNatural = this.isNatural(this.playerHand);
            const dealerNatural = this.isNatural(this.dealerHand);

            if (playerNatural && dealerNatural) {
                this.finishGame('draw');
            } else if (playerNatural) {
                this.finishGame('blackjack');
            } else if (dealerNatural) {
                this.finishGame('dealerBlackjack');
            } else {
                this.updateUI();
            }

        } catch (error) {
            console.error('Error iniciando Blackjack:', error);

            // Devolver la apuesta si la partida no pudo comenzar.
            if (this.betPaid && !this.settled) {
                this.updateMoney(this.getMoney() + this.bet);
            }

            this.betPaid = false;
            this.settled = true;
            this.clearTable();
            this.state = 'idle';

        } finally {
            this.busy = false;
        }
    }

    // =====================================
    // REPARTIR CARTAS
    // =====================================

    async dealCard(hand, basePosition) {
        const card = this.deck.draw();

        if (!card) {
            console.warn('No quedan cartas en el mazo.');
            return null;
        }

        const model = await card.load();

        this.scene.add(model);

        hand.push(card);
        this.cardModels.push(card);

        this.repositionHand(hand, basePosition);

        return card;
    }

    repositionHand(hand, basePosition) {
        const total = hand.length;

        hand.forEach((card, index) => {
            const position = basePosition.clone();

            // Distribuir las cartas lateralmente sobre el tapete.
            position.z += (
                index - (total - 1) / 2
            ) * this.cardSpacing;

            // Elevar ligeramente las cartas sobre la superficie.
            position.y += this.cardHeight;

            card.setPosition(position);
        });
    }

    // =====================================
    // VALOR DE LAS MANOS
    // =====================================

    getHandValue(hand) {
        let total = 0;
        let aces = 0;

        for (const card of hand) {
            if (card.value === 'AS') {
                total += 11;
                aces++;
            } else if (
                ['J', 'Q', 'K'].includes(card.value)
            ) {
                total += 10;
            } else {
                total += Number(card.value);
            }
        }

        // Los ases pasan de 11 a 1 si es necesario.
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    isNatural(hand) {
        return (
            hand.length === 2 &&
            this.getHandValue(hand) === 21
        );
    }

    printHands() {
        console.log(
            'Jugador:',
            this.getHandValue(this.playerHand)
        );

        console.log(
            'Banca:',
            this.getHandValue(this.dealerHand)
        );
    }

    // =====================================
    // ACTUALIZAR INTERFAZ
    // =====================================

    updateUI() {
        if (!this.ui) return;

        const dealerVisibleScore = this.hiddenDealerCard
            ? this.getHandValue([this.dealerHand[0]])
            : this.getHandValue(this.dealerHand);

        this.ui.showGame({
            playerScore: this.getHandValue(this.playerHand),
            dealerScore: dealerVisibleScore,
            hiddenDealerCard: false
        });
    }

    revealDealerCard() {
        if (!this.hiddenDealerCard) return;

        this.hiddenDealerCard.setVisible(true);
        this.hiddenDealerCard = null;
    }

    // =====================================
    // TURNO DEL JUGADOR
    // =====================================

    async hit() {
        if (this.state !== 'playing' || this.busy) return;

        this.busy = true;

        try {
            await this.dealCard(
                this.playerHand,
                this.playerPosition
            );

            const score = this.getHandValue(this.playerHand);

            if (score > 21) {
                this.revealDealerCard();
                this.finishGame('dealer');
            } else if (score === 21) {
                await this.standInternal();
            } else {
                this.updateUI();
            }

        } catch (error) {
            console.error('Error al pedir carta:', error);
        } finally {
            this.busy = false;
        }
    }

    async stand() {
        if (this.state !== 'playing' || this.busy) return;

        this.busy = true;

        try {
            await this.standInternal();
        } catch (error) {
            console.error('Error al plantarse:', error);
        } finally {
            this.busy = false;
        }
    }

    async standInternal() {
        this.state = 'dealerTurn';

        this.revealDealerCard();

        await this.dealerTurn();
    }

    // =====================================
    // TURNO DE LA BANCA
    // =====================================

    async dealerTurn() {
        while (this.getHandValue(this.dealerHand) < 17) {
            await this.dealCard(
                this.dealerHand,
                this.dealerPosition
            );
        }

        this.checkWinner();
    }

    // =====================================
    // COMPROBAR RESULTADO
    // =====================================

    checkWinner() {
        const playerScore = this.getHandValue(this.playerHand);
        const dealerScore = this.getHandValue(this.dealerHand);

        if (playerScore > 21) {
            this.finishGame('dealer');
        } else if (dealerScore > 21) {
            this.finishGame('player');
        } else if (playerScore > dealerScore) {
            this.finishGame('player');
        } else if (playerScore < dealerScore) {
            this.finishGame('dealer');
        } else {
            this.finishGame('draw');
        }
    }

    // =====================================
    // FINALIZAR Y PAGAR
    // =====================================

    finishGame(result) {
        if (this.settled) return;

        this.result = result;
        this.state = 'finished';
        this.settled = true;

        let payout = 0;

        switch (result) {
            case 'player':
                // Victoria normal: recuperar apuesta + premio igual.
                payout = this.bet * 2;
                break;

            case 'blackjack':
                // Blackjack natural: recuperar apuesta + premio 3:2.
                payout = this.bet * 2.5;
                break;

            case 'draw':
                // Empate: recuperar apuesta.
                payout = this.bet;
                break;

            case 'dealer':
            case 'dealerBlackjack':
                // Derrota: no se recupera la apuesta.
                payout = 0;
                break;
        }

        this.updateMoney(this.getMoney() + payout);

        console.log('Resultado:', result);
        console.log('Premio:', payout);
        console.log('Dinero restante:', this.getMoney());

        this.printHands();

        if (this.ui) {
            const messages = {
                player: '¡HAS GANADO!',
                blackjack: '¡BLACKJACK! PAGO 3:2',
                dealer: 'LA BANCA GANA',
                dealerBlackjack: 'BLACKJACK DE LA BANCA',
                draw: 'EMPATE'
            };

            this.ui.showResult({
                message: messages[result],
                playerScore: this.getHandValue(this.playerHand),
                dealerScore: this.getHandValue(this.dealerHand)
            });
        }
    }

    // =====================================
    // LIMPIAR MESA
    // =====================================

    clearTable() {
        for (const card of this.cardModels) {
            const model = card.getModel();

            if (model) {
                this.scene.remove(model);
            }
        }

        this.cardModels = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.hiddenDealerCard = null;
    }

    // =====================================
    // SALIR DEL MINIJUEGO
    // =====================================

    endGame() {
        //No devolver la apuesta si la partida ya se ha liquidado, te jodes.
        this.betPaid = false;
        this.settled = false;

        this.clearTable();

        this.state = 'idle';
        this.result = null;
        this.bet = 0;

        this.busy = false;
    }
}
