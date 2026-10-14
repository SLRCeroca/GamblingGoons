
import * as THREE from 'three';
import { createWorld } from './world/World.js';
import { Player1 } from './players/Player1.js';
import { SplitScreen } from './camera/SplitScreen.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

const scene = createWorld();

// Jugador 1: WASD
const player1 = new Player1(
  scene,
  '/models/pjBASE.glb',
  new THREE.Vector3(-2, 0, 0),
  {
    forward: 'w',
    backward: 's',
    left: 'a',
    right: 'd'
  }
);

// Jugador 2: flechas
const player2 = new Player1(
  scene,
  '/models/pjBASE.glb',
  new THREE.Vector3(2, 0, 0),
  {
    forward: 'arrowup',
    backward: 'arrowdown',
    left: 'arrowleft',
    right: 'arrowright'
  }
);

const clock = new THREE.Clock();

async function init() {
  try {
    await Promise.all([
      player1.load(),
      player2.load()
    ]);

    const splitScreen = new SplitScreen(
      renderer,
      scene,
      player1,
      player2,
    );
    
    player1.setCamera(splitScreen.camera1);
    player2.setCamera(splitScreen.camera2);

    window.addEventListener('resize', () => {
      splitScreen.resize();
    });

    function animate() {
      requestAnimationFrame(animate);

      const deltaTime = Math.min(clock.getDelta(), 0.05);

      // Actualizar el movimiento de ambos jugadores
      player1.update(deltaTime);
      player2.update(deltaTime);

      // Renderizar las dos cámaras
      splitScreen.render();
    }

    animate();

  } catch (error) {
    console.error(
      'Error al iniciar Gambling Goons:',
      error
    );
  }
}

init();
