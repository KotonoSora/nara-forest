import { EventEmitter } from "~/forest/utils/EventEmitter.js";
import { TimeCalculator } from "~/forest/utils/TimeCalculator.js";
import { DOMRenderer } from "~/forest/components/DOMRenderer.js";
import { AnimationController } from "~/forest/components/AnimationController.js";
import { getTimeUnits } from "~/forest/utils/TimeFormats";

// Main Clock class
class Clock extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      countdown: null,
      mode: "clock",
      updateInterval: 100,
      timeUnits: getTimeUnits("HH:MM"),
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
  get el() {
    return this.renderer.container;
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
