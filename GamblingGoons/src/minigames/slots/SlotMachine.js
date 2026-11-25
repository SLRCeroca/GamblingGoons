
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SlotsGame } from './SlotsGame.js';
import { SlotsUI } from './SlotsUI.js';
import { SlotMachineEffects } from './SlotMachineEffects.js';

export class SlotMachine {
    constructor({
        scene,
        players,
        splitScreen,
        npcManager,
        gameState,

        position = new THREE.Vector3(0, -0.5, 4),
        rotation = 0,
        scale = 0.05,

        interactionWidth = 1.5,
        interactionDepth = 1.2,
        interactionGap = 0.15,
        interactionFront = new THREE.Vector3(0, 0, 1),

        cameraFov = 35,
        cameraDistance = 1.7,
        cameraHeightOffset = 0.15,
        cameraHorizontalOffset = 0,
        cameraVerticalOffset = 0,
        transitionSpeed = 4,

        debugHitbox = true
    }) {
        this.scene = scene;
        this.players = players;
        this.splitScreen = splitScreen;
        this.npcManager = npcManager;
        this.gameState = gameState;

        this.slotsGame = new SlotsGame({
            getMoney: () => this.gameState.money,
            setMoney: amount => this.gameState.setMoney(amount)
        });

        this.slotsUI = null;

        this.position = position.clone();
        this.rotation = rotation;
        this.scale = scale;

        this.interactionWidth = interactionWidth;
        this.interactionDepth = interactionDepth;
        this.interactionGap = interactionGap;

        this.effects = null;
        this.spinPhase = 'idle';
        this.pendingSpinResult = null;

        this.interactionFront = interactionFront.clone()
            .normalize()
            .applyAxisAngle(
                new THREE.Vector3(0, 1, 0),
                rotation
            );

        this.interactionRight = new THREE.Vector3(
            this.interactionFront.z,
            0,
            -this.interactionFront.x
        ).normalize();

        this.interactionPosition = new THREE.Vector3();

        this.machine = null;
        this.machineCollider = null;
        this.hitboxHelper = null;

        this.debugHitbox = debugHitbox;

        this.activePlayer = null;
        this.state = 'idle';

        // Cámara y transición.
        this.camera = null;
        this.cameraFov = cameraFov;
        this.cameraDistance = cameraDistance;
        this.cameraHeightOffset = cameraHeightOffset;
        this.cameraHorizontalOffset = cameraHorizontalOffset;
        this.cameraVerticalOffset = cameraVerticalOffset;
        this.transitionSpeed = transitionSpeed;

        this.startPosition = new THREE.Vector3();
        this.startQuaternion = new THREE.Quaternion();

        this.targetPosition = new THREE.Vector3();
        this.targetQuaternion = new THREE.Quaternion();
    }

    async load() {
        const loader = new GLTFLoader();

        const gltf = await loader.loadAsync(
            '/models/Juegos/slots/Tragaperrasverde.glb'
        );

        this.machine = gltf.scene;

        this.machine.scale.setScalar(this.scale);
        this.machine.position.copy(this.position);
        this.machine.rotation.y = this.rotation;

        // Ocultar la pantalla independientemente del color.
        const screenNames = [
            'pantallaVerde',
            'pantallaRoja',
            'pantallaAzul',
            'pantallaAmarilla'
        ];

        for (const name of screenNames) {
            const screen = this.machine.getObjectByName(name);

            if (screen) {
                screen.visible = false;
                console.log(`[SLOT] Pantalla oculta: ${name}`);
            }
        }

        this.machine.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        this.scene.add(this.machine);

        this.machine.updateMatrixWorld(true);

        const animatedParts = [
            'bolaPalancaVerde',
            'manillaVerde',
            'botonVerde'
        ];

        for (const name of animatedParts) {
            const object = this.machine.getObjectByName(name);

            if (!object) {
                console.warn(`[SLOT DATA] No encontrado: ${name}`);
                continue;
            }

            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const worldPosition = object.getWorldPosition(new THREE.Vector3());
            const worldQuaternion = object.getWorldQuaternion(new THREE.Quaternion());

            console.log('[SLOT PIVOT]', JSON.stringify({
                name: object.name,
                parent: object.parent?.name,
                worldPosition: worldPosition.toArray(),
                geometryCenter: center.toArray(),
                dimensions: size.toArray(),
                worldRotation: [
                    worldQuaternion.x,
                    worldQuaternion.y,
                    worldQuaternion.z,
                    worldQuaternion.w
                ]
            }));
        }

        const box = new THREE.Box3().setFromObject(this.machine);

        // Apoyar la máquina sobre el suelo.
        this.machine.position.y -= box.min.y;

        this.machine.updateMatrixWorld(true);
        box.setFromObject(this.machine);

        const size = new THREE.Vector3();
        const center = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        // Collider físico.
        this.machineCollider = {
            minX: box.min.x,
            maxX: box.max.x,
            minZ: box.min.z,
            maxZ: box.max.z
        };

        for (const player of this.players) {
            player.addStaticCollider(this.machineCollider);
        }

        // Zona de interacción delante de la máquina.
        const halfFront =
            Math.abs(this.interactionFront.x) * size.x / 2 +
            Math.abs(this.interactionFront.z) * size.z / 2;

        this.interactionPosition.copy(center);

        this.interactionPosition.addScaledVector(
            this.interactionFront,
            halfFront +
            this.interactionGap +
            this.interactionDepth / 2
        );

        this.interactionPosition.y = 0;

        // Hitbox visual.
        if (this.debugHitbox) {
            const geometry = new THREE.BoxGeometry(
                this.interactionWidth,
                0.035,
                this.interactionDepth
            );

            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.35,
                depthWrite: false
            });

            this.hitboxHelper = new THREE.Mesh(
                geometry,
                material
            );

            this.hitboxHelper.position.copy(
                this.interactionPosition
            );

            this.hitboxHelper.position.y = 0.035;

            this.hitboxHelper.rotation.y = Math.atan2(
                this.interactionFront.x,
                this.interactionFront.z
            );

            this.scene.add(this.hitboxHelper);
        }

        console.log('Tragaperras cargada.');
        console.log('Dimensiones:', size);
        console.log('Posición:', this.position);
        console.log('Zona de interacción:', this.interactionPosition);

        this.effects = new SlotMachineEffects(this.machine, 'Verde');
        this.effects.setScreenOn(false);
    }

    isPlayerNear(player) {
        const playerPosition = player.getPosition();

        const difference = new THREE.Vector3().subVectors(
            playerPosition,
            this.interactionPosition
        );

        difference.y = 0;

        const horizontal = difference.dot(this.interactionRight);
        const depth = difference.dot(this.interactionFront);

        return (
            Math.abs(horizontal) <= this.interactionWidth / 2 &&
            Math.abs(depth) <= this.interactionDepth / 2
        );
    }

    showInteractionPrompt(playerNumber) {
        const key = playerNumber === 1 ? 'E' : 'I';

        this.npcManager.setExternalPrompt(
            playerNumber,
            {
                speaker: 'TRAGAPERRAS',
                text: '¿Quieres probar suerte?',
                hint: `${key}: JUGAR`
            },
            'slots'
        );
    }

    hideInteractionPrompt(playerNumber) {
        this.npcManager.clearExternalPrompt(
            playerNumber,
            'slots'
        );
    }

    checkInteraction() {
        const activePlayers = this.splitScreen.renderSolo
            ? [1]
            : [1, 2];

        if (this.activePlayer !== null) return;

        for (const playerNumber of activePlayers) {
            const player = this.players[playerNumber - 1];

            if (!player.model) continue;

            // Los NPC tienen prioridad.
            if (this.npcManager.findNearestNPC(player)) {
                this.hideInteractionPrompt(playerNumber);
                continue;
            }

            if (!this.isPlayerNear(player)) {
                this.hideInteractionPrompt(playerNumber);
                continue;
            }

            this.showInteractionPrompt(playerNumber);

            if (player.consumeAction('confirm')) {
                this.hideInteractionPrompt(playerNumber);
                this.enter(playerNumber);
                return;
            }
        }
    }

    enter(playerNumber) {
        if (this.state !== 'idle') return;
        if (this.activePlayer !== null) return;

        this.activePlayer = playerNumber;

        this.hideInteractionPrompt(1);
        this.hideInteractionPrompt(2);

        const player = this.players[playerNumber - 1];
        const defaultCamera = player.camera;

        if (!defaultCamera) {
            console.error('El jugador no tiene una cámara asignada.');
            this.activePlayer = null;
            return;
        }

        player.setMovementEnabled(false);

        // Ocultar al jugador activo únicamente en la cámara de la tragaperras.
        player.model.traverse(object => {
            object.layers.set(1);
        });

        player.clearActions();

        // Crear cámara independiente para este minijuego.
        this.camera = new THREE.PerspectiveCamera(
            this.cameraFov,
            defaultCamera.aspect,
            0.1,
            1000
        );

        this.camera.position.copy(defaultCamera.position);
        this.camera.quaternion.copy(defaultCamera.quaternion);

        // Guardar la posición y orientación originales.
        this.startPosition.copy(defaultCamera.position);
        this.startQuaternion.copy(defaultCamera.quaternion);

        // Calcular el centro y las dimensiones reales de la máquina.
        const box = new THREE.Box3().setFromObject(this.machine);

        const size = new THREE.Vector3();
        const center = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        // Calcular el punto al que queremos mirar.
        const lookTarget = center.clone();

        lookTarget.y += this.cameraHeightOffset + 0.35;

        lookTarget.addScaledVector(
            this.interactionRight,
            this.cameraHorizontalOffset - 0.07
        );

        // Calcular la posición de la cámara delante de la máquina.
        this.targetPosition.copy(lookTarget);

        this.targetPosition.addScaledVector(
            this.interactionFront,
            this.cameraDistance
        );

        this.targetPosition.y += this.cameraVerticalOffset;

        // Orientar la cámara hacia el punto de enfoque.
        this.camera.position.copy(this.targetPosition);
        this.camera.lookAt(lookTarget);

        this.targetQuaternion.copy(this.camera.quaternion);

        // Restaurar la cámara al punto inicial para animar desde ahí.
        this.camera.position.copy(this.startPosition);
        this.camera.quaternion.copy(this.startQuaternion);

        this.splitScreen.setCameraOverride(
            playerNumber,
            this.camera
        );

        this.effects?.setScreenOn(true);
        this.state = 'entering';

        console.log(
            `Jugador ${playerNumber} entrando en la tragaperras.`
        );
    }

    requestExit() {
        if (this.state !== 'playing') return;

        // No abandonar una tirada que todavía está en curso.
        if (this.spinPhase !== 'idle') return;

        this.slotsUI?.hide();
        this.slotsUI = null;

        this.effects?.setScreenOn(false);

        this.state = 'exiting';
    }

    animateCamera(deltaTime, entering) {
        const player = this.players[this.activePlayer - 1];

        const destinationPosition = entering
            ? this.targetPosition
            : this.startPosition;

        const destinationQuaternion = entering
            ? this.targetQuaternion
            : this.startQuaternion;

        const alpha = 1 - Math.exp(
            -this.transitionSpeed * deltaTime
        );

        this.camera.position.lerp(
            destinationPosition,
            alpha
        );

        this.camera.quaternion.slerp(
            destinationQuaternion,
            alpha
        );

        if (
            this.camera.position.distanceTo(destinationPosition) < 0.025 &&
            this.camera.quaternion.angleTo(destinationQuaternion) < 0.01
        ) {
            this.camera.position.copy(destinationPosition);
            this.camera.quaternion.copy(destinationQuaternion);

            if (entering) {
                this.state = 'playing';

                console.log(
                    'Cámara de tragaperras preparada.'
                );

                this.createSlotsUI();
            } else {
                console.log(
                    'Transición de salida completada.'
                );

                this.slotsUI?.hide();
                this.slotsUI = null;

                this.splitScreen.setCameraOverride(
                    this.activePlayer,
                    null
                );

                player.setMovementEnabled(true);
                player.clearActions();

                // Restaurar el modelo a la capa normal.
                player.model.traverse(object => {
                    object.layers.set(0);
                });

                this.camera = null;
                this.activePlayer = null;
                this.state = 'idle';

                console.log('Tragaperras liberada.');
            }
        }
    }

    checkExit() {
        if (this.activePlayer === null) return;

        const player = this.players[this.activePlayer - 1];

        if (player.consumeAction('cancel')) {
            this.requestExit();
        }
    }

    update(deltaTime) {
        if (!this.machine) return;

        // Actualizar las animaciones físicas.
        const animationFinished = this.effects?.update(deltaTime);

        // Cuando termina la palanca, empiezan los rodillos.
        if (
            animationFinished &&
            this.spinPhase === 'lever'
        ) {
            this.spinPhase = 'spinning';
            this.slotsUI?.startReels();
        }

        if (this.state === 'idle') {
            this.checkInteraction();
        }

        if (this.state === 'entering') {
            this.animateCamera(deltaTime, true);
        }

        if (this.state === 'playing') {
            this.checkExit();
        }

        if (this.state === 'exiting') {
            this.animateCamera(deltaTime, false);
        }
    }

    createSlotsUI() {
        this.slotsUI = new SlotsUI({
            playerNumber: this.activePlayer,
            getMoney: () => this.gameState.money,
            getJackpot: () => this.slotsGame.jackpot,
            getFreeSpins: () => this.slotsGame.freeSpins,
            onSpin: bet => this.spin(bet),
            onStopSpin: () => this.stopSpin(),
            onExit: () => this.requestExit(),
            isSolo: this.splitScreen.renderSolo
        });

        // Si el jugador sale durante un bonus,
        // podrá continuar sus tiradas gratis al regresar.
        if (this.slotsGame.freeSpins > 0) {
            this.slotsUI.showGame();
        } else {
            this.slotsUI.showBetting();
        }
    }

    spin(bet = null) {
        if (this.state !== 'playing') return;
        if (!this.slotsGame || !this.slotsUI) return;
        if (this.spinPhase !== 'idle') return;

        try {
            // Reservar el resultado y descontar la apuesta.
            this.pendingSpinResult = this.slotsGame.beginSpin(bet);

            // Mostrar la pantalla de rodillos.
            this.slotsUI.showGame();

            this.spinPhase = 'lever';

            // Activar la palanca física.
            this.effects?.startLever();

            // Si no se encuentra la palanca, no bloquear el juego.
            if (!this.effects?.isAnimating()) {
                this.spinPhase = 'spinning';
                this.slotsUI.startReels();
            }

            console.log('Tirada iniciada:', this.pendingSpinResult);

        } catch (error) {
            console.error('Error al iniciar la tirada:', error);

            this.pendingSpinResult = null;
            this.spinPhase = 'idle';

            if (this.slotsGame.pendingSpin) {
                console.error(
                    'Hay una tirada pendiente. No se ha reiniciado automáticamente.'
                );
            } else if (this.slotsGame.freeSpins > 0) {
                this.slotsUI.showGame();
            } else {
                this.slotsUI.showBetting();
            }
        }
    }

    stopSpin() {
        if (this.state !== 'playing') return;
        if (this.spinPhase !== 'spinning') return;
        if (!this.pendingSpinResult) return;

        this.spinPhase = 'stopping';

        // Hundir el botón físico.
        this.effects?.pressButton();

        // Enviar los tres símbolos de cada uno de los tres rodillos.
        this.slotsUI.stopReels(
            this.pendingSpinResult.reels,
            () => this.finishSpin()
        );
    }

    finishSpin() {
        if (this.spinPhase !== 'stopping') return;

        try {
            const result = this.slotsGame.finishSpin();

            this.pendingSpinResult = null;
            this.spinPhase = 'idle';

            this.slotsUI.showResult(result);

            console.log('Resultado de Slots:', result);

        } catch (error) {
            console.error('Error al finalizar la tirada:', error);
        }
    }
}
