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

export { AnimationController };
