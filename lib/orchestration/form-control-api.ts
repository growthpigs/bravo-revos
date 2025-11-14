export interface FillOptions {
  animated?: boolean;
  delay?: number;
}

export class FormControlAPI {
  async fillField(fieldId: string, value: string, options: FillOptions = {}): Promise<void> {
    const element = document.getElementById(fieldId) as HTMLInputElement;
    if (!element) {
      throw new Error(`Field with id '${fieldId}' not found`);
    }

    // Visual typing effect
    if (options.animated) {
      await this.animateTyping(element, value);
    } else {
      element.value = value;
      this.triggerReactChange(element);
    }

    // Visual highlight
    this.highlightField(element);

    // Optional delay after filling
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }
  }

  private animateTyping(element: HTMLInputElement, text: string): Promise<void> {
    element.focus();

    return this.typeCharacter(element, text, 0);
  }

  private typeCharacter(element: HTMLInputElement, text: string, index: number): Promise<void> {
    if (index >= text.length) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      setTimeout(() => {
        element.value = text.slice(0, index + 1);
        this.triggerReactChange(element);
        this.typeCharacter(element, text, index + 1).then(resolve);
      }, 50);
    });
  }

  private triggerReactChange(element: HTMLInputElement | HTMLSelectElement): void {
    // Get React's internal value setter
    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      element.constructor.prototype,
      'value'
    )?.set;

    if (nativeValueSetter) {
      nativeValueSetter.call(element, element.value);
    }

    // Trigger input event for React
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);

    // Also trigger change event for completeness
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);
  }

  private highlightField(element: HTMLElement): void {
    element.classList.add('ai-highlight');
    setTimeout(() => {
      element.classList.remove('ai-highlight');
    }, 2000);
  }

  async clickButton(buttonId: string): Promise<void> {
    const button = document.getElementById(buttonId) as HTMLButtonElement;
    if (!button) {
      throw new Error(`Button with id '${buttonId}' not found`);
    }

    // Visual highlight before click
    this.highlightField(button);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Click
    button.click();
  }

  async selectOption(selectId: string, value: string): Promise<void> {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (!select) {
      throw new Error(`Select with id '${selectId}' not found`);
    }

    select.value = value;
    this.triggerReactChange(select);
    this.highlightField(select);
  }
}
