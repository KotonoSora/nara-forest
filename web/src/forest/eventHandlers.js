export class EventHandlers {
  constructor(clock, settingsUI, modal) {
    this.clock = clock;
    this.settingsUI = settingsUI;
    this.modal = modal;
    this.pendingLabelVisibility = null;
  }

  setupClockEvents() {
    this.clock
      .on("restart", () => {
        if (this.pendingLabelVisibility !== null) {
          this.applyLabelVisibility(this.pendingLabelVisibility);
        }
      });
  }

  setupSettingsEvents() {
    document.addEventListener("click", (e) => {
      if (e.target.id === "saveSettingsBtn") {
        this.saveAllSettings();
      }
      if (e.target.id === "cancelBtn") {
        this.modal.close();
      }
    });

    document.addEventListener("change", (e) => {
      if (e.target.name === "timerMode") {
        this.handleTimerModeChange(e.target.value);
      }
    });
  }

  handleTimerModeChange(mode) {
    const countdownSettings = document.getElementById("countdownSettings");
    if (countdownSettings) {
      countdownSettings.style.display = mode === "countdown" ? "flex" : "none";
      countdownSettings.classList.toggle("show", mode === "countdown");
    }
  }

  saveAllSettings() {
    const format = document.getElementById("timeFormat")?.value;
    const showLabels = document.getElementById("showLabels")?.checked;
    const timerMode = document.querySelector('input[name="timerMode"]:checked')?.value;
    const countdownMinutes = parseInt(document.getElementById("countdownMinutes")?.value);

    this.pendingLabelVisibility = showLabels;

    if (format) {
      this.applyTimeFormat(format);
    }

    if (timerMode === "countdown" && countdownMinutes && countdownMinutes > 0) {
      this.startCountdown(countdownMinutes);
    } else {
      this.setClockMode();
    }

    this.modal.close();
  }

  applyTimeFormat(format) {
    const timeUnits = {
      "HH:MM:SS": ["Hours", "Minutes", "Seconds"],
      "MM:SS": ["Minutes", "Seconds"],
      "SS": ["Seconds"]
    };
    
    this.clock.setTimeUnits(timeUnits[format] || ["Hours", "Minutes", "Seconds"]);
  }

  applyLabelVisibility(showLabels) {
    const labels = this.clock.el.querySelectorAll(".flip-clock__slot");
    labels.forEach(label => {
      label.style.display = showLabels ? "block" : "none";
    });
  }

  startCountdown(minutes) {
    const targetTime = new Date();
    targetTime.setMinutes(targetTime.getMinutes() + minutes);
    this.clock.setCountdown(targetTime);
  }

  setClockMode() {
    this.clock.setClockMode();
  }
} 