
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class IntroScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030207);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    this.camera.position.set(0, 7, 12);
    this.camera.lookAt(0, 1.5, 0);

    this.models = {};
    this.originalScales = new Map();

    this.createEnvironment();
  }

  createEnvironment() {
    // Plano oscuro e infinito a efectos visuales.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({
        color: 0x09080d,
        roughness: 0.95,
        metalness: 0
      })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Iluminación ambiental casi inexistente.
    this.scene.add(
      new THREE.AmbientLight(0xffffff, 0.12)
    );

    // Único foco principal, situado sobre los personajes.
    const spotlight = new THREE.SpotLight(
      0xfff0d0,
      180,
      35,
      Math.PI / 5,
      0.45,
      1.2
    );

    spotlight.position.set(0, 10, 1);
    spotlight.target.position.set(0, 0, 0);
    spotlight.castShadow = true;

    this.scene.add(spotlight);
    this.scene.add(spotlight.target);
  }

  async loadCharacter(id, modelPath, position) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(modelPath);
    const model = gltf.scene;

    // Escalar cada modelo para que tenga aproximadamente
    // dos unidades de altura, independientemente de su origen.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    if (size.y > 0) {
      model.scale.multiplyScalar(2 / size.y);
    }

    // Centrar el modelo y apoyarlo sobre el suelo.
    const scaledBox = new THREE.Box3().setFromObject(model);
    const center = scaledBox.getCenter(new THREE.Vector3());

    model.position.x -= center.x;
    model.position.z -= center.z;

    const finalBox = new THREE.Box3().setFromObject(model);
    model.position.y -= finalBox.min.y;

    model.position.x += position.x;
    model.position.z += position.z;

    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    this.scene.add(model);
    this.models[id] = model;
    this.originalScales.set(id, model.scale.clone());

    return model;
  }

  async load() {
    await Promise.all([
      this.loadCharacter(
        'goon1',
        '/models/Personajes/Rojo.glb',
        { x: -2.2, z: 0 }
      ),
      this.loadCharacter(
        'goon2',
        '/models/Personajes/Negro.glb',
        { x: 2.2, z: 0 }
      ),
      this.loadCharacter(
        'boss',
        '/models/Personajes/Capo.glb',
        { x: 0, z: -1.2 }
      )
    ]);

    // Los tres personajes miran hacia el centro.
    this.models.goon1.rotation.y = 0.35;
    this.models.goon2.rotation.y = -0.35;

    this.setSpeaker('boss');
  }

  setSpeaker(id) {
    for (const [characterId, model] of Object.entries(this.models)) {
      const originalScale = this.originalScales.get(characterId);
      if (!originalScale) continue;

      const multiplier = characterId === id ? 1.06 : 1;

      model.scale.copy(originalScale).multiplyScalar(multiplier);
    }
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.scene.traverse((object) => {
      if (object.isMesh) {
        object.geometry.dispose();

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material) => material.dispose());
      }
    });
  }
}
