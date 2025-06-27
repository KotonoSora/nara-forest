import { getTimeFormatOptions } from "../utils/TimeFormats.js";

export class SettingsUI {
  constructor(clock) {
    this.clock = clock;
    this.settingsDiv = null;
  }

  create() {
    this.settingsDiv = document.createElement("div");
    this.settingsDiv.className = "settings-container";

    this.settingsDiv.appendChild(this.createClockFormatSection());
    this.settingsDiv.appendChild(this.createLabelSection());
    this.settingsDiv.appendChild(this.createCountdownSection());
    this.settingsDiv.appendChild(this.createSaveSection());

    return this.settingsDiv;
  }

  createClockFormatSection() {
    const formatSection = document.createElement("div");
    formatSection.className = "settings-section";

    const timeFormatOptions = getTimeFormatOptions();
    const optionsHtml = timeFormatOptions
      .map(
        (option) => `<option value="${option.value}">${option.label}</option>`,
      )
      .join("");

    formatSection.innerHTML = `
      <h3>Clock Display</h3>
      <div class="settings-row">
        <label class="settings-label">Time Format:</label>
        <select id="timeFormat" class="settings-select">
          ${optionsHtml}
        </select>
      </div>
    `;
    return formatSection;
  }

  createLabelSection() {
    const labelSection = document.createElement("div");
    labelSection.className = "settings-section";
    labelSection.innerHTML = `
      <h3>Labels</h3>
      <div class="settings-row">
        <label class="settings-label">Show Labels:</label>
        <label class="settings-toggle">
          <input type="checkbox" id="showLabels" checked>
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
    return labelSection;
  }

  createCountdownSection() {
    const countdownSection = document.createElement("div");
    countdownSection.className = "settings-section";
    countdownSection.innerHTML = `
      <h3>Timer Mode</h3>
      <div class="settings-row">
        <label class="settings-label">Mode:</label>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" name="timerMode" id="clockMode" value="clock" checked>
            <span class="radio-label">Clock</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="timerMode" id="countdownMode" value="countdown">
            <span class="radio-label">Countdown</span>
          </label>
        </div>
      </div>
      <div class="settings-row countdown-settings" id="countdownSettings" style="display: none;">
        <label class="settings-label">Duration (minutes):</label>
        <input type="number" id="countdownMinutes" class="settings-input" min="1" max="1440" placeholder="Enter minutes" value="5">
      </div>
    `;
    return countdownSection;
  }

  createSaveSection() {
    const saveSection = document.createElement("div");
    saveSection.className = "settings-section save-section";
    saveSection.innerHTML = `
      <div class="settings-row">
        <button id="saveSettingsBtn" class="settings-button primary">Save Settings</button>
        <button id="cancelBtn" class="settings-button secondary">Cancel</button>
      </div>
    `;
    return saveSection;
  }
}
