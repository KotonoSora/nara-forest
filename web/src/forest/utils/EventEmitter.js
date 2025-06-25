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

export { EventEmitter }; 