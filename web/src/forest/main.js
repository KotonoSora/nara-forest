import "./app.css";
import "./settings.css";
import "./modal.css";
import { Clock } from "./clock";
import { SettingsUI } from "./settingsUI";
import { EventHandlers } from "./eventHandlers";
import { Modal } from "./modal";
import { TriggerButton } from "./triggerButton";

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
