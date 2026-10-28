
import { NPCDialogue } from './NPCDialogue.js';

export class NPCManager {
    constructor({ renderer, splitScreen, players, playerSettings }) {
        this.renderer = renderer;
        this.splitScreen = splitScreen;
        this.players = players;
        this.playerSettings = playerSettings;

        this.npcs = [];
        this.sessions = {
            1: null,
            2: null
        };

        this.prompts = {
            1: this.createOverlay(1),
            2: this.createOverlay(2)
        };
    }

    createOverlay(playerNumber) {
        const container = document.createElement('div');
        const isSolo = this.splitScreen.renderSolo;

        Object.assign(container.style, {
            position: 'fixed',
            bottom: '0',
            left: isSolo ? '0' : (playerNumber === 1 ? '0' : '50%'),
            width: isSolo ? '100%' : '50%',
            boxSizing: 'border-box',
            padding: '18px 22px',
            zIndex: '1000',
            color: '#fff',
            background: 'linear-gradient(transparent, rgba(0,0,0,.94))',
            fontFamily: 'Arial, sans-serif',
            pointerEvents: 'none',
            display: 'none'
        });

        container.innerHTML = `
            <div class="npc-dialogue-speaker"
                style="font-weight:900;color:#ffd166;margin-bottom:8px"></div>
            <div class="npc-dialogue-text"
                style="font-size:16px;line-height:1.45"></div>
            <div class="npc-dialogue-hint"
                style="font-size:11px;color:#ccc;margin-top:12px"></div>
        `;

        document.body.appendChild(container);

        return {
            container,
            speaker: container.querySelector('.npc-dialogue-speaker'),
            text: container.querySelector('.npc-dialogue-text'),
            hint: container.querySelector('.npc-dialogue-hint')
        };
    }

    addNPC(npc) {
        this.npcs.push(npc);
    }

    async load() {
        await Promise.all(
            this.npcs.map((npc) => npc.load(this.splitScreen.scene))
        );
    }

    findNearestNPC(player) {
        let nearest = null;
        let shortestDistance = Infinity;

        for (const npc of this.npcs) {
            if (!npc.canInteract(player)) continue;

            const distance = npc.distanceTo(player);

            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearest = npc;
            }
        }

        return nearest;
    }

    async startDialogue(playerNumber, npc) {
        if (this.sessions[playerNumber]) return;

        const player = this.players[playerNumber - 1];
        const settings = this.playerSettings[playerNumber - 1];

        player.setMovementEnabled(false);
        player.clearActions();

        const view = new NPCDialogue({
            playerNumber,
            isSolo: this.splitScreen.renderSolo,
            playerName: settings.name,
            playerModelPath: settings.secretSkin || (
                playerNumber === 1
                    ? '/models/Personajes/Rojo.glb'
                    : '/models/Personajes/Negro.glb'
            ),
            npc
        });

        const session = {
            npc,
            view,
            lineIndex: 0,
            typing: false,
            characterIndex: 0,
            timer: null
        };

        this.sessions[playerNumber] = session;
        this.splitScreen.setDialogueView(playerNumber, view);

        const overlay = this.prompts[playerNumber];
        overlay.container.style.display = 'block';

        try {
            await view.load();

            // La sesión podría haberse cerrado mientras cargaban los modelos.
            if (this.sessions[playerNumber] !== session) {
                view.dispose();
                return;
            }

            this.showLine(playerNumber);
        } catch (error) {
            console.error('No se pudo cargar el diálogo:', error);
            this.endDialogue(playerNumber);
        }
    }

    showLine(playerNumber) {
        const session = this.sessions[playerNumber];
        if (!session) return;

        const lines = session.npc.dialogues;
        const line = lines[session.lineIndex];

        if (!line) {
            this.endDialogue(playerNumber);
            return;
        }

        const overlay = this.prompts[playerNumber];

        overlay.speaker.textContent = line.speaker || session.npc.name;
        overlay.text.textContent = '';
        overlay.hint.textContent =
            playerNumber === 1
                ? 'E: CONTINUAR   ·   Q: SALIR'
                : 'I: CONTINUAR   ·   O: SALIR';

        session.typing = true;
        session.characterIndex = 0;
        session.fullText = line.text;

        clearInterval(session.timer);

        session.timer = setInterval(() => {
            if (this.sessions[playerNumber] !== session) {
                clearInterval(session.timer);
                return;
            }

            session.characterIndex++;
            overlay.text.textContent =
                session.fullText.slice(0, session.characterIndex);

            if (session.characterIndex >= session.fullText.length) {
                clearInterval(session.timer);
                session.typing = false;
            }
        }, 24);
    }

    advanceDialogue(playerNumber) {
        const session = this.sessions[playerNumber];
        if (!session) return;

        if (session.typing) {
            clearInterval(session.timer);
            this.prompts[playerNumber].text.textContent = session.fullText;
            session.typing = false;
            return;
        }

        session.lineIndex++;
        this.showLine(playerNumber);
    }

    endDialogue(playerNumber) {
        const session = this.sessions[playerNumber];
        const player = this.players[playerNumber - 1];

        if (session) {
            clearInterval(session.timer);
            session.view.dispose();
        }

        this.sessions[playerNumber] = null;
        this.splitScreen.clearDialogueView(playerNumber);

        const overlay = this.prompts[playerNumber];
        overlay.container.style.display = 'none';
        overlay.speaker.textContent = '';
        overlay.text.textContent = '';
        overlay.hint.textContent = '';

        player.clearActions();
        player.setMovementEnabled(true);
    }

    update() {
        const activePlayers = this.splitScreen.renderSolo ? [1] : [1, 2];

        for (const playerNumber of activePlayers) {
            const player = this.players[playerNumber - 1];
            const session = this.sessions[playerNumber];
            const overlay = this.prompts[playerNumber];

            if (session) {
                if (player.consumeAction('cancel')) {
                    this.endDialogue(playerNumber);
                    continue;
                }

                if (player.consumeAction('confirm')) {
                    this.advanceDialogue(playerNumber);
                }

                continue;
            }

            const npc = this.findNearestNPC(player);

            if (npc) {
                overlay.container.style.display = 'block';
                overlay.speaker.textContent = npc.name;
                overlay.text.textContent = 'Pulsa para hablar.';
                overlay.hint.textContent =
                    playerNumber === 1
                        ? 'E: HABLAR'
                        : 'I: HABLAR';

                if (player.consumeAction('confirm')) {
                    this.startDialogue(playerNumber, npc);
                }
            } else {
                player.clearActions();
                overlay.container.style.display = 'none';
            }
        }
    }

    dispose() {
        this.endDialogue(1);
        this.endDialogue(2);

        for (const overlay of Object.values(this.prompts)) {
            overlay.container.remove();
        }
    }
}
