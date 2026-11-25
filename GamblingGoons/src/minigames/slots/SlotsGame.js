import {
    SLOT_CONFIG,
    SLOT_SYMBOLS,
    getRandomSymbol
} from './SlotsConfig.js';

export class SlotsGame {
    constructor({
        getMoney,
        setMoney,
        onUpdate = () => { },
        random = Math.random
    }) {
        if (
            typeof getMoney !== 'function' ||
            typeof setMoney !== 'function'
        ) {
            throw new Error('SlotsGame necesita getMoney y setMoney.');
        }

        this.getMoney = getMoney;
        this.setMoney = setMoney;
        this.onUpdate = onUpdate;
        this.random = random;

        this.jackpot = SLOT_CONFIG.jackpotStart;
        this.freeSpins = 0;
        this.currentBet = 0;
        this.pendingSpin = null;
    }

    getBalance() {
        return this.getMoney();
    }

    getState() {
        return {
            balance: this.getBalance(),
            jackpot: this.jackpot,
            freeSpins: this.freeSpins,
            currentBet: this.currentBet
        };
    }

    notifyUpdate() {
        this.onUpdate(this.getState());
    }

    // Tres rodillos con tres posiciones cada uno.
    generateResult() {
        return Array.from({ length: 3 }, () =>
            Array.from({ length: 3 }, () =>
                getRandomSymbol(this.random)
            )
        );
    }

    getSymbol(id) {
        return SLOT_SYMBOLS.find(symbol => symbol.id === id);
    }

    evaluateLine(symbols) {
        const ids = symbols.map(symbol => symbol.id);

        // Jackpot: tres coronas.
        if (ids.every(id => id === 'jackpot')) {
            return {
                type: 'jackpot',
                multiplier: 0,
                matchCount: 3,
                symbol: this.getSymbol('jackpot')
            };
        }

        // Tres Wild.
        if (ids.every(id => id === 'wild')) {
            return {
                type: 'win',
                multiplier: 200,
                matchCount: 3,
                symbol: this.getSymbol('wild')
            };
        }

        // Solo pagan tríos de símbolos normales.
        // Wild sustituye a cualquier símbolo normal.
        for (const symbol of SLOT_SYMBOLS) {
            if (['wild', 'scatter', 'jackpot'].includes(symbol.id)) {
                continue;
            }

            const matches = symbols.filter(
                result =>
                    result.id === symbol.id ||
                    result.id === 'wild'
            ).length;

            if (matches === 3) {
                return {
                    type: 'win',
                    multiplier: symbol.multiplier,
                    matchCount: 3,
                    symbol
                };
            }
        }

        return {
            type: 'lose',
            multiplier: 0,
            matchCount: 0,
            symbol: null
        };
    }

    evaluateResult(reels) {
        const winningLines = [];
        let jackpotHit = false;

        // Evaluar las ocho líneas configuradas.
        for (const payline of SLOT_CONFIG.paylines) {
            const symbols = payline.positions.map(
                ([column, row]) => reels[column][row]
            );

            const evaluation = this.evaluateLine(symbols);

            if (
                evaluation.type === 'win' ||
                evaluation.type === 'jackpot'
            ) {
                if (evaluation.type === 'jackpot') {
                    jackpotHit = true;
                }

                winningLines.push({
                    ...evaluation,
                    id: payline.id,
                    name: payline.name,
                    positions: payline.positions
                });
            }
        }

        // Scatter cuenta en cualquier posición de la cuadrícula.
        const scatterCount = reels
            .flat()
            .filter(symbol => symbol.id === 'scatter')
            .length;

        const scatterHit = scatterCount >= 3;

        let type = 'lose';

        if (jackpotHit) {
            type = 'jackpot';
        } else if (winningLines.length > 0) {
            type = 'win';
        } else if (scatterHit) {
            type = 'scatter';
        }

        return {
            type,
            winningLines,
            jackpotHit,
            scatterHit,
            scatterCount
        };
    }

    beginSpin(bet = null) {
        if (this.pendingSpin) {
            throw new Error('Ya hay una tirada en curso.');
        }

        const isFreeSpin = this.freeSpins > 0;
        let contribution = 0;

        if (isFreeSpin) {
            this.freeSpins--;
        } else {
            const amount = bet == null
                ? this.currentBet
                : Math.floor(Number(bet));

            if (!Number.isFinite(amount) || amount < 8) {
                throw new Error(
                    'La apuesta mínima es de 8$.'
                );
            }

            if (amount > this.getBalance()) {
                throw new Error(
                    'No tienes suficiente dinero para apostar.'
                );
            }

            this.currentBet = amount;

            this.setMoney(this.getBalance() - amount);

            contribution = Math.floor(
                amount * SLOT_CONFIG.jackpotContribution
            );

            this.jackpot += contribution;
        }

        const reels = this.generateResult();

        this.pendingSpin = {
            reels,
            isFreeSpin,
            contribution,
            bet: this.currentBet
        };

        this.notifyUpdate();

        return {
            reels,
            isFreeSpin,
            bet: this.currentBet,
            contribution,
            jackpot: this.jackpot,
            balance: this.getBalance()
        };
    }

    finishSpin() {
        if (!this.pendingSpin) {
            throw new Error('No hay ninguna tirada pendiente.');
        }

        const pending = this.pendingSpin;
        const evaluation = this.evaluateResult(pending.reels);

        let winAmount = 0;
        let jackpotWon = 0;
        let freeSpinsAwarded = 0;

        // La apuesta completa se reparte entre las ocho líneas.
        const lineBet =
            pending.bet / SLOT_CONFIG.paylines.length;

        for (const line of evaluation.winningLines) {
            if (line.type === 'win') {
                winAmount += Math.floor(
                    lineBet * line.multiplier
                );
            }
        }

        // El Jackpot solo se cobra una vez por tirada.
        if (evaluation.jackpotHit) {
            jackpotWon = this.jackpot;
            winAmount += jackpotWon;

            this.jackpot = SLOT_CONFIG.jackpotStart;
        }

        if (winAmount > 0) {
            this.setMoney(this.getBalance() + winAmount);
        }

        // Tres o más Scatter conceden cinco tiradas gratis.
        // No se pueden encadenar desde una tirada gratis.
        if (evaluation.scatterHit && !pending.isFreeSpin) {
            freeSpinsAwarded = SLOT_CONFIG.freeSpinsAwarded;
            this.freeSpins += freeSpinsAwarded;
        }

        const result = {
            reels: pending.reels,
            type: evaluation.type,
            winningLines: evaluation.winningLines,
            jackpotHit: evaluation.jackpotHit,
            scatterHit: evaluation.scatterHit,
            scatterCount: evaluation.scatterCount,
            bet: pending.bet,
            lineBet,
            isFreeSpin: pending.isFreeSpin,
            contribution: pending.contribution,
            winAmount,
            jackpotWon,
            jackpot: this.jackpot,
            freeSpinsAwarded,
            freeSpinsRemaining: this.freeSpins,
            balance: this.getBalance()
        };

        this.pendingSpin = null;

        this.notifyUpdate();

        return result;
    }

    spin(bet = null) {
        this.beginSpin(bet);
        return this.finishSpin();
    }

    reset() {
        if (this.pendingSpin) {
            throw new Error(
                'No se puede reiniciar durante una tirada.'
            );
        }

        this.jackpot = SLOT_CONFIG.jackpotStart;
        this.freeSpins = 0;
        this.currentBet = 0;

        this.notifyUpdate();
    }
}