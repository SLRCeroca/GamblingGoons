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
          text: 'ESCUCHAD, TONTAINAS! Teneis faena.'
        },
        {
          speaker: 'CAPO',
          id: 'boss',
          text: 'Nuestra mafia esta sufriendo perdidas... D. Evil Mafia, nuestra competencia estan ganando terreno con su nuevo casino.'
        },
        {
          speaker: 'CAPO',
          id: 'boss',
          text: 'Como Capo dei Capi de D. Good Mafia, os voy a mandar al D. Evil Casino. Os presto un poco de pasta para armas, teneis hasta el domingo para prepararos y atracar al casino.'
        },
        {
          speaker: 'CAPO',
          id: 'boss',
          text: 'Quiero ver resultados la semana que viene y mas os vale darme mas dinero del prestado...'
        },
        {
          speaker: 'GOON 1',
          id: 'goon1',
          text: '(Que ganas de gastarme el dinero en apostar...)'
        },
        {
          speaker: 'GOON 2',
          id: 'goon2',
          text: '(Seguro que el rojo esta pensando en apostar... Yo tambien quiero...)'
        },
        {
          speaker: 'Los Gambling Goons',
          id: 'GamblingGoons',
          text: '(GAMBLIIIIIIIIING!!!!!!!!!)'
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
