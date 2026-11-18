
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
        this.cameraOverrides = {
            1: null,
            2: null
        };

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

    setCameraOverride(playerNumber, camera) {
        this.cameraOverrides[playerNumber] = camera;

        if (camera) {
            const width = this.getViewportWidth(playerNumber);
            camera.aspect = width / this.height;
            camera.updateProjectionMatrix();
        }
    }

    getActiveCamera(playerNumber) {
        return this.cameraOverrides[playerNumber] ||
            (playerNumber === 1 ? this.camera1 : this.camera2);
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
        //Actualizar también las cámaras de minijuegos si existen.
        for (const playerNumber of [1, 2]) {
            const camera = this.cameraOverrides[playerNumber];

            if (!camera) continue;

            const viewportWidth = this.getViewportWidth(playerNumber);
            camera.aspect = viewportWidth / height;
            camera.updateProjectionMatrix();
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

        const camera = this.getActiveCamera(playerNumber);
        const usingOverride = !!this.cameraOverrides[playerNumber];

        this.renderer.setViewport(x, 0, width, height);
        this.renderer.setScissor(x, 0, width, height);
        this.renderer.clear(true, true, true);

        // Solo actualizar automáticamente las cámaras normales.
        if (!usingOverride) {
            this.updateCamera(camera, player);
        }

        this.renderer.render(this.scene, camera);

        const view = this.dialogueViews[playerNumber];

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

            const camera = this.getActiveCamera(1);

            if (!this.cameraOverrides[1]) {
                this.updateCamera(camera, this.player1);
            }

            this.renderer.render(this.scene, camera);

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
