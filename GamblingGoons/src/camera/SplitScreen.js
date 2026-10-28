
import * as THREE from 'three';

export class SplitScreen {
    constructor(renderer, scene, player1, player2) {
        this.renderer = renderer;
        this.scene = scene;
        this.player1 = player1;
        this.player2 = player2;
        this.renderer.autoClear = false;
        this.camera1 = this.createCamera();
        this.camera2 = this.createCamera();

        this.cameraOffset = new THREE.Vector3(6, 8, 6);
        this.renderSolo = false;

        // Escenas temporales para diálogos individuales.
        this.dialogueViews = {
            1: null,
            2: null
        };

        this.resize();
    }

    createCamera() {
        return new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    }

    updateCamera(camera, player) {
        if (!player.model) return;

        const target = player.getPosition();

        camera.position.copy(target).add(this.cameraOffset);
        camera.lookAt(target);
    }

    // Registrar una escena/cámara para el diálogo de un jugador.
    setDialogueView(playerNumber, view) {
        if (playerNumber !== 1 && playerNumber !== 2) {
            throw new Error('El jugador debe ser 1 o 2.');
        }

        this.dialogueViews[playerNumber] = view;
    }

    clearDialogueView(playerNumber) {
        if (playerNumber !== 1 && playerNumber !== 2) return;

        this.dialogueViews[playerNumber] = null;
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.width = width;
        this.height = height;
        this.leftWidth = Math.floor(width / 2);
        this.rightWidth = width - this.leftWidth;

        this.renderer.setSize(width, height, false);

        this.camera1.aspect = this.renderSolo
            ? width / height
            : this.leftWidth / height;

        this.camera1.updateProjectionMatrix();

        this.camera2.aspect = this.rightWidth / height;
        this.camera2.updateProjectionMatrix();

        // Actualizar también las cámaras de diálogo si existen.
        for (const view of Object.values(this.dialogueViews)) {
            if (!view?.camera) continue;

            const viewportWidth = this.getViewportWidth(view.playerNumber);
            view.camera.aspect = viewportWidth / height;
            view.camera.updateProjectionMatrix();

            if (typeof view.resize === 'function') {
                view.resize(viewportWidth, height);
            }
        }
    }

    getViewportWidth(playerNumber) {
        if (this.renderSolo && playerNumber === 1) {
            return this.width;
        }

        return playerNumber === 1
            ? this.leftWidth
            : this.rightWidth;
    }


    renderViewport(playerNumber, x, width, height) {
        const player = playerNumber === 1
            ? this.player1
            : this.player2;

        const defaultCamera = playerNumber === 1
            ? this.camera1
            : this.camera2;

        const view = this.dialogueViews[playerNumber];

        this.renderer.setViewport(x, 0, width, height);
        this.renderer.setScissor(x, 0, width, height);

        // 1. Dibujar el casino como fondo.
        this.renderer.clear(true, true, true);

        this.updateCamera(defaultCamera, player);
        this.renderer.render(this.scene, defaultCamera);

        // 2. Dibujar los modelos del diálogo por encima del casino.
        if (view?.scene && view?.camera) {
            this.renderer.clearDepth();
            this.renderer.render(view.scene, view.camera);
        }
    }


    render() {
        const { width, height, leftWidth, rightWidth } = this;

        this.renderer.setScissorTest(false);
        this.renderer.setViewport(0, 0, width, height);
        this.renderer.clear(true, true, true);

        if (this.renderSolo) {
            this.renderer.setScissorTest(false);
            this.renderer.setViewport(0, 0, width, height);
            this.renderer.clear(true, true, true);

            this.updateCamera(this.camera1, this.player1);
            this.renderer.render(this.scene, this.camera1);

            const view = this.dialogueViews[1];

            if (view?.scene && view?.camera) {
                this.renderer.clearDepth();
                this.renderer.render(view.scene, view.camera);
            }

            return;
        }

        this.renderer.setScissorTest(true);

        this.renderViewport(1, 0, leftWidth, height);
        this.renderViewport(2, leftWidth, rightWidth, height);

        this.renderer.setScissorTest(false);
    }
}
