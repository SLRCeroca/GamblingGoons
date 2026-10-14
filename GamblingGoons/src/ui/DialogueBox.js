
export class DialogueBox {
  constructor() {
    this.container = document.getElementById('intro-dialogue');
    this.speakerElement = document.getElementById('dialogue-speaker');
    this.textElement = document.getElementById('dialogue-text');

    if (!this.container || !this.speakerElement || !this.textElement) {
      throw new Error(
        'Falta el HTML de la caja de diálogo de la cinemática.'
      );
    }

    this.visible = false;
    this.typing = false;
    this.currentText = '';
    this.charIndex = 0;
    this.timer = null;
    this.resolveDialogue = null;

    this.handleAdvance = (event) => {
      if (!this.visible) return;

      if (
        event.type === 'keydown' &&
        event.code !== 'Space' &&
        event.code !== 'Enter'
      ) {
        return;
      }

      if (event.type === 'keydown') {
        event.preventDefault();
      }

      if (this.typing) {
        this.revealAll();
      } else if (this.resolveDialogue) {
        const resolve = this.resolveDialogue;
        this.resolveDialogue = null;
        resolve();
      }
    };

    this.container.addEventListener('click', this.handleAdvance);
    window.addEventListener('keydown', this.handleAdvance);
  }

  show() {
    this.visible = true;
    this.container.classList.remove('dialogue-hidden');
  }

  hide() {
    this.visible = false;
    this.container.classList.add('dialogue-hidden');
    clearInterval(this.timer);
    this.typing = false;
  }

  revealAll() {
    clearInterval(this.timer);
    this.textElement.textContent = this.currentText;
    this.charIndex = this.currentText.length;
    this.typing = false;
  }

  say(speaker, text) {
    this.show();

    this.speakerElement.textContent = speaker;
    this.textElement.textContent = '';

    this.currentText = text;
    this.charIndex = 0;
    this.typing = true;

    clearInterval(this.timer);

    return new Promise((resolve) => {
      this.resolveDialogue = resolve;

      this.timer = setInterval(() => {
        this.charIndex++;

        this.textElement.textContent =
          this.currentText.slice(0, this.charIndex);

        if (this.charIndex >= this.currentText.length) {
          clearInterval(this.timer);
          this.typing = false;
        }
      }, 28);
    });
  }

  dispose() {
    this.hide();

    this.container.removeEventListener('click', this.handleAdvance);
    window.removeEventListener('keydown', this.handleAdvance);

    this.resolveDialogue = null;
  }
}
