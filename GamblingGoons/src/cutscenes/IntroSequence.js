
import { IntroScene } from './IntroScene.js';
import { DialogueBox } from '../ui/DialogueBox.js';

export class IntroSequence {
  constructor(renderer, onComplete) {
    this.renderer = renderer;
    this.onComplete = onComplete;

    this.introScene = new IntroScene();
    this.dialogue = new DialogueBox();

    this.running = false;
    this.frameId = null;

    this.handleResize = () => {
      this.introScene.resize();
      this.renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );
    };
  }

  renderLoop() {
    if (!this.running) return;

    this.renderer.setViewport(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );

    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.render(
      this.introScene.scene,
      this.introScene.camera
    );

    this.frameId = requestAnimationFrame(() => this.renderLoop());
  }

  async run() {
    if (this.running) return;

    this.running = true;

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    this.renderLoop();

    try {
      await this.introScene.load();

      const dialogues = [
        {
          speaker: 'CAPO',
          id: 'boss',
          text: 'Prueba'
        },
      ];

      for (const line of dialogues) {
        this.introScene.setSpeaker(line.id);
        await this.dialogue.say(line.speaker, line.text);
      }
    } catch (error) {
      console.error('Error en la cinemática inicial:', error);
    } finally {
      this.cleanup();
      this.onComplete();
    }
  }

  cleanup() {
    this.running = false;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    window.removeEventListener('resize', this.handleResize);

    this.dialogue.dispose();
    this.introScene.dispose();
  }
}
