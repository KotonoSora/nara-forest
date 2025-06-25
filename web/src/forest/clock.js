// Event emitter for handling clock events
class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
    return this;
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach((callback) => callback(data));
    }
    return this;
  }

  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    return this;
  }
}

// Time calculation logic
class TimeCalculator {
  constructor(config = {}) {
    this.config = {
      updateInterval: 100,
      timeUnits: ["Days", "Hours", "Minutes", "Seconds"],
      format24Hour: true,
      includeMilliseconds: false,
      ...config,
    };
  }

  getTimeRemaining(endtime) {
    const now = Date.now();
    const target =
      typeof endtime === "string" ? Date.parse(endtime) : endtime.getTime();
    const diff = target - now;

    const result = { Total: diff };

    if (diff <= 0) {
      this.config.timeUnits.forEach((unit) => (result[unit] = 0));
      return result;
    }

    const calculations = {
      Days: () => Math.floor(diff / (1000 * 60 * 60 * 24)),
      Hours: () => Math.floor((diff / (1000 * 60 * 60)) % 24),
      Minutes: () => Math.floor((diff / (1000 * 60)) % 60),
      Seconds: () => Math.floor((diff / 1000) % 60),
      Milliseconds: () => Math.floor(diff % 1000),
    };

    this.config.timeUnits.forEach((unit) => {
      if (calculations[unit]) {
        result[unit] = calculations[unit]();
      }
    });

    return result;
  }

  getCurrentTime() {
    const now = new Date();
    const result = { Total: now };

    const calculations = {
      Days: () => now.getDate(),
      Hours: () =>
        this.config.format24Hour ? now.getHours() : now.getHours() % 12 || 12,
      Minutes: () => now.getMinutes(),
      Seconds: () => now.getSeconds(),
      Milliseconds: () => now.getMilliseconds(),
    };

    this.config.timeUnits.forEach((unit) => {
      if (calculations[unit]) {
        result[unit] = calculations[unit]();
      }
    });

    return result;
  }
}

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

// Animation control
class AnimationController {
  constructor(config = {}) {
    this.config = {
      updateInterval: 100,
      throttleUpdates: true,
      ...config,
    };

    this.isRunning = false;
    this.animationId = null;
    this.lastUpdateTime = 0;
  }

  start(updateCallback) {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.updateCallback = updateCallback;
    this.animate();
  }

  animate() {
    if (!this.isRunning) {
      return;
    }

    this.animationId = requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;

    if (
      !this.config.throttleUpdates ||
      timeSinceLastUpdate >= this.config.updateInterval
    ) {
      this.lastUpdateTime = now;
      if (this.updateCallback) {
        this.updateCallback();
      }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  setUpdateInterval(interval) {
    this.config.updateInterval = interval;
  }
}

// Main Clock class
class Clock extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      countdown: null,
      mode: "clock",
      updateInterval: 100,
      timeUnits: ["Hours", "Minutes", "Seconds"],
      format24Hour: true,
      theme: {},
      ...config,
    };

    this.initializeComponents();
    this.setupClock();
  }

  initializeComponents() {
    this.timeCalculator = new TimeCalculator({
      timeUnits: this.config.timeUnits,
      format24Hour: this.config.format24Hour,
    });

    this.renderer = new DOMRenderer({
      theme: this.config.theme,
    });

    this.animationController = new AnimationController({
      updateInterval: this.config.updateInterval,
    });
  }

  setupClock() {
    // Create trackers for each time unit
    this.config.timeUnits.forEach((unit) => {
      this.renderer.createTracker(unit, 0);
    });

    // Determine update function based on mode
    const updateFn = this.config.countdown
      ? () => this.timeCalculator.getTimeRemaining(this.config.countdown)
      : () => this.timeCalculator.getCurrentTime();

    // Start animation loop
    this.animationController.start(() => {
      const timeData = updateFn();

      // Check for countdown completion
      if (this.config.countdown && timeData.Total <= 0) {
        this.handleCountdownComplete();
        return;
      }

      // Update display
      this.updateDisplay(timeData);
      this.emit("update", timeData);
    });

    // Initial update
    const initialTime = updateFn();
    this.updateDisplay(initialTime);
  }

  updateDisplay(timeData) {
    this.config.timeUnits.forEach((unit) => {
      if (timeData[unit] !== undefined) {
        this.renderer.updateTracker(unit, timeData[unit]);
      }
    });
  }

  handleCountdownComplete() {
    this.animationController.stop();

    // Set all trackers to 0
    this.config.timeUnits.forEach((unit) => {
      this.renderer.updateTracker(unit, 0);
    });

    this.emit("complete");
  }

  // Public API methods
  get element() {
    return this.renderer.container;
  }

  get el() {
    return this.element;
  }

  setCountdown(targetDate) {
    this.config.countdown = targetDate;
    this.config.mode = "countdown";
    this.restart();
    return this;
  }

  setClockMode() {
    this.config.countdown = null;
    this.config.mode = "clock";
    this.restart();
    return this;
  }

  setUpdateInterval(interval) {
    this.config.updateInterval = interval;
    this.animationController.setUpdateInterval(interval);
    return this;
  }

  setTheme(theme) {
    this.config.theme = { ...this.config.theme, ...theme };
    this.renderer.config.theme = this.config.theme;
    this.renderer.applyTheme(this.renderer.container);
    this.emit("themeChanged", this.config.theme);
    return this;
  }

  setTimeUnits(units) {
    this.config.timeUnits = units;
    this.restart();
    return this;
  }

  restart() {
    this.animationController.stop();
    this.renderer.clearTrackers();

    this.timeCalculator = new TimeCalculator({
      timeUnits: this.config.timeUnits,
      format24Hour: this.config.format24Hour,
    });

    this.animationController = new AnimationController({
      updateInterval: this.config.updateInterval,
    });

    this.setupClock();
    this.emit("restart");
    return this;
  }

  destroy() {
    this.animationController.stop();
    this.renderer.destroy();
    this.events.clear();

    if (this.renderer.container.parentNode) {
      this.renderer.container.parentNode.removeChild(this.renderer.container);
    }
  }
}

export { Clock };
