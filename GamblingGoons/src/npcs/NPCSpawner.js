
import { NPC } from './NPC.js';
import { habitualNPCs, randomNPCs } from './NPCData.js';

export class NPCSpawner {
    constructor(npcManager) {
        this.npcManager = npcManager;

        this.spawnPositions = [
            { x: 0, z: -2 },
            { x: 5, z: -3 },
            { x: -5, z: -3 },
            { x: 5, z: 4 },
            { x: -5, z: 4 },
            { x: 0, z: 6 },
            { x: 8, z: 0 },
            { x: -8, z: 0 }
        ];

        this.spawnedNPCs = [];
    }

    async spawnDay(day) {
        for (const npc of this.spawnedNPCs) {
            npc.model?.parent?.remove(npc.model);
        }

        const previousIds = new Set(
            this.spawnedNPCs.map(npc => npc.id)
        );

        this.npcManager.npcs = this.npcManager.npcs.filter(
            npc => !previousIds.has(npc.id)
        );

        this.spawnedNPCs = [];

        // Los habituales conservan sus posiciones predeterminadas.
        const selectedNPCs = habitualNPCs.map(data => ({
            ...data,
            position: { ...data.position }
        }));

        // Barajar las posiciones reservadas para NPCs aleatorios.
        const availablePositions = [...this.spawnPositions];

        availablePositions.sort(() => Math.random() - 0.5);

        // Cada NPC aleatorio tiene una probabilidad independiente.
        for (const data of randomNPCs) {
            if (Math.random() >= data.spawnChance) continue;

            // Si no quedan posiciones, no aparece este NPC.
            const position = availablePositions.pop();
            if (!position) break;

            selectedNPCs.push({
                ...data,
                position: { x: position.x, z: position.z }
            });
        }

        // Registrar los NPCs seleccionados.
        selectedNPCs.forEach(data => {
            const npc = new NPC(data);

            this.npcManager.addNPC(npc);
            this.spawnedNPCs.push(npc);
        });

        await this.npcManager.load();

        console.log(`NPCs generados para el día ${day}:`,
            this.spawnedNPCs.map(npc => npc.name)
        );
    }
}
