// Individual flip card component
class FlipCardTracker {
  constructor(label, initialValue, config = {}) {
    this.label = label;
    this.currentValue = null;
    this.config = config;
    this.element = this.createElement();
    this.bindElements();
    this.update(initialValue);
  }

  createElement() {
    const element = document.createElement("span");
    element.className = this.config.pieceClass;

    element.innerHTML = `
      <b class="${this.config.cardClass}">
        <b class="card__top"></b>
        <b class="card__bottom"></b>
        <b class="card__back">
          <b class="card__bottom"></b>
        </b>
      </b>
      <span class="${this.config.slotClass}">${this.label}</span>
    `;

    return element;
  }

  bindElements() {
    this.elements = {
      top: this.element.querySelector(".card__top"),
      bottom: this.element.querySelector(".card__bottom"),
      back: this.element.querySelector(".card__back"),
      backBottom: this.element.querySelector(".card__back .card__bottom"),
    };
  }

  update(value) {
    const formattedValue = this.formatValue(value);

    if (formattedValue === this.currentValue) {
      return;
    }

    if (this.currentValue !== null) {
      this.animateFlip(formattedValue);
    } else {
      this.setStaticValue(formattedValue);
    }
  }

  formatValue(value) {
    return String(value).padStart(2, "0");
  }

  setStaticValue(value) {
    this.currentValue = value;
    this.elements.top.textContent = value;
    this.elements.bottom.setAttribute("data-value", value);
    this.elements.backBottom.setAttribute("data-value", value);
  }

  animateFlip(newValue) {
    // Set up animation
    this.elements.back.setAttribute("data-value", this.currentValue);
    this.elements.bottom.setAttribute("data-value", this.currentValue);

    this.currentValue = newValue;
    this.elements.top.textContent = newValue;
    this.elements.backBottom.setAttribute("data-value", newValue);

    // Trigger animation
    this.element.classList.remove(this.config.animationClass);
    void this.element.offsetWidth; // Force reflow
    this.element.classList.add(this.config.animationClass);
  }

  destroy() {
    this.element.classList.remove(this.config.animationClass);
  }
}

export { FlipCardTracker };
