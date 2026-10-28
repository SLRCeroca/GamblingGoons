
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player1 {
    constructor(scene, modelPath, position, controls) {
        this.scene = scene;
        this.modelPath = modelPath;
        this.position = position.clone();
        this.controls = controls;

        this.model = null;
        this.camera = null;
        this.speed = 5;
        this.npcManager = null;
        this.collisionRadius = 0.4;

        // Permite pausar a este jugador sin detener al otro.
        this.movementEnabled = true;

        // Acciones pendientes para consumir desde el sistema de juego.
        this.actions = {
            confirm: false,
            cancel: false
        };

        // Límites del escenario.
        this.minX = -18;
        this.maxX = 18;
        this.minZ = -18;
        this.maxZ = 18;

        this.keys = {};

        this.isTypingInField = () => {
            const element = document.activeElement;

            return element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement ||
                element?.isContentEditable;
        };

        this.clearKeys = () => {
            this.keys = {};
        };

        this.handleKeyDown = (event) => {
            if (this.isTypingInField()) {
                this.clearKeys();
                return;
            }

            const key = event.key.toLowerCase();
            const isPlayerKey = Object.values(this.controls).includes(key);

            if (!isPlayerKey) return;

            event.preventDefault();

            // Evitar que mantener una tecla pulsada genere acciones repetidas.
            const justPressed = !this.keys[key];
            this.keys[key] = true;

            if (!justPressed || event.repeat) return;

            if (key === this.controls.confirm) {
                this.actions.confirm = true;
            }

            if (key === this.controls.cancel) {
                this.actions.cancel = true;
            }
        };

        this.handleKeyUp = (event) => {
            const key = event.key.toLowerCase();
            this.keys[key] = false;

            if (this.isTypingInField()) {
                this.clearKeys();
            }
        };

        this.handleFocusIn = (event) => {
            const element = event.target;

            if (
                element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement ||
                element?.isContentEditable
            ) {
                this.clearKeys();
                this.clearActions();
            }
        };

        this.handleWindowBlur = () => {
            this.clearKeys();
            this.clearActions();
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('blur', this.handleWindowBlur);
        document.addEventListener('focusin', this.handleFocusIn);
    }

    setSkin(modelPath) {
        if (this.model) {
            console.warn(
                'No se puede cambiar la skin después de cargar el modelo.'
            );
            return;
        }

        if (typeof modelPath !== 'string' || !modelPath.trim()) {
            console.warn('La ruta de la skin no es válida.');
            return;
        }

        this.modelPath = modelPath;
    }

    async load() {
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

        this.scene.add(this.model);
        return this.model;
    }

    setCamera(camera) {
        this.camera = camera;
    }

    setMovementEnabled(enabled) {
        this.movementEnabled = enabled;

        // Al bloquear el movimiento, no dejar teclas de movimiento atascadas.
        if (!enabled) {
            for (const key of [
                this.controls.forward,
                this.controls.backward,
                this.controls.left,
                this.controls.right
            ]) {
                this.keys[key] = false;
            }
        }
    }

    consumeAction(action) {
        if (!(action in this.actions)) return false;

        const pressed = this.actions[action];
        this.actions[action] = false;
        return pressed;
    }

    clearActions() {
        this.actions.confirm = false;
        this.actions.cancel = false;
    }

    update(deltaTime) {
        if (!this.model || !this.camera) return;

        if (this.isTypingInField()) {
            this.clearKeys();
            this.clearActions();
            return;
        }

        if (!this.movementEnabled) return;

        let inputX = 0;
        let inputZ = 0;

        if (this.keys[this.controls.left]) inputX -= 1;
        if (this.keys[this.controls.right]) inputX += 1;
        if (this.keys[this.controls.forward]) inputZ += 1;
        if (this.keys[this.controls.backward]) inputZ -= 1;

        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3()
            .crossVectors(forward, new THREE.Vector3(0, 1, 0))
            .normalize();

        const direction = new THREE.Vector3();
        direction.addScaledVector(forward, inputZ);
        direction.addScaledVector(right, inputX);

        if (direction.lengthSq() > 0) {
            direction.normalize();

            const movement = direction.clone()
                .multiplyScalar(this.speed * deltaTime);

            const nextPosition = this.model.position.clone()
                .add(movement);

            const collides = this.npcManager?.npcs.some(npc => {
                return npc.collidesWith(
                    nextPosition,
                    this.collisionRadius
                );
            });

            if (!collides) {
                this.model.position.copy(nextPosition);
            }

            const targetAngle = Math.atan2(direction.x, direction.z);

            let angleDifference =
                targetAngle - this.model.rotation.y;

            angleDifference = Math.atan2(
                Math.sin(angleDifference),
                Math.cos(angleDifference)
            );

            const rotationSpeed = 8;

            this.model.rotation.y +=
                angleDifference *
                (1 - Math.exp(-rotationSpeed * deltaTime));
        }

        this.model.position.x = THREE.MathUtils.clamp(
            this.model.position.x,
            this.minX,
            this.maxX
        );

        this.model.position.z = THREE.MathUtils.clamp(
            this.model.position.z,
            this.minZ,
            this.maxZ
        );
    }

    getPosition() {
        if (!this.model) return this.position.clone();
        return this.model.position.clone();
    }

    dispose() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('blur', this.handleWindowBlur);
        document.removeEventListener('focusin', this.handleFocusIn);

        this.clearKeys();
        this.clearActions();
    }
}
