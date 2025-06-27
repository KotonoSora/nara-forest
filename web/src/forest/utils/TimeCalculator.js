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

export { TimeCalculator };
