import * as THREE from 'three';

import { createWorld } from './world/World.js';
import { Player1 } from './players/Player1.js';
import { SplitScreen } from './camera/SplitScreen.js';
import { getSecretSkin } from './players/SecretSkins.js';
import { IntroSequence } from './cutscenes/IntroSequence.js';
import { NPCManager } from './npcs/NPCManager.js';
import { NPCSpawner } from './npcs/NPCSpawner.js';


/* ==============================
   PRONOMBRES DISPONIBLES
   Puedes añadir más opciones aquí.
================================ */

const pronounOptions = [
  { value: 'él', label: 'Él/Ellos' },
  { value: 'ella', label: 'Ella/Ellas' },
  { value: 'all in', label: 'All/In' },
  { value: 'jackpot', label: 'Jack/Pot' },
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
  "Es una pena terrible, a Rojo le cayo un meteorito mientras apostaba en el blackjack.",
  "Es una pena terrible, a Negro le pillaron robando todas las fichas en el poker."
];

const secretSplashTexts = [
  "Porque no pruebas el nombre: GOON1?",
  "Porque no pruebas el nombre: GOON2?",
  "Porque no pruebas el nombre: DICE?",
  "Porque no pruebas el nombre: OHYEAH?",
  "Porque no pruebas el nombre: BOSSMAN?",
  "Porque no pruebas el nombre: GAMBLER?",
  "Porque no pruebas el nombre: PLACEHOLDER?",
  "Algun dia me encontraran muerto en un casino.",
];

// Probabilidad de mostrar una pista secreta: 10 %
const showSecretHint = Math.random() < 0.1;

const splashPool = showSecretHint
  ? secretSplashTexts
  : splashTexts;

document.getElementById('splash-text').textContent =
  splashPool[Math.floor(Math.random() * splashPool.length)];

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
    right: 'd',
    confirm: 'e',
    cancel: 'q'
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
    right: 'arrowright',
    confirm: 'i',
    cancel: 'o'
  }
);

const clock = new THREE.Clock();

let splitScreen = null;
let npcManager = null;
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
   CINEMÁTICA INICIAL
================================ */

let introSequence = null;

function beginIntro(solo = false) {
  if (gameStarted || introSequence) return;

  startGameButton.disabled = true;
  soloButton.disabled = true;

  startGameButton.textContent = 'CARGANDO CINEMÁTICA...';
  soloButton.textContent = 'CARGANDO CINEMÁTICA...';

  customizationScreen.classList.add('screen-hidden');

  introSequence = new IntroSequence(renderer, () => {
    introSequence = null;

    // Tras la cinemática, iniciar el juego normal.
    startGame(solo);
  });

  introSequence.run();
}

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
      splitScreen.resize();
    } else {
      player2.setCamera(splitScreen.camera2);
    }

    console.log('Goon settings:', goonSettings);

    customizationScreen.classList.add('screen-hidden');
    
    npcManager = new NPCManager({
      renderer,
      splitScreen,
      players: [player1, player2],
      playerSettings: goonSettings
    });

    player1.npcManager = npcManager;
    player2.npcManager = npcManager;

    const npcSpawner = new NPCSpawner(npcManager);

    await npcSpawner.spawnDay(1);

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
  beginIntro(false);
});

soloButton.addEventListener('click', () => {
  beginIntro(true);
});

/* ==============================
   BUCLE DEL JUEGO
================================ */

function animate() {
  if (!gameStarted || !splitScreen) return;

  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);

  player1.update(deltaTime);

  if (!splitScreen.renderSolo) {
    player2.update(deltaTime);
  }

  npcManager?.update();
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