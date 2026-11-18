
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Card {
    constructor({
        value,
        suit,
        modelPath,
        position = new THREE.Vector3(),
        rotation = new THREE.Euler(),
        scale = 1,
        targetLength = 0.20
    }) {
        this.value = value;
        this.suit = suit;
        this.modelPath = modelPath;

        this.position = position.clone();
        this.rotation = rotation.clone();
        this.scale = scale;
        this.targetLength = targetLength;

        this.model = null;
        this.loader = new GLTFLoader();
    }

    async load() {
        const gltf = await this.loader.loadAsync(this.modelPath);

        this.model = gltf.scene;

        // Medir el modelo original.
        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());

        // El eje Y es el lado largo de la carta.
        const originalLength = size.y;

        // Escala proporcional para todas las cartas.
        this.scale *= this.targetLength / originalLength;

        this.model.scale.setScalar(this.scale);

        // La carta está exportada en XY.
        // Girarla -90 grados sobre X coloca su cara hacia arriba.
        // Primero: colocar la carta plana sobre la mesa.
        const layFlat = new THREE.Quaternion()
            .setFromAxisAngle(
                new THREE.Vector3(1, 0, 0),
                -Math.PI / 2
            );

        // Segundo: girarla 90 grados sobre el eje vertical.
        // Esto cambia de apaisado a retrato sin levantarla.
        const turnPortrait = new THREE.Quaternion()
            .setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                Math.PI / 2
            );

        this.model.quaternion
            .copy(turnPortrait)
            .multiply(layFlat);

        // Centrar el modelo en su origen.
        const center = box.getCenter(new THREE.Vector3());

        const offset = center.multiplyScalar(-this.scale);
        offset.applyQuaternion(this.model.quaternion);

        this.model.position.copy(this.position).add(offset);

        this.model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        console.log(`Carta ${this.value} de ${this.suit}:`, {
            escala: this.scale,
            anchuraFinal: size.x * this.scale,
            longitudFinal: size.y * this.scale
        });

        return this.model;
    }

    setPosition(position) {
        if (!this.model) return;

        const box = new THREE.Box3().setFromObject(this.model);
        const currentCenter = box.getCenter(new THREE.Vector3());
        const offset = this.model.position.clone().sub(currentCenter);

        this.position.copy(position);
        this.model.position.copy(position).add(offset);
    }

    setRotation(rotation) {
        if (!this.model) return;
        this.model.rotation.copy(rotation);
    }

    setVisible(visible) {
        if (!this.model) return;
        this.model.visible = visible;
    }

    getModel() {
        return this.model;
    }
}
