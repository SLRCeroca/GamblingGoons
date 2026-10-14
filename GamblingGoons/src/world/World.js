
import * as THREE from 'three';

export function createWorld() {
    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x202630);

    // Suelo del prototipo
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x777d83,
        roughness: 0.9
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;

    scene.add(ground);

    // Cuadrícula temporal para comprobar la perspectiva
    const grid = new THREE.GridHelper(40, 40, 0x555b63, 0x555b63);
    grid.position.y = 0.01;

    scene.add(grid);

    // Iluminación ambiental
    const hemisphereLight = new THREE.HemisphereLight(
        0xffffff,
        0x424958,
        2
    );

    scene.add(hemisphereLight);

    // Luz principal
    const directionalLight = new THREE.DirectionalLight(
        0xffffff,
        2.5
    );

    directionalLight.position.set(8, 12, 6);
    directionalLight.castShadow = true;

    scene.add(directionalLight);

    return scene;
}
