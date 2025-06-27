import "~/forest/styles/app.css";
import "~/forest/styles/settings.css";
import "~/forest/styles/modal.css";
import "~/forest/styles/buttons.css";
import { Clock } from "~/forest/core/Clock.js";
import { SettingsUI } from "~/forest/ui/SettingsUI.js";
import { EventHandlers } from "~/forest/handlers/EventHandlers.js";
import { Modal } from "~/forest/ui/Modal.js";
import { TriggerButton } from "~/forest/ui/TriggerButton.js";
import { FullscreenButton } from "~/forest/ui/FullscreenButton.js";

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
    settingsUI.initFromConfig();
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

  // Setup fullscreen trigger button
  const fullscreenButton = new FullscreenButton("#app");
  fullscreenButton.mount();
});
