import "./styles/app.css";
import "./styles/settings.css";
import "./styles/modal.css";
import { Clock } from "./core/index.js";
import { SettingsUI } from "./ui/index.js";
import { EventHandlers } from "./handlers/index.js";
import { Modal, TriggerButton } from "./ui/index.js";

document.addEventListener("DOMContentLoaded", () => {
  // Create clock with default settings
  const clock = new Clock();

  // Create settings UI
  const settingsUI = new SettingsUI(clock);
  const settingsContent = settingsUI.create();

  // Create modal
  const modal = new Modal();
  modal.setContent(settingsContent);

  // Create trigger button
  const triggerButton = new TriggerButton(() => {
    modal.open();
  });

  // Create event handlers
  const eventHandlers = new EventHandlers(clock, settingsUI, modal);
  eventHandlers.setupClockEvents();
  eventHandlers.setupSettingsEvents();

  // Append clock to DOM
  document.querySelector("#app").appendChild(clock.el);

  // Mount trigger button
  triggerButton.mount();
});
