
import * as THREE from 'three';

export class SplitScreen {
    constructor(renderer, scene, player1, player2) {
        this.renderer = renderer;
        this.scene = scene;
        this.player1 = player1;
        this.player2 = player2;

        this.camera1 = this.createCamera();
        this.camera2 = this.createCamera();

        this.cameraOffset = new THREE.Vector3(6, 8, 6);

        this.resize();
    }

    createCamera() {
        const camera = new THREE.PerspectiveCamera(
            50,
            1,
            0.1,
            1000
        );

        return camera;
    }

    updateCamera(camera, player) {
        if (!player.model) return;

        const target = player.getPosition();

        camera.position.copy(target).add(this.cameraOffset);
        camera.lookAt(target);
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const leftWidth = Math.floor(width / 2);
        const rightWidth = width - leftWidth;

        this.renderer.setSize(width, height, false);

        this.camera1.aspect = leftWidth / height;
        this.camera1.updateProjectionMatrix();

        this.camera2.aspect = rightWidth / height;
        this.camera2.updateProjectionMatrix();
    }

    render() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const leftWidth = Math.floor(width / 2);
        const rightWidth = width - leftWidth;

        this.updateCamera(this.camera1, this.player1);
        this.updateCamera(this.camera2, this.player2);

        this.renderer.setScissorTest(true);

        // Mitad izquierda: jugador 1
        this.renderer.setViewport(0, 0, leftWidth, height);
        this.renderer.setScissor(0, 0, leftWidth, height);
        this.renderer.clear(true, true, true);
        this.renderer.render(this.scene, this.camera1);

        // Mitad derecha: jugador 2
        this.renderer.setViewport(
            leftWidth, 0, rightWidth, height
        );

        this.renderer.setScissor(
            leftWidth, 0, rightWidth, height
        );

        this.renderer.clear(true, true, true);
        this.renderer.render(this.scene, this.camera2);

        this.renderer.setScissorTest(false);
    }
}
