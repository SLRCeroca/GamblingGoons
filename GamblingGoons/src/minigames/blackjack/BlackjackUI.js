
export class BlackjackUI {
    constructor({
        playerNumber,
        getMoney,
        onStart,
        onHit,
        onStand,
        onExit,
        isSolo = false
    }) {
        this.playerNumber = playerNumber;
        this.getMoney = getMoney;

        this.onStart = onStart;
        this.onHit = onHit;
        this.onStand = onStand;
        this.onExit = onExit;

        this.isSolo = isSolo;

        this.selectedBet = 50;
        this.container = null;
    }

    create() {
        if (this.container) return;

        this.container = document.createElement('div');

        this.container.className = this.isSolo
            ? 'blackjack-ui blackjack-ui-solo'
            : 'blackjack-ui blackjack-ui-split';

        const left = this.isSolo
            ? '50%'
            : this.playerNumber === 1
                ? '25%'
                : '75%';

        Object.assign(this.container.style, {
            position: 'fixed',
            display: 'block',
            left,
            bottom: '8px',
            top: 'auto',
            right: 'auto',
            transform: 'translateX(-50%)',
            width: this.isSolo ? '480px' : '440px',
            maxWidth: 'calc(50vw - 32px)',
            height: 'auto',
            minHeight: '0',
            boxSizing: 'border-box',
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
        button.className = `blackjack-button ${className}`;
        button.addEventListener('click', callback);

        return button;
    }

    createDisclaimer() {
        const container = document.createElement('div');

        const values = document.createElement('p');
        values.className = 'blackjack-card-values';
        values.textContent = 'VALORES: AS = 11 | 2-10 = SU VALOR | J-Q-K = 10';

        const disclaimer = document.createElement('p');
        disclaimer.className = 'blackjack-disclaimer';
        disclaimer.textContent =
            'AVISO: si abandonas una mano antes de terminarla, pierdes tu apuesta.';

        container.appendChild(values);
        container.appendChild(disclaimer);

        return container;
    }

    showBetting() {
        this.create();
        this.container.replaceChildren();

        this.selectedBet = 50;

        const panel = document.createElement('div');
        panel.className = 'blackjack-panel';

        const title = document.createElement('h2');
        title.textContent = 'BLACKJACK';

        const money = document.createElement('p');
        money.className = 'blackjack-money';
        money.textContent = `CARTERA: ${this.getMoney()}$`;

        const subtitle = document.createElement('p');
        subtitle.className = 'blackjack-subtitle';
        subtitle.textContent = 'ELIGE TU APUESTA';

        // Apuestas predeterminadas.
        const betOptions = document.createElement('div');
        betOptions.className = 'blackjack-bets';

        const presetButtons = [];

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

            presetButtons.push(button);
            betOptions.appendChild(button);
        });

        // Apuesta personalizada.
        const customBetContainer = document.createElement('div');
        customBetContainer.className = 'blackjack-custom-bet';

        const customBetLabel = document.createElement('label');
        customBetLabel.textContent = 'O APUESTA OTRA CANTIDAD';
        customBetLabel.htmlFor = 'blackjack-custom-bet-input';

        const customBetInput = document.createElement('input');
        customBetInput.id = 'blackjack-custom-bet-input';
        customBetInput.type = 'number';
        customBetInput.min = '1';
        customBetInput.step = '1';
        customBetInput.max = String(this.getMoney());
        customBetInput.placeholder = 'Introduce tu apuesta...';

        customBetInput.addEventListener('input', () => {
            const amount = Number(customBetInput.value);

            presetButtons.forEach(btn =>
                btn.classList.remove('selected')
            );

            if (
                customBetInput.value.trim() !== '' &&
                Number.isInteger(amount) &&
                amount > 0 &&
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

        // Botones de acción.
        const startButton = this.createButton(
            'REPARTIR',
            () => {
                const amount = this.selectedBet;

                if (
                    !Number.isInteger(amount) ||
                    amount <= 0 ||
                    amount > this.getMoney()
                ) {
                    return;
                }

                this.onStart(amount);
            },
            'blackjack-primary'
        );

        const exitButton = this.createButton(
            'SALIR',
            () => this.onExit()
        );

        const updateStartButton = () => {
            const validBet =
                Number.isInteger(this.selectedBet) &&
                this.selectedBet > 0 &&
                this.selectedBet <= this.getMoney();

            startButton.disabled = !validBet;
            startButton.classList.toggle(
                'blackjack-disabled',
                !validBet
            );
        };

        updateStartButton();

        const disclaimer = this.createDisclaimer();

        panel.append(
            title,
            money,
            subtitle,
            betOptions,
            customBetContainer,
            startButton,
            exitButton,
            disclaimer
        );

        this.container.appendChild(panel);
    }

    showGame({
        playerScore,
        dealerScore,
        hiddenDealerCard = false
    }) {
        this.create();
        this.container.replaceChildren();

        const panel = document.createElement('div');
        panel.className = 'blackjack-panel';

        const title = document.createElement('h2');
        title.textContent = 'BLACKJACK';

        const scores = document.createElement('div');
        scores.className = 'blackjack-scores';

        const player = document.createElement('p');
        player.textContent = `TÚ: ${playerScore}`;

        const dealer = document.createElement('p');
        dealer.textContent = `BANCA: ${dealerScore}`;

        scores.append(player, dealer);

        const actions = document.createElement('div');
        actions.className = 'blackjack-actions';

        const hitButton = this.createButton(
            'PEDIR CARTA',
            () => this.onHit(),
            'blackjack-primary'
        );

        const standButton = this.createButton(
            'PLANTARSE',
            () => this.onStand()
        );

        actions.append(hitButton, standButton);

        panel.append(
            title,
            scores,
            actions,
            this.createDisclaimer()
        );

        this.container.appendChild(panel);
    }

    showResult({
        message,
        playerScore,
        dealerScore
    }) {
        this.create();
        this.container.replaceChildren();

        const panel = document.createElement('div');
        panel.className = 'blackjack-panel';

        const title = document.createElement('h2');
        title.textContent = message;

        const scores = document.createElement('p');
        scores.textContent =
            `TÚ: ${playerScore} | BANCA: ${dealerScore}`;

        const exitButton = this.createButton(
            'CONTINUAR',
            () => this.onExit(),
            'blackjack-primary'
        );

        panel.append(title, scores, exitButton);
        this.container.appendChild(panel);
    }

    hide() {
        if (!this.container) return;

        this.container.remove();
        this.container = null;
    }
}
