
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function createWorld() {
    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x202630);

    // Cargar mapa del casino.
    const loader = new GLTFLoader();

    try {
        const gltf = await loader.loadAsync(
            '/models/Mapa/CASINO.glb'
        );

        const casino = gltf.scene;


        casino.updateMatrixWorld(true);

        casino.traverse(object => {
            if (!object.isMesh) return;

            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());

            // Mostrar solamente superficies grandes y relativamente horizontales.
            if (size.x > 20 && size.z > 20 && size.y < 3) {
                console.log('[CASINO SUPERFICIE]', {
                    nombre: object.name,
                    dimensiones: size.toArray(),
                    alturaMinima: box.min.y,
                    alturaMaxima: box.max.y,
                    centro: box.getCenter(new THREE.Vector3()).toArray()
                });
            }
        });


        casino.name = 'CasinoMap';
        // Reducir el mapa al 10% de su tamaño original.
        casino.scale.setScalar(0.08);

        // Alinear el suelo del casino con Y = 0.
        casino.position.y += 5.871095;

        casino.updateMatrixWorld(true);

        casino.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        scene.add(casino);

        console.log('Mapa del casino cargado correctamente.');

    } catch (error) {
        console.error('Error al cargar CASINO.glb:', error);
        throw error;
    }

    // Iluminación ambiental.
    const hemisphereLight = new THREE.HemisphereLight(
        0xffffff,
        0x424958,
        2
    );

    scene.add(hemisphereLight);

    // Luz principal.
    const directionalLight = new THREE.DirectionalLight(
        0xffffff,
        2.5
    );

    directionalLight.position.set(8, 12, 6);
    directionalLight.castShadow = true;

    scene.add(directionalLight);

    return scene;
}
