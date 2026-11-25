
import * as THREE from 'three';

export class SlotMachineEffects {
    constructor(machine, color = 'Verde') {
        this.machine = machine;
        this.color = color;

        this.parts = {
            leverBall: machine.getObjectByName(`bolaPalanca${color}`),
            lever: machine.getObjectByName(`manilla${color}`),
            button: machine.getObjectByName(`boton${color}`),
            screen: machine.getObjectByName(`pantalla${color}`)
        };

        this.original = {};
        this.animation = null;

        // Valores ajustables para la animación.
        this.config = {
            leverAngle: -0.65,
            leverAxis: 'x',
            leverDuration: 0.22,
            buttonDistance: 0.025,
            buttonDuration: 0.10,
            screenColor: 0x168cff,
            screenIntensity: 2.5
        };

        this.leverPivot = null;
        this.buttonOriginalPosition = null;

        this.prepare();
    }

    prepare() {
        const { lever, leverBall, button, screen } = this.parts;

        if (lever) {
            this.original.leverRotation = lever.rotation.clone();
        }

        if (leverBall) {
            this.original.leverBallRotation = leverBall.rotation.clone();
        }

        if (button) {
            this.buttonOriginalPosition = button.position.clone();
        }

        if (screen) {
            this.prepareScreen(screen);
        }
    }

    prepareScreen(screen) {
        this.original.screenMaterials = [];

        const meshes = [];

        if (screen.isMesh) meshes.push(screen);

        screen.traverse?.(object => {
            if (object.isMesh) meshes.push(object);
        });

        for (const mesh of meshes) {
            const originalMaterials = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];

            const clonedMaterials = originalMaterials.map(material => {
                const clone = material.clone();

                this.original.screenMaterials.push({
                    mesh,
                    original: material,
                    clone
                });

                if ('emissive' in clone) {
                    clone.emissive.set(this.config.screenColor);
                    clone.emissiveIntensity = 0;
                }

                return clone;
            });

            mesh.material = Array.isArray(mesh.material)
                ? clonedMaterials
                : clonedMaterials[0];
        }
    }

    setScreenOn(enabled) {
        for (const item of this.original.screenMaterials || []) {
            if ('emissive' in item.clone) {
                item.clone.emissiveIntensity = enabled
                    ? this.config.screenIntensity
                    : 0;
            }
        }
    }

    startLever() {
        if (this.animation) return;

        const lever = this.parts.lever;
        const ball = this.parts.leverBall;

        if (!lever || !ball) {
            console.warn('[SLOTS] No se encontraron las piezas de la palanca.');
            return;
        }

        this.animation = {
            type: 'lever',
            elapsed: 0,
            duration: this.config.leverDuration,
            phase: 'down'
        };
    }

    pressButton() {
        const button = this.parts.button;

        if (!button || this.animation) return;

        this.animation = {
            type: 'button',
            elapsed: 0,
            duration: this.config.buttonDuration,
            phase: 'down'
        };
    }

    update(deltaTime) {
        if (!this.animation) return false;

        const animation = this.animation;
        animation.elapsed += deltaTime;

        const progress = Math.min(
            animation.elapsed / animation.duration,
            1
        );

        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        if (animation.type === 'lever') {
            this.updateLever(eased, animation.phase);
        }

        if (animation.type === 'button') {
            this.updateButton(eased, animation.phase);
        }

        if (progress >= 1) {
            if (animation.phase === 'down') {
                animation.phase = 'up';
                animation.elapsed = 0;
            } else {
                this.resetAnimation(animation.type);
                this.animation = null;
                return true;
            }
        }

        return false;
    }

    updateLever(progress, phase) {
        const angle = -this.config.leverAngle * (
            phase === 'down' ? progress : 1 - progress
        );

        const lever = this.parts.lever;
        const ball = this.parts.leverBall;

        const axis = this.config.leverAxis;

        lever.rotation.copy(this.original.leverRotation);
        ball.rotation.copy(this.original.leverBallRotation);

        lever.rotation[axis] += angle;
        ball.rotation[axis] += angle;
    }

    updateButton(progress, phase) {
        const button = this.parts.button;
        if (!button) return;

        const distance = this.config.buttonDistance;

        const movement = phase === 'down'
            ? distance * progress
            : distance * (1 - progress);

        button.position.copy(this.buttonOriginalPosition);
        button.position.y -= movement;
    }

    resetAnimation(type) {
        if (type === 'lever') {
            this.parts.lever.rotation.copy(this.original.leverRotation);
            this.parts.leverBall.rotation.copy(
                this.original.leverBallRotation
            );
        }

        if (type === 'button') {
            this.parts.button.position.copy(
                this.buttonOriginalPosition
            );
        }
    }

    isAnimating() {
        return this.animation !== null;
    }

    dispose() {
        this.setScreenOn(false);

        for (const item of this.original.screenMaterials || []) {
            item.mesh.material = item.original;
            item.clone.dispose();
        }

        if (this.parts.lever) {
            this.parts.lever.rotation.copy(this.original.leverRotation);
        }

        if (this.parts.leverBall) {
            this.parts.leverBall.rotation.copy(
                this.original.leverBallRotation
            );
        }

        if (this.parts.button) {
            this.parts.button.position.copy(this.buttonOriginalPosition);
        }
    }
}
