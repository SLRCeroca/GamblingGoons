
export class SlotsUI {
    constructor({
        playerNumber,
        getMoney,
        getJackpot,
        getFreeSpins = () => 0,
        onSpin,
        onStopSpin,
        onExit,
        isSolo = false
    }) {
        this.playerNumber = playerNumber;
        this.getMoney = getMoney;
        this.getJackpot = getJackpot;
        this.getFreeSpins = getFreeSpins;

        this.onSpin = onSpin;
        this.onStopSpin = onStopSpin;
        this.onExit = onExit;

        this.isSolo = isSolo;

        this.selectedBet = 50;
        this.container = null;
        this.isSpinning = false;

        this.reelsStarted = false;
        this.reelsStopping = false;

        this.reelIntervals = [];
        this.reelTimeouts = [];

        // Tres rodillos, cada uno con tres posiciones.
        this.reelElements = [];

        this.spinButton = null;
    }

    create() {
        if (this.container) return;

        this.container = document.createElement('div');

        this.container.className = this.isSolo
            ? 'slots-ui slots-ui-solo'
            : 'slots-ui slots-ui-split';

        const left = this.isSolo
            ? '50%'
            : this.playerNumber === 1
                ? '25%'
                : '75%';

        Object.assign(this.container.style, {
            position: 'fixed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',

            left,
            top: '50%',
            bottom: 'auto',
            right: 'auto',

            transform: 'translate(-50%, -50%)',

            width: this.isSolo ? '100vw' : '50vw',
            height: '100vh',
            maxWidth: 'none',
            minHeight: '0',

            padding: '24px',
            boxSizing: 'border-box',

            background: 'transparent',
            backdropFilter: 'none',

            overflowY: 'auto',
            zIndex: '99999',
            visibility: 'visible',
            opacity: '1',
            pointerEvents: 'auto'
        });

        document.body.appendChild(this.container);
    }

    createButton(text, callback, className = '') {
        const button = document.createElement('button');

        button.textContent = text;
        button.className = `slots-button ${className}`;
        button.addEventListener('click', callback);

        return button;
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.className = 'slots-panel';
        return panel;
    }

    createTitle(text = 'LUCKY SLOTS') {
        const title = document.createElement('h2');
        title.className = 'slots-title';
        title.textContent = text;
        return title;
    }

    createJackpot() {
        const container = document.createElement('div');
        container.className = 'slots-jackpot';

        const label = document.createElement('span');
        label.textContent = 'JACKPOT';

        const amount = document.createElement('strong');
        amount.textContent = `${this.getJackpot()}$`;

        container.append(label, amount);
        return container;
    }

    createMoney() {
        const money = document.createElement('p');
        money.className = 'slots-money';
        money.textContent = `CARTERA: ${this.getMoney()}$`;
        return money;
    }

    showBetting() {
        this.create();
        this.clearReelAnimations();
        this.container.replaceChildren();

        this.isSpinning = false;
        this.spinButton = null;

        if (
            !Number.isInteger(this.selectedBet) ||
            this.selectedBet <= 0
        ) {
            this.selectedBet = 50;
        }

        const panel = this.createPanel();

        const subtitle = document.createElement('p');
        subtitle.className = 'slots-subtitle';
        subtitle.textContent = 'ELIGE TU APUESTA TOTAL';

        const betOptions = document.createElement('div');
        betOptions.className = 'slots-bets';

        const presetButtons = [];

        const customBetId = `slots-custom-bet-${this.playerNumber}`;

        const customBetInput = document.createElement('input');
        customBetInput.id = customBetId;
        customBetInput.type = 'number';
        customBetInput.min = '8';
        customBetInput.step = '1';
        customBetInput.max = String(this.getMoney());
        customBetInput.placeholder = 'Introduce tu apuesta...';

        const startButton = this.createButton(
            'JUGAR',
            () => {
                const amount = this.selectedBet;

                if (
                    !Number.isInteger(amount) ||
                    amount <= 8 ||
                    amount > this.getMoney()
                ) {
                    return;
                }

                this.onSpin(amount);
            },
            'slots-primary'
        );

        const updateStartButton = () => {
            const validBet =
                Number.isInteger(this.selectedBet) &&
                this.selectedBet >= 8 &&
                this.selectedBet <= this.getMoney();

            startButton.disabled = !validBet;
            startButton.classList.toggle(
                'slots-disabled',
                !validBet
            );
        };

        [25, 50, 100].forEach(amount => {
            const button = this.createButton(
                `${amount}$`,
                () => {
                    if (amount > this.getMoney()) return;

                    this.selectedBet = amount;
                    customBetInput.value = '';

                    presetButtons.forEach(btn =>
                        btn.classList.remove('selected')
                    );

                    button.classList.add('selected');
                    updateStartButton();
                },
                amount === this.selectedBet ? 'selected' : ''
            );

            button.disabled = amount > this.getMoney();

            presetButtons.push(button);
            betOptions.appendChild(button);
        });

        const customBetContainer = document.createElement('div');
        customBetContainer.className = 'slots-custom-bet';

        const customBetLabel = document.createElement('label');
        customBetLabel.htmlFor = customBetId;
        customBetLabel.textContent = 'O APUESTA OTRA CANTIDAD';

        customBetInput.addEventListener('input', () => {
            const amount = Number(customBetInput.value);

            presetButtons.forEach(btn =>
                btn.classList.remove('selected')
            );

            if (
                customBetInput.value.trim() !== '' &&
                Number.isInteger(amount) &&
                amount >= 8 &&
                amount <= this.getMoney()
            ) {
                this.selectedBet = amount;
            } else {
                this.selectedBet = 0;
            }

            updateStartButton();
        });

        customBetContainer.append(
            customBetLabel,
            customBetInput
        );

        if (![25, 50, 100].includes(this.selectedBet)) {
            customBetInput.value = this.selectedBet;
        }

        updateStartButton();

        const exitButton = this.createButton(
            'SALIR',
            () => this.onExit()
        );

        panel.append(
            this.createTitle(),
            this.createJackpot(),
            this.createMoney(),
            subtitle,
            betOptions,
            customBetContainer,
            startButton,
            exitButton
        );

        this.container.appendChild(panel);
    }

    // Crea una cuadrícula de tres rodillos y tres filas.
    createReelsGrid() {
        const reels = document.createElement('div');
        reels.className = 'slots-reels slots-reels-grid';

        this.reelElements = [];

        for (let column = 0; column < 3; column++) {
            const reel = document.createElement('div');
            reel.className = 'slots-reel-column';

            const cells = [];

            for (let row = 0; row < 3; row++) {
                const cell = document.createElement('div');

                cell.className = 'slots-reel-cell';
                cell.textContent = '❔';
                cell.dataset.row = String(row);
                cell.dataset.column = String(column);

                cells.push(cell);
                reel.appendChild(cell);
            }

            this.reelElements.push(cells);
            reels.appendChild(reel);
        }

        return reels;
    }

    showGame() {
        this.create();
        this.clearReelAnimations();
        this.container.replaceChildren();

        this.isSpinning = false;

        const panel = this.createPanel();

        const reels = this.createReelsGrid();

        const info = document.createElement('p');
        info.className = 'slots-info';

        const freeSpins = this.getFreeSpins();

        info.textContent = freeSpins > 0
            ? `TIRADAS GRATIS RESTANTES: ${freeSpins}`
            : '¡PRUEBA TU SUERTE!';

        this.spinButton = this.createButton(
            freeSpins > 0 ? 'TIRADA GRATIS' : 'GIRAR',
            () => {
                if (this.reelsStopping) return;

                if (!this.reelsStarted) {
                    this.isSpinning = true;

                    this.spinButton.disabled = true;
                    this.spinButton.textContent = 'PALANCA...';

                    this.onSpin();
                } else {
                    this.onStopSpin();
                }
            },
            'slots-primary'
        );

        const exitButton = this.createButton(
            'SALIR',
            () => this.onExit()
        );

        panel.append(
            this.createTitle(),
            this.createJackpot(),
            this.createMoney(),
            reels,
            info,
            this.spinButton,
            exitButton
        );

        this.container.appendChild(panel);
    }

    showResult(result) {
        this.create();
        this.clearReelAnimations();

        this.container.replaceChildren();

        this.isSpinning = false;
        this.spinButton = null;

        const panel = this.createPanel();

        const reels = this.createReelsGrid();

        // Mostrar la cuadrícula definitiva.
        result.reels.forEach((column, columnIndex) => {
            column.forEach((symbol, rowIndex) => {
                const cell = this.reelElements[columnIndex][rowIndex];
                cell.textContent = symbol.emoji;
            });
        });

        const winningPositions = new Set();

        (result.winningLines || []).forEach(line => {
            (line.positions || []).forEach(([column, row]) => {
                winningPositions.add(`${column}-${row}`);
            });
        });

        this.reelElements.forEach((column, columnIndex) => {
            column.forEach((cell, rowIndex) => {
                if (winningPositions.has(`${columnIndex}-${rowIndex}`)) {
                    cell.classList.add('slots-winning');
                }
            });
        });;

        const message = document.createElement('p');
        message.className = 'slots-result-message';

        if (result.jackpotHit) {
            message.textContent =
                `¡JACKPOT! +${result.jackpotWon}$`;

            message.classList.add('slots-win');
        } else if (result.winAmount > 0) {
            message.textContent =
                `¡PREMIO! HAS GANADO ${result.winAmount}$`;

            message.classList.add('slots-win');
        } else if (result.scatterHit) {
            message.textContent =
                `¡BONUS! +${result.freeSpinsAwarded} TIRADAS GRATIS`;

            message.classList.add('slots-bonus');
        } else {
            message.textContent =
                'SIN PREMIO. ¡SUERTE EN LA PRÓXIMA!';
        }

        // Detalle de los premios por línea.
        const lineDetails = document.createElement('div');
        lineDetails.className = 'slots-line-details';

        if (result.winningLines?.length > 0) {
            result.winningLines.forEach(line => {
                const detail = document.createElement('p');

                if (line.type === 'jackpot') {
                    detail.textContent =
                        `${line.name}: JACKPOT`;
                } else {
                    const linePrize = Math.floor(
                        result.lineBet * line.multiplier
                    );

                    detail.textContent =
                        `${line.name}: ${line.symbol.emoji} ${line.matchCount === 2 ? 'PAREJA' : 'TRÍO'} x${line.multiplier} — +${linePrize}$`;
                }

                lineDetails.appendChild(detail);
            });
        }

        if (result.scatterHit) {
            const scatter = document.createElement('p');

            scatter.textContent =
                `SCATTER: ${result.scatterCount} símbolos`;

            lineDetails.appendChild(scatter);
        }

        const details = document.createElement('div');
        details.className = 'slots-details';

        const bet = document.createElement('p');
        bet.textContent = result.isFreeSpin
            ? 'TIRADA GRATIS'
            : `APUESTA TOTAL: ${result.bet}$`;

        const balance = document.createElement('p');
        balance.textContent = `CARTERA: ${result.balance}$`;

        const jackpot = document.createElement('p');
        jackpot.textContent = `JACKPOT: ${result.jackpot}$`;

        details.append(bet, balance, jackpot);

        if (result.freeSpinsRemaining > 0) {
            const freeSpins = document.createElement('p');

            freeSpins.className = 'slots-free-spins';

            freeSpins.textContent =
                `TIRADAS GRATIS RESTANTES: ${result.freeSpinsRemaining}`;

            details.appendChild(freeSpins);
        }

        const nextButton = this.createButton(
            result.freeSpinsRemaining > 0
                ? 'SIGUIENTE TIRADA GRATIS'
                : 'CAMBIAR APUESTA / GIRAR',
            () => {
                if (result.freeSpinsRemaining > 0) {
                    this.showGame();
                } else {
                    this.showBetting();
                }
            },
            'slots-primary'
        );

        const exitButton = this.createButton(
            'SALIR',
            () => this.onExit()
        );

        panel.append(
            this.createTitle(),
            this.createJackpot(),
            reels,
            message,
            lineDetails,
            details,
            nextButton,
            exitButton
        );

        if (result.scatterHit && result.winAmount > 0) {
            const bonusMessage = document.createElement('p');

            bonusMessage.className = 'slots-bonus';
            bonusMessage.textContent =
                `¡BONUS SCATTER! +${result.freeSpinsAwarded} TIRADAS GRATIS`;

            panel.appendChild(bonusMessage);
        }

        this.container.appendChild(panel);
    }

    startReels() {
        if (!this.container || this.reelsStarted) return;

        this.reelsStarted = true;
        this.reelsStopping = false;

        const symbols = [
            '🍒',
            '🍋',
            '🍇',
            '🔔',
            '💎',
            '7️⃣',
            '⭐',
            '🎰',
            '👑'
        ];

        // Cada rodillo cambia sus tres símbolos a la vez.
        this.reelElements.forEach((column, columnIndex) => {
            this.reelIntervals[columnIndex] = setInterval(() => {
                column.forEach(cell => {
                    cell.textContent = symbols[
                        Math.floor(Math.random() * symbols.length)
                    ];

                    cell.classList.remove('slots-winning');
                });
            }, 65 + columnIndex * 12);
        });

        if (this.spinButton) {
            this.spinButton.disabled = false;
            this.spinButton.textContent = 'PARAR';
        }
    }

    stopReels(finalReels, onComplete) {
        if (!this.reelsStarted || this.reelsStopping) return;

        this.reelsStopping = true;

        if (this.spinButton) {
            this.spinButton.disabled = true;
            this.spinButton.textContent = 'DETENIENDO...';
        }

        let stoppedCount = 0;

        finalReels.forEach((finalColumn, columnIndex) => {
            const interval = this.reelIntervals[columnIndex];

            if (interval) {
                clearInterval(interval);
                this.reelIntervals[columnIndex] = null;
            }

            let delay = 55;

            const slowDown = () => {
                const column = this.reelElements[columnIndex];

                if (!column) return;

                if (delay >= 270) {
                    // Fijar los tres símbolos definitivos del rodillo.
                    finalColumn.forEach((symbol, rowIndex) => {
                        const cell = column[rowIndex];

                        cell.textContent = symbol.emoji;
                        cell.classList.add('slots-reel-stopped');
                    });

                    stoppedCount++;

                    if (stoppedCount === finalReels.length) {
                        this.reelsStarted = false;
                        this.reelsStopping = false;

                        if (onComplete) onComplete();
                    }

                    return;
                }

                const symbols = [
                    '🍒',
                    '🍋',
                    '🍇',
                    '🔔',
                    '💎',
                    '7️⃣',
                    '⭐',
                    '🎰',
                    '👑'
                ];

                column.forEach(cell => {
                    cell.textContent = symbols[
                        Math.floor(Math.random() * symbols.length)
                    ];
                });

                const timeout = setTimeout(slowDown, delay);

                this.reelTimeouts.push(timeout);

                delay *= 1.32;
            };

            // El segundo y tercer rodillo empiezan después.
            const initialTimeout = setTimeout(
                slowDown,
                columnIndex * 450
            );

            this.reelTimeouts.push(initialTimeout);
        });
    }

    clearReelAnimations() {
        this.reelIntervals.forEach(interval => {
            if (interval) clearInterval(interval);
        });

        this.reelTimeouts.forEach(timeout => {
            clearTimeout(timeout);
        });

        this.reelIntervals = [];
        this.reelTimeouts = [];

        this.reelsStarted = false;
        this.reelsStopping = false;
    }

    hide() {
        this.clearReelAnimations();

        if (!this.container) return;

        this.container.remove();
        this.container = null;

        this.isSpinning = false;
        this.reelElements = [];
        this.spinButton = null;
    }
}
