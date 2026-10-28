import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class NPCDialogue {
    constructor({ playerNumber, playerName, playerModelPath, npc, isSolo = false }) {
        this.playerNumber = playerNumber;
        this.playerName = playerName;
        this.playerModelPath = playerModelPath;
        this.npc = npc;
        this.isSolo = isSolo;

        this.scene = new THREE.Scene();
        this.scene.background = null;

        this.camera = new THREE.PerspectiveCamera(
            35,
            1,
            0.1,
            100
        );

        this.camera.position.set(0, 1.8, 9);
        this.camera.lookAt(0, 2.5, 0);

        this.resize(800, 600);
        this.createEnvironment();
        this.models = [];
    }


    createEnvironment() {
        // Sin suelo ni fondo: se verá el casino detrás de los modelos.
        this.scene.background = null;

        this.scene.add(
            new THREE.AmbientLight(0xffffff, 2)
        );

        const keyLight = new THREE.DirectionalLight(0xffe0b0, 3);
        keyLight.position.set(0, 5, 7);
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0x879dff, 1.2);
        fillLight.position.set(-5, 3, 2);
        this.scene.add(fillLight);
    }


    async loadModel(path, x, targetHeight = 2.0, rotationY = 0) {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(path);
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());

        if (size.y > 0) {
            model.scale.multiplyScalar(targetHeight / size.y);
        }

        if (this.isSolo) {
            model.scale.x *= 0.7;
            model.scale.z *= 0.7;
        }

        const scaledBox = new THREE.Box3().setFromObject(model);
        const center = scaledBox.getCenter(new THREE.Vector3());

        model.position.x -= center.x;
        model.position.z -= center.z;

        const finalBox = new THREE.Box3().setFromObject(model);
        model.position.y -= finalBox.min.y;

        model.position.x += x;
        model.rotation.y = rotationY;

        model.traverse((object) => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        this.scene.add(model);
        this.models.push(model);
        return model;
    }

    async load() {
        const isSolo = this.isSolo ?? false;

        const playerX = isSolo ? -3 : -2.75;
        const npcX = isSolo ? 3.0 : 2.75;
        const height = isSolo ? 3 : 2.0;

        await Promise.all([
            this.loadModel(this.playerModelPath, playerX, height, 0.25),
            this.loadModel(this.npc.modelPath, npcX, height, -0.25)
        ]);
    }

    resize(width, height) {
        if (!width || !height) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    dispose() {
        this.scene.traverse((object) => {
            if (!object.isMesh) return;

            object.geometry.dispose();

            const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];

            materials.forEach((material) => material.dispose());
        });

        this.models = [];
    }
}
