import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BlackjackGame } from './BlackjackGame.js';
import { BlackjackUI } from './BlackjackUI.js';

export class Blackjack {
    constructor({
        scene,
        splitScreen,
        players,
        npcManager,
        gameState,

        position = new THREE.Vector3(4, -0.5, 0),
        rotation = 0,
        scale = 0.03,

        interactionWidth = 1.5,
        interactionDepth = 1.2,
        interactionGap = 0.15,
        interactionSide = 1,
        interactionFront = new THREE.Vector3(1, 0, 0),

        cameraFov = 35,
        cameraHeightMultiplier = 1,

        debugHitbox = true
    }) {
        this.scene = scene;
        this.splitScreen = splitScreen;
        this.players = players;
        this.npcManager = npcManager;
        this.gameState = gameState;
        this.game = null;
        this.ui = null;


        this.table = null;

        this.tablePosition = position.clone();
        this.tableRotation = rotation;
        this.tableScale = scale;

        this.interactionWidth = interactionWidth;
        this.interactionDepth = interactionDepth;
        this.interactionGap = interactionGap;
        this.interactionSide = interactionSide;

        this.interactionPosition = new THREE.Vector3();

        this.interactionFront = interactionFront.clone().normalize()
            .multiplyScalar(interactionSide);

        this.interactionRight = new THREE.Vector3(
            this.interactionFront.z,
            0,
            -this.interactionFront.x
        ).normalize();

        this.interactionRadius = 0.9;

        this.hitboxHelper = null;
        this.debugHitbox = debugHitbox;

        this.activePlayer = null;
        this.camera = null;

        this.state = 'idle';
        this.transitionSpeed = 4;

        this.cameraFov = cameraFov;
        this.cameraHeightMultiplier = cameraHeightMultiplier;

        this.startPosition = new THREE.Vector3();
        this.startQuaternion = new THREE.Quaternion();

        this.targetPosition = new THREE.Vector3();
        this.targetQuaternion = new THREE.Quaternion();

    }

    async load() {
        const loader = new GLTFLoader();

        const gltf = await loader.loadAsync(
            '/models/Juegos/blackjack/mesaBLACKJACK.glb'
        );

        this.table = gltf.scene;

        this.table.scale.setScalar(this.tableScale);
        this.table.position.copy(this.tablePosition);
        this.table.rotation.y = this.tableRotation;

        this.table.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        this.scene.add(this.table);

        this.table.updateMatrixWorld(true);

        // Obtener las dimensiones reales del modelo.
        const box = new THREE.Box3().setFromObject(this.table);

        const size = new THREE.Vector3();
        const center = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        // Registrar la colisión física de la mesa.
        this.tableCollider = {
            minX: box.min.x,
            maxX: box.max.x,
            minZ: box.min.z,
            maxZ: box.max.z
        };

        for (const player of this.players) {
            player.addStaticCollider(this.tableCollider);
        }

        // Obtener los ejes reales de la mesa después de rotarla.
        // Normalizar la dirección frontal.
        this.interactionFront.normalize();

        // Calcular el eje lateral perpendicular.
        this.interactionRight.set(
            this.interactionFront.z,
            0,
            -this.interactionFront.x
        ).normalize();

        // Proyección de las dimensiones de la caja sobre el frente.
        const halfFront =
            Math.abs(this.interactionFront.x) * size.x / 2 +
            Math.abs(this.interactionFront.z) * size.z / 2;

        // Colocar la zona delante de la mesa.
        this.interactionPosition.copy(center);

        this.interactionPosition.addScaledVector(
            this.interactionFront,
            halfFront + this.interactionGap +
            this.interactionDepth / 2
        );

        this.interactionPosition.y = 0;

        // Crear hitbox visible para depuración.
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
            // Orientar el rectángulo hacia el mismo frente que la mesa.
            this.hitboxHelper.rotation.y = Math.atan2(
                this.interactionFront.x,
                this.interactionFront.z
            );

            this.scene.add(this.hitboxHelper);
        }

        console.log('Mesa de Blackjack cargada.');
        console.log('Dimensiones:', size);
        console.log('Posición de interacción:', this.interactionPosition);
        console.log('Rotación:', this.tableRotation);
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

    getTableSurfaceY(position) {
        const raycaster = new THREE.Raycaster();

        const box = new THREE.Box3().setFromObject(this.table);

        // Lanzar un rayo vertical hacia abajo.
        const origin = new THREE.Vector3(
            position.x,
            box.max.y + 5,
            position.z
        );

        raycaster.set(
            origin,
            new THREE.Vector3(0, -1, 0)
        );

        const intersections = raycaster.intersectObject(
            this.table,
            true
        );

        if (intersections.length === 0) {
            console.warn('No se encontró la superficie de la mesa.');
            return box.max.y;
        }

        return intersections[0].point.y;
    }

    createBlackjackGame() {
        const center = new THREE.Box3()
            .setFromObject(this.table)
            .getCenter(new THREE.Vector3());

        const box = new THREE.Box3().setFromObject(this.table);
        const tableTop = box.max.y;

        // Posiciones provisionales de las cartas sobre la mesa.
        const dealerPosition = center.clone();
        dealerPosition.y = tableTop - 0.03;

        const playerPosition = center.clone();
        playerPosition.y = tableTop - 0.03;

        // Separa las manos en profundidad.
        dealerPosition.addScaledVector(this.interactionFront, -0.20);
        playerPosition.addScaledVector(this.interactionFront, 0.20);
        dealerPosition.y = this.getTableSurfaceY(dealerPosition) + 0.001;
        playerPosition.y = this.getTableSurfaceY(playerPosition) + 0.001;

        this.ui = new BlackjackUI({
            playerNumber: this.activePlayer,

            getMoney: () => this.gameState.money,

            onStart: (bet) => {
                this.game.startGame(bet);
            },

            onHit: () => {
                this.game.hit();
            },

            onStand: () => {
                this.game.stand();
            },

            onExit: () => {
                this.requestExit();
            },

            isSolo: this.splitScreen.renderSolo
        });

        this.game = new BlackjackGame({
            scene: this.scene,
            gameState: this.gameState,
            player: this.players[this.activePlayer - 1],
            ui: this.ui,
            dealerPosition,
            playerPosition
        });

        this.ui.showBetting();
        console.log('Interfaz de apuestas mostrada');
    }

    requestExit() {
        if (this.state !== 'playing') return;

        this.state = 'exiting';
    }

    update(deltaTime) {
        if (!this.table) return;

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

    showInteractionPrompt(playerNumber) {
        const key = playerNumber === 1 ? 'E' : 'I';

        this.npcManager.setExternalPrompt(playerNumber, {
            speaker: 'BLACKJACK',
            text: '¿Te apetece probar suerte?',
            hint: `${key}: JUGAR`
        });
    }

    hideInteractionPrompt(playerNumber) {
        if (playerNumber !== undefined) {
            this.npcManager.clearExternalPrompt(playerNumber);
            return;
        }

        this.npcManager.clearExternalPrompt(1);
        this.npcManager.clearExternalPrompt(2);
    }

    checkInteraction() {
        const activePlayers = this.splitScreen.renderSolo
            ? [1]
            : [1, 2];

        for (const playerNumber of activePlayers) {
            const player = this.players[playerNumber - 1];

            if (!player.model) continue;

            // Si hay un NPC cerca, dejamos que NPCManager gestione la interacción.
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

        this.activePlayer = playerNumber;

        const player = this.players[playerNumber - 1];
        const defaultCamera = player.camera;

        if (!defaultCamera) {
            console.error('El jugador no tiene una cámara asignada.');
            this.activePlayer = null;
            return;
        }

        player.setMovementEnabled(false);
        player.clearActions();

        this.camera = new THREE.PerspectiveCamera(
            this.cameraFov,
            defaultCamera.aspect,
            0.1,
            1000
        );

        this.camera.position.copy(defaultCamera.position);
        this.camera.quaternion.copy(defaultCamera.quaternion);

        this.startPosition.copy(defaultCamera.position);
        this.startQuaternion.copy(defaultCamera.quaternion);

        const box = new THREE.Box3().setFromObject(this.table);

        const size = new THREE.Vector3();
        const center = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        const tableTop = box.max.y;
        const largestDimension = Math.max(size.x, size.z);

        const cameraHeight = Math.max(
            3,
            largestDimension * this.cameraHeightMultiplier
        );

        const lookTarget = new THREE.Vector3(
            center.x,
            tableTop,
            center.z
        );

        this.targetPosition.copy(lookTarget);
        this.targetPosition.y += cameraHeight;

        this.targetPosition.addScaledVector(
            this.interactionFront,
            cameraHeight * 0.2
        );

        this.camera.position.copy(this.targetPosition);
        this.camera.lookAt(lookTarget);

        this.targetQuaternion.copy(this.camera.quaternion);

        this.camera.position.copy(this.startPosition);
        this.camera.quaternion.copy(this.startQuaternion);

        this.splitScreen.setCameraOverride(
            playerNumber,
            this.camera
        );

        this.state = 'entering';
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
                console.log('Transición de entrada completada.');

                this.state = 'playing';

                this.createBlackjackGame();

                console.log('Blackjack inicializado:', this.game);
            } else {
                console.log('Transición de salida completada.');

                if (this.game) {
                    this.game.endGame();
                    this.game = null;
                }

                if (this.ui) {
                    this.ui.hide();
                    this.ui = null;
                }

                this.splitScreen.setCameraOverride(
                    this.activePlayer,
                    null
                );

                player.setMovementEnabled(true);
                player.clearActions();

                this.camera = null;
                this.activePlayer = null;
                console.log('Estado final:', this.state);
                console.log('Jugador activo:', this.activePlayer);
                this.state = 'idle';
            }
        }
    }

    checkExit() {
        const player = this.players[this.activePlayer - 1];

        if (player.consumeAction('cancel')) {
            console.log('Solicitud de salida de Blackjack.');

            this.requestExit();
        }
    }
}
