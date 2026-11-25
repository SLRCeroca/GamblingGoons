export class UINavigation {
    constructor({ playerNumber, container, onBack }) {
        this.playerNumber = playerNumber;
        this.container = container;
        this.onBack = onBack;

        this.elements = [];
        this.selectedIndex = 0;
        this.editingInput = false;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    refresh() {
        this.elements = Array.from(
            this.container.querySelectorAll(
                'button:not(:disabled), input:not(:disabled)'
            )
        );

        this.selectedIndex = 0;
        this.editingInput = false;

        this.updateSelection();
    }

    updateSelection() {
        this.elements.forEach((element, index) => {
            element.classList.toggle(
                'ui-keyboard-selected',
                index === this.selectedIndex
            );
        });
    }

    move(direction) {
        if (this.elements.length === 0) return;

        const activeElement = document.activeElement;

        if (activeElement?.tagName === 'INPUT') {
            activeElement.blur();
        }

        this.editingInput = false;

        this.selectedIndex =
            (this.selectedIndex + direction + this.elements.length) %
            this.elements.length;

        this.updateSelection();
    }

    confirm() {
        const selected = this.elements[this.selectedIndex];

        if (!selected) return;

        if (selected.tagName === 'INPUT') {
            // Primera confirmación: entrar en el campo para escribir.
            if (!this.editingInput) {
                this.editingInput = true;
                selected.focus();
                selected.select();
                return;
            }

            // Segunda confirmación: salir del campo y avanzar.
            this.editingInput = false;
            selected.blur();
            this.move(1);
            return;
        }

        selected.click();
    }

    handleKeyDown(event) {
        if (!this.container?.isConnected) return;

        const key = event.key.toLowerCase();

        const controls = this.playerNumber === 1
            ? {
                previous: ['w', 'a'],
                next: ['s', 'd'],
                confirm: 'e',
                back: 'q'
            }
            : {
                previous: ['arrowup', 'arrowleft'],
                next: ['arrowdown', 'arrowright'],
                confirm: 'i',
                back: 'o'
            };

        if (controls.previous.includes(key)) {
            event.preventDefault();
            if (!event.repeat) this.move(-1);
            return;
        }

        if (controls.next.includes(key)) {
            event.preventDefault();
            if (!event.repeat) this.move(1);
            return;
        }

        if (key === controls.confirm) {
            event.preventDefault();
            if (!event.repeat) this.confirm();
            return;
        }

        if (key === controls.back) {
            event.preventDefault();
            if (!event.repeat) this.onBack();
        }
    }

    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);

        this.elements.forEach(element => {
            element.classList.remove('ui-keyboard-selected');
        });

        this.elements = [];
    }
}