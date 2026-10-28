export const habitualNPCs = [
    {
        id: 'Goonster',
        name: 'W.D GOONSTER',
        modelPath: '/models/Personajes/pjBASE.glb',
        position: { x: 0, z: -2 },
        interactionRadius: 3,
        dialogues: [
            {
                speaker: 'W.D GOONSTER',
                text: ' GOON. GOONING. YET GOONER.'
            },
            {
                speaker: 'W.D GOONSTER',
                text: 'THE GOONER KEEPS GAMBLING. THE GAMBLING KEEPS GOONING.'
            },
            {
                speaker: 'W.D GOONSTER',
                text: 'LUCK READINGS NEGATIVE. THIS NEXT ROLL WITHH BE...'
            },
            {
                speaker: 'W.D GOONSTER',
                text: 'VERY. VERY. UNLUCKY... WHAT DO YOU TWO THINK?'
            },
            {
                speaker: 'W.D GOONSTER',
                text: '✋︎ ☹︎⚐︎✞︎☜︎ ☝︎✌︎💣︎👌︎☹︎✋︎☠︎☝︎ ☝︎⚐︎⚐︎☠︎💧︎.'
            }
        ]
    }
];

export const randomNPCs = [
    // Añadiremos aquí los NPCs aleatorios.
    // Cada uno tendrá su propia spawnChance.
    // Ejemplo: spawnChance: 0.4 significa un 40 % diario.
    {
        id: 'Hakari',
        name: 'Restless Gambler',
        modelPath: '/models/Personajes/hakari.glb',
        interactionRadius: 3,
        spawnChance: 0.5,
        dialogues: [
            {
                speaker: 'Restless Gambler',
                text: "AIN'T NOBODY TAKING MY SPOT"
            }
        ]
    }
];
