import * as THREE from 'three';

import { createWorld } from './world/World.js';
import { Player1 } from './players/Player1.js';
import { SplitScreen } from './camera/SplitScreen.js';
import { getSecretSkin } from './players/SecretSkins.js';

/* ==============================
   PRONOMBRES DISPONIBLES
   Puedes añadir más opciones aquí.
================================ */

const pronounOptions = [
  { value: 'él', label: 'Él/Ellos' },
  { value: 'ella', label: 'Ella/Ellas' },
  { value: 'elle', label: 'Elle/Elles' },
  { value: 'all in', label: 'All/In' },
  { value: 'Jackpot', label: 'Jack/Pot' },
];

/* ==============================
   FRASES ALEATORIAS
================================ */

const splashTexts = [
  "La casa siempre gana... probablemente.",
  "Los verdaderos gooners no apuestan.",
  "El 99% de los apostadores se rinden antes de ganar.",
  "Se el 1% que GANA.",
  "TODO AL NEGRO!!!!!!",
  "TODO AL ROJO!!!!!!!",
  "TODO AL VERDE!!!!!!",
  "Coche. Alcohol. Cartas.",
  "Doble o Nada.",
  "Luigi estaria orgulloso de ti.",
  "Apuesto a que no puedes dejar tu adiccion.",
  "Juego para ganar. Gano para jugar. Pierdo Siempre.",
  "Apuesto por diversion. Lloro por deporte.",
  "Amo la pasión. Pasión es apostar y apostar es vida. - 'Restless Gambler'",
  "Pasion, Amor y Apuestas.",
  "El gobierno es como el casino cuando ganas dinero te lo quitan.",
  "Admiring You.",
  "Goku no le gana a la casa.",
  "🤑🤑🤑🤑🤑",
  "GAMBLING GAMBLING! GOONING GOONING!",
];
document.getElementById('splash-text').textContent =
  splashTexts[Math.floor(Math.random() * splashTexts.length)];

/* ==============================
   RELLENAR SELECTORES
================================ */

function populatePronouns(selectElement) {
  pronounOptions.forEach((pronoun) => {
    const option = document.createElement('option');

    option.value = pronoun.value;
    option.textContent = pronoun.label;

    selectElement.appendChild(option);
  });
}

populatePronouns(document.getElementById('goon1-pronouns'));
populatePronouns(document.getElementById('goon2-pronouns'));

/* ==============================
   DATOS DE LOS GOONS
================================ */

// Estos objetos podrán utilizarse más adelante
// para mostrar nombres, pronombres y skins.

const goonSettings = [
  {
    player: 1,
    name: '',
    pronouns: 'he/him',
    color: 'red',
    secretSkin: null
  },
  {
    player: 2,
    name: '',
    pronouns: 'they/them',
    color: 'black',
    secretSkin: null
  }
];

/* ==============================
   CONFIGURACIÓN THREE.JS
================================ */

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

const scene = createWorld();

/* ==============================
   JUGADORES
================================ */

const player1 = new Player1(
  scene,
  '/models/Personajes/Rojo.glb',
  new THREE.Vector3(-2, 0, 0),
  {
    forward: 'w',
    backward: 's',
    left: 'a',
    right: 'd'
  }
);

const player2 = new Player1(
  scene,
  '/models/Personajes/Negro.glb',
  new THREE.Vector3(2, 0, 0),
  {
    forward: 'arrowup',
    backward: 'arrowdown',
    left: 'arrowleft',
    right: 'arrowright'
  }
);

const clock = new THREE.Clock();

let splitScreen = null;
let gameStarted = false;

/* ==============================
   REFERENCIAS DEL MENÚ
================================ */

const mainMenu = document.getElementById('main-menu');
const customizationScreen = document.getElementById('customization-screen');

const playButton = document.getElementById('play-button');
const backButton = document.getElementById('back-button');
const startGameButton = document.getElementById('start-game-button');
const soloButton = document.getElementById('solo-button');

const name1Input = document.getElementById('goon1-name');
const name2Input = document.getElementById('goon2-name');

const pronouns1Select = document.getElementById('goon1-pronouns');
const pronouns2Select = document.getElementById('goon2-pronouns');

const errorMessage = document.getElementById('customization-error');

/* ==============================
   ABRIR PERSONALIZACIÓN
================================ */

playButton.addEventListener('click', () => {
  mainMenu.classList.add('hidden');
  customizationScreen.classList.remove('screen-hidden');

  name1Input.focus();
});

/* ==============================
   VOLVER AL MENÚ
================================ */

backButton.addEventListener('click', () => {
  customizationScreen.classList.add('screen-hidden');
  mainMenu.classList.remove('hidden');

  errorMessage.textContent = '';
});

/* ==============================
   INICIAR PARTIDA
================================ */

async function startGame(solo = false) {
  if (gameStarted) return;

  // Validar y guardar nombres y 
  const name1 = document.getElementById('goon1-name').value.trim()
    || 'Rojo';

  const name2 = document.getElementById('goon2-name').value.trim()
    || 'Negro';

  goonSettings[0].name = name1;
  goonSettings[1].name = name2;

  // Activar las skins secretas según el nombre de cada jugador.
  goonSettings[0].secretSkin = getSecretSkin(name1);
  goonSettings[1].secretSkin = getSecretSkin(name2);

  errorMessage.textContent = '';
  startGameButton.disabled = true;
  startGameButton.textContent = 'CARGANDO...';

  try {
    if (goonSettings[0].secretSkin) {
      player1.setSkin(goonSettings[0].secretSkin);
    }

    if (goonSettings[1].secretSkin) {
      player2.setSkin(goonSettings[1].secretSkin);
    }
    // En solitario solo se carga el Goon rojo.
    if (solo) {
      await player1.load();
    } else {
      await Promise.all([
        player1.load(),
        player2.load()
      ]);
    }

    splitScreen = new SplitScreen(
      renderer,
      scene,
      player1,
      player2
    );

    player1.setCamera(splitScreen.camera1);

    if (solo) {
      // La cámara 1 ocupa toda la pantalla.
      splitScreen.renderSolo = true;
    } else {
      player2.setCamera(splitScreen.camera2);
    }

    console.log('Goon settings:', goonSettings);

    customizationScreen.classList.add('screen-hidden');

    clock.getDelta();
    gameStarted = true;

    animate();

  } catch (error) {
    console.error('Error al iniciar la partida:', error);

    errorMessage.textContent =
      'No se pudieron cargar los personajes. Revisa la consola.';

    startGameButton.disabled = false;
    startGameButton.textContent = 'ENTRAR AL CASINO';

    soloButton.disabled = false;
    soloButton.textContent = 'JUGAR EN SOLITARIO';
  }
}

startGameButton.addEventListener('click', () => {
  startGame(false);
});

soloButton.addEventListener('click', () => {
  startGame(true);
});

/* ==============================
   BUCLE DEL JUEGO
================================ */

function animate() {
  if (!gameStarted || !splitScreen) return;

  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);

  player1.update(deltaTime);
  player2.update(deltaTime);

  splitScreen.render();
}

/* ==============================
   REDIMENSIONAR VENTANA
================================ */

function resizeGame() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (splitScreen) {
    splitScreen.resize();
  }
}

window.addEventListener('resize', resizeGame);

resizeGame();