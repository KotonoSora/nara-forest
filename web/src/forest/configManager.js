export class ConfigManager {
  constructor(clock) {
    this.clock = clock;
  }

  validateConfig(config) {
    return config && typeof config === 'object';
  }

  getConfigPreview(config) {
    return this.validateConfig(config) ? 'Custom configuration' : 'Invalid configuration';
  }
} 