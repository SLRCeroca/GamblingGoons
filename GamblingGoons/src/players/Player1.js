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

        // Límites del escenario
        this.minX = -18;
        this.maxX = 18;
        this.minZ = -18;
        this.maxZ = 18;

        // Estado de las teclas
        this.keys = {};

        // Evitar movimiento mientras se escribe en formularios.
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

            if (Object.values(this.controls).includes(key)) {
                event.preventDefault();
                this.keys[key] = true;
            }
        };

        this.handleKeyUp = (event) => {
            const key = event.key.toLowerCase();

            // Siempre liberar la tecla al soltarla,
            // aunque el foco esté ahora en un campo de texto.
            this.keys[key] = false;

            if (this.isTypingInField()) {
                this.clearKeys();
            }
        };

        // Si el jugador empieza a escribir, parar el movimiento.
        this.handleFocusIn = (event) => {
            const element = event.target;

            if (
                element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement ||
                element?.isContentEditable
            ) {
                this.clearKeys();
            }
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('focusin', this.handleFocusIn);
    }

    // Cambiar la skin antes de cargar el modelo.
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

        // Ajustar el modelo a una altura aproximada de 2 unidades.
        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());

        if (size.y > 0) {
            this.model.scale.multiplyScalar(2 / size.y);
        }

        // Centrar el modelo horizontalmente.
        const scaledBox = new THREE.Box3().setFromObject(this.model);
        const center = scaledBox.getCenter(new THREE.Vector3());

        this.model.position.x -= center.x;
        this.model.position.z -= center.z;

        // Apoyar el modelo sobre el suelo.
        const finalBox = new THREE.Box3().setFromObject(this.model);
        this.model.position.y -= finalBox.min.y;

        // Aplicar la posición inicial.
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

    update(deltaTime) {
        if (!this.model || !this.camera) return;

        // Protección adicional por si el foco está en un formulario.
        if (this.isTypingInField()) {
            this.clearKeys();
            return;
        }

        let inputX = 0;
        let inputZ = 0;

        if (this.keys[this.controls.left]) inputX -= 1;
        if (this.keys[this.controls.right]) inputX += 1;
        if (this.keys[this.controls.forward]) inputZ += 1;
        if (this.keys[this.controls.backward]) inputZ -= 1;

        // Dirección hacia delante de la cámara.
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        // Dirección lateral.
        const right = new THREE.Vector3()
            .crossVectors(forward, new THREE.Vector3(0, 1, 0))
            .normalize();

        // Calcular dirección del movimiento.
        const direction = new THREE.Vector3();
        direction.addScaledVector(forward, inputZ);
        direction.addScaledVector(right, inputX);

        if (direction.lengthSq() > 0) {
            direction.normalize();

            // Mover al personaje.
            this.model.position.addScaledVector(
                direction,
                this.speed * deltaTime
            );

            // Girar suavemente hacia el movimiento.
            const targetAngle = Math.atan2(direction.x, direction.z);

            let angleDifference =
                targetAngle - this.model.rotation.y;

            // Elegir el giro más corto.
            angleDifference = Math.atan2(
                Math.sin(angleDifference),
                Math.cos(angleDifference)
            );

            const rotationSpeed = 8;

            this.model.rotation.y +=
                angleDifference *
                (1 - Math.exp(-rotationSpeed * deltaTime));
        }

        // Limitar el movimiento al escenario.
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

    // Permite retirar los listeners si en el futuro se destruye el jugador.
    dispose() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('focusin', this.handleFocusIn);
        this.clearKeys();
    }
}
