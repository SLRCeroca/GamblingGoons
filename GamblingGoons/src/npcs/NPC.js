import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class NPC {
    constructor({
        id,
        name,
        modelPath,
        position,
        dialogues,
        interactionRadius = 3
    }) {
        this.id = id;
        this.name = name;
        this.modelPath = modelPath;
        this.position = new THREE.Vector3(
            position.x,
            position.y ?? 0,
            position.z
        );
        this.dialogues = dialogues;
        this.interactionRadius = interactionRadius;

        this.model = null;
        this.interactable = true;
        this.collisionRadius = 0.4;
    }

    async load(scene) {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(this.modelPath);

        this.model = gltf.scene;

        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());

        if (size.y > 0) {
            this.model.scale.multiplyScalar(2 / size.y);
        }

        const scaledBox = new THREE.Box3().setFromObject(this.model);
        const center = scaledBox.getCenter(new THREE.Vector3());

        this.model.position.x -= center.x;
        this.model.position.z -= center.z;

        const finalBox = new THREE.Box3().setFromObject(this.model);
        this.model.position.y -= finalBox.min.y;

        this.model.position.add(this.position);

        this.model.traverse((object) => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        scene.add(this.model);
        return this.model;
    }

    distanceTo(player) {
        if (!player.model || !this.model) return Infinity;

        const playerPosition = player.getPosition();
        const npcPosition = this.model.position;

        playerPosition.y = 0;
        const target = npcPosition.clone();
        target.y = 0;

        return playerPosition.distanceTo(target);
    }

    canInteract(player) {
        return this.interactable &&
            this.model !== null &&
            this.distanceTo(player) <= this.interactionRadius;
    }

    collidesWith(position, playerRadius = 0.4) {
        if (!this.model) return false;

        const dx = position.x - this.model.position.x;
        const dz = position.z - this.model.position.z;

        const minDistance = this.collisionRadius + playerRadius;

        return dx * dx + dz * dz < minDistance * minDistance;
    }
}
