import { FlipCardTracker } from '~/forest/components/FlipCardTracker.js';

// DOM rendering and manipulation
class DOMRenderer {
  constructor(config = {}) {
    this.config = {
      containerClass: "flip-clock",
      pieceClass: "flip-clock__piece",
      slotClass: "flip-clock__slot",
      cardClass: "flip-clock__card card",
      animationClass: "flip",
      theme: {},
      ...config,
    };

    this.trackers = new Map();
    this.container = this.createContainer();
  }

  createContainer() {
    const container = document.createElement("div");
    container.className = this.config.containerClass;
    this.applyTheme(container);
    return container;
  }

  applyTheme(element) {
    const { theme } = this.config;
    if (theme && typeof theme === "object") {
      Object.entries(theme).forEach(([property, value]) => {
        // Handle both with and without -- prefix
        const cssProperty = property.startsWith("--")
          ? property
          : `--${property}`;
        element.style.setProperty(cssProperty, value);
      });
    }
  }

  createTracker(label, initialValue = 0) {
    if (this.trackers.has(label)) {
      return this.trackers.get(label);
    }

    const tracker = new FlipCardTracker(label, initialValue, this.config);
    this.trackers.set(label, tracker);
    this.container.appendChild(tracker.element);

    return tracker;
  }

  updateTracker(label, value) {
    const tracker = this.trackers.get(label);
    if (tracker) {
      tracker.update(value);
    }
  }

  removeTracker(label) {
    const tracker = this.trackers.get(label);
    if (tracker) {
      tracker.destroy();
      this.container.removeChild(tracker.element);
      this.trackers.delete(label);
    }
  }

  clearTrackers() {
    this.trackers.forEach((tracker) => {
      tracker.destroy();
      if (tracker.element && tracker.element.parentNode) {
        tracker.element.parentNode.removeChild(tracker.element);
      }
    });
    this.trackers.clear();
  }

  destroy() {
    this.trackers.forEach((tracker) => {
      tracker.destroy();
      if (tracker.element && tracker.element.parentNode) {
        tracker.element.parentNode.removeChild(tracker.element);
      }
    });
    this.trackers.clear();
    // Don't remove container from DOM - let the Clock class manage that
  }
}

export { DOMRenderer }; 