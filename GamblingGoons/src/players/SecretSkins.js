// src/players/SecretSkins.js

// Registro de skins secretas.
// La clave es el nombre secreto y el valor es el modelo GLB.
//
// Para añadir otra skin:
// 'NOMBRESECRETO': '/models/Personajes/NuevaSkin.glb'

export const SECRET_SKINS = {
    GOON1: '/models/Personajes/Rojo.glb',
    GOON2: '/models/Personajes/Negro.glb',
    DICE: '/models/Personajes/EmperorDice.glb',
    GAMBLER: '/models/Personajes/hakari.glb',
    PLACEHOLDER: '/models/Personajes/pjBASE.glb',
    OHYEAH: '/models/Personajes/Croupier(Luigi).glb',
    BOSSMAN: '/models/Personajes/Capo.glb',
};

/**
 * Devuelve la ruta de la skin secreta correspondiente.
 * Si el nombre no coincide con ninguna clave, devuelve null.
 */
export function getSecretSkin(name) {
    const normalizedName = name.trim().toUpperCase();

    return SECRET_SKINS[normalizedName] ?? null;
}