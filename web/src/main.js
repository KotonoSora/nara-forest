// Pomodoro Forest - Main JavaScript Application
// Emscripten WebAssembly Interface

class PomodoroForestApp {
  constructor() {
    this.wasmModule = null;
    this.isInitialized = false;
    this.updateInterval = null;
    this.currentView = "timer";

    // UI Elements
    this.elements = {};

    // State
    this.isDarkMode = localStorage.getItem("darkMode") === "true";
    this.isTimerRunning = false;
    this.isTimerPaused = false; // Explicitly set to false initially
    this.currentTask = null;
    this.wasAutoPaused = false; // Track if timer was auto-paused due to visibility change
    this.lastControlState = null; // Track last control state for reduced logging

    // Initialize the app
    this.init();

    // Fallback: ensure loading screen is hidden after 10 seconds max
    setTimeout(() => {
      if (!this.isInitialized) {
        console.warn("Loading timeout reached, forcing loading screen to hide");
        this.hideLoadingScreen();
        this.showError(
          "Loading took too long. Some features may not work properly."
        );
      }
    }, 10000);
  }

  async init() {
    try {
      console.log("Starting Pomodoro Forest initialization...");

      // Show loading screen explicitly
      this.showLoadingScreen();

      await this.loadWasm();
      console.log("WASM loaded, initializing UI...");
      this.initializeUI();
      console.log("UI initialized, loading timer state...");
      this.loadTimerState();
      console.log("Timer state loaded, setting up event listeners...");
      this.setupEventListeners();
      console.log("Event listeners set up, starting update loop...");
      this.startUpdateLoop();
      console.log("Update loop started, hiding loading screen...");
      this.hideLoadingScreen();
      console.log("Pomodoro Forest initialization complete!");
    } catch (error) {
      console.error("Failed to initialize Pomodoro Forest:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Always hide loading screen and show error, even if WASM fails
      this.hideLoadingScreen();
      this.showError("Failed to load application. Please refresh the page.");

      // Still initialize UI without WASM for basic functionality
      try {
        console.log("Attempting to initialize UI without WASM...");
        this.initializeUI();
        this.setupEventListeners();
        console.log("Basic UI initialized without WASM");
      } catch (uiError) {
        console.error("Failed to initialize even basic UI:", uiError);
      }
    }
  }

  async loadWasm() {
    try {
      console.log("Loading WebAssembly module...");

      // Check if window.loadPomodoroModule exists
      if (typeof window.loadPomodoroModule !== "function") {
        console.error("window.loadPomodoroModule not found");
        throw new Error(
          "Global loadPomodoroModule function not found. Check HTML script injection."
        );
      }

      console.log("Creating WebAssembly module instance...");

      // Add timeout for WASM loading
      const wasmPromise = window.loadPomodoroModule();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("WebAssembly loading timeout")),
          8000
        );
      });

      this.wasmModule = await Promise.race([wasmPromise, timeoutPromise]);

      if (!this.wasmModule) {
        throw new Error("Failed to create WebAssembly module instance");
      }

      console.log("WebAssembly module created, checking functions...");

      // Debug: List all available functions
      console.log("Available WASM functions:");
      Object.keys(this.wasmModule).forEach((key) => {
        if (typeof this.wasmModule[key] === "function") {
          console.log("  - " + key);
        }
      });

      // Check if required functions exist
      const requiredFunctions = ["_initialize", "_update", "_cleanup"];
      const missingFunctions = [];

      for (const func of requiredFunctions) {
        if (typeof this.wasmModule[func] !== "function") {
          missingFunctions.push(func);
        }
      }

      if (missingFunctions.length > 0) {
        console.error(
          `Missing required functions: ${missingFunctions.join(", ")}`
        );
        throw new Error(
          `Missing required functions: ${missingFunctions.join(", ")}`
        );
      }

      // Initialize the C++ application
      console.log("Initializing C++ application...");
      const result = this.wasmModule._initialize();
      console.log("Initialize result:", result);

      if (result === 1) {
        this.isInitialized = true;
        console.log("WebAssembly module loaded and initialized successfully");
      } else {
        throw new Error(
          `Failed to initialize WebAssembly module (result: ${result})`
        );
      }
    } catch (error) {
      console.error("Error loading WebAssembly module:", error);
      throw error;
    }
  }

  initializeUI() {
    // Cache DOM elements
    this.cacheElements();

    // Set initial theme
    this.setTheme(this.isDarkMode ? "dark" : "light");

    // Load saved settings
    this.loadSettings();

    // Update UI with initial state
    this.updateTimerDisplay();
    this.updateTasksList();
    this.updateStatistics();
  }

  cacheElements() {
    // Navigation
    this.elements.navButtons = document.querySelectorAll(".nav-btn");
    this.elements.views = document.querySelectorAll(".view");

    // Timer elements
    this.elements.timerDisplay = document.querySelector(".timer-display");
    this.elements.sessionType = document.querySelector(".session-type");
    this.elements.sessionCount = document.querySelector(".session-count");
    this.elements.progressBar = document.querySelector(".progress-bar");
    this.elements.startBtn = document.querySelector("#start-btn");
    this.elements.pauseBtn = document.querySelector("#pause-btn");
    this.elements.stopBtn = document.querySelector("#stop-btn");
    this.elements.skipBtn = document.querySelector("#skip-btn");
    this.elements.resetBtn = document.querySelector("#reset-btn");
    this.elements.currentTaskDisplay = document.querySelector(".current-task");

    // Task elements
    this.elements.tasksList = document.querySelector(".tasks-list");
    this.elements.addTaskBtn = document.querySelector(".add-task-btn");
    this.elements.selectTaskBtn = document.querySelector(".select-task-btn");
    this.elements.taskModal = document.querySelector(".task-modal");
    this.elements.taskSelectionModal = document.querySelector(
      ".task-selection-modal"
    );
    this.elements.taskTitle = document.querySelector("#taskTitle");
    this.elements.taskDescription = document.querySelector("#taskDescription");
    this.elements.estimatedPomodoros = document.querySelector(
      "#estimatedPomodoros"
    );
    this.elements.saveTaskBtn = document.querySelector(".save-task-btn");
    this.elements.cancelTaskBtn = document.querySelector(".cancel-task-btn");
    this.elements.taskSelectionList = document.querySelector(
      ".task-selection-list"
    );
    this.elements.taskSelectionClose = document.querySelector(
      ".task-selection-close"
    );

    // Tab elements
    this.elements.tabButtons = document.querySelectorAll(".tab-btn");
    this.elements.tabContents = document.querySelectorAll(".tab-content");

    // Statistics elements
    this.elements.totalPomodoros = document.querySelector(".total-pomodoros");
    this.elements.todayPomodoros = document.querySelector(".today-pomodoros");
    this.elements.weekPomodoros = document.querySelector(".week-pomodoros");
    this.elements.monthPomodoros = document.querySelector(".month-pomodoros");
    this.elements.totalWorkTime = document.querySelector(".total-work-time");
    this.elements.totalBreakTime = document.querySelector(".total-break-time");

    // Settings elements
    this.elements.workDuration = document.querySelector("#workDuration");
    this.elements.shortBreakDuration = document.querySelector(
      "#shortBreakDuration"
    );
    this.elements.longBreakDuration =
      document.querySelector("#longBreakDuration");
    this.elements.longBreakInterval =
      document.querySelector("#longBreakInterval");
    this.elements.soundEnabled = document.querySelector("#soundEnabled");
    this.elements.notificationsEnabled = document.querySelector(
      "#notificationsEnabled"
    );
    this.elements.autoStartBreaks = document.querySelector("#autoStartBreaks");
    this.elements.autoStartPomodoros = document.querySelector(
      "#autoStartPomodoros"
    );
    this.elements.saveSettingsBtn =
      document.querySelector(".save-settings-btn");
    this.elements.resetSettingsBtn = document.querySelector(
      ".reset-settings-btn"
    );

    // Theme and modal elements
    this.elements.themeToggle = document.querySelector(".theme-toggle");
    this.elements.modalClose = document.querySelectorAll(".modal-close");
    this.elements.modals = document.querySelectorAll(".modal");
  }

  setupEventListeners() {
    // Navigation
    this.elements.navButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const view = e.currentTarget.dataset.view;
        this.setCurrentView(view);
      });
    });

    // Theme toggle
    if (this.elements.themeToggle) {
      this.elements.themeToggle.addEventListener("click", () => {
        this.toggleDarkMode();
      });
    }

    // Timer controls
    if (this.elements.startBtn) {
      console.log("Setting up start button event listener");
      this.elements.startBtn.addEventListener("click", () => {
        console.log("Start button clicked");
        this.toggleTimer(); // Use toggle instead of always starting
      });
    } else {
      console.error("Start button not found!");
    }

    if (this.elements.pauseBtn) {
      console.log("Setting up pause button event listener");
      this.elements.pauseBtn.addEventListener("click", () => {
        console.log("Pause button clicked");
        this.pauseTimer();
      });
    } else {
      console.error("Pause button not found!");
    }

    if (this.elements.stopBtn) {
      console.log("Setting up stop button event listener");
      this.elements.stopBtn.addEventListener("click", () => {
        console.log("Stop button clicked");
        this.stopTimer();
      });
    } else {
      console.error("Stop button not found!");
    }

    if (this.elements.skipBtn) {
      console.log("Setting up skip button event listener");
      this.elements.skipBtn.addEventListener("click", () => {
        console.log("Skip button clicked");
        this.skipSession();
      });
    } else {
      console.error("Skip button not found!");
    }

    if (this.elements.resetBtn) {
      console.log("Setting up reset button event listener");
      this.elements.resetBtn.addEventListener("click", () => {
        console.log("Reset button clicked");
        this.resetTimer();
      });
    } else {
      console.error("Reset button not found!");
    }

    // Task management
    if (this.elements.addTaskBtn) {
      this.elements.addTaskBtn.addEventListener("click", () =>
        this.showTaskModal()
      );
    }
    if (this.elements.selectTaskBtn) {
      this.elements.selectTaskBtn.addEventListener("click", () =>
        this.showTaskSelectionModal()
      );
    }

    // Task form
    if (this.elements.saveTaskBtn) {
      this.elements.saveTaskBtn.addEventListener("click", () =>
        this.saveTask()
      );
    }
    if (this.elements.cancelTaskBtn) {
      this.elements.cancelTaskBtn.addEventListener("click", () =>
        this.hideTaskModal()
      );
    }

    // Tab navigation
    this.elements.tabButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.setActiveTab(tab);
      });
    });

    // Settings
    if (this.elements.saveSettingsBtn) {
      this.elements.saveSettingsBtn.addEventListener("click", () =>
        this.saveSettings()
      );
    }
    if (this.elements.resetSettingsBtn) {
      this.elements.resetSettingsBtn.addEventListener("click", () =>
        this.resetSettings()
      );
    }

    // Modal close
    this.elements.modalClose.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const modal = e.currentTarget.closest(".modal");
        this.hideModal(modal);
      });
    });

    // Task selection close
    if (this.elements.taskSelectionClose) {
      this.elements.taskSelectionClose.addEventListener("click", () => {
        this.hideTaskSelectionModal();
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Notification permission
    this.requestNotificationPermission();
  }

  handleKeyboardShortcuts(e) {
    // Space bar to start/pause timer
    if (
      e.code === "Space" &&
      this.currentView === "timer" &&
      !e.target.matches("input, textarea")
    ) {
      e.preventDefault();
      this.toggleTimer();
    }

    // Escape to close modals
    if (e.code === "Escape") {
      this.hideAllModals();
    }

    // Number keys for navigation
    if (e.altKey) {
      switch (e.code) {
        case "Digit1":
          this.setCurrentView("timer");
          break;
        case "Digit2":
          this.setCurrentView("tasks");
          break;
        case "Digit3":
          this.setCurrentView("statistics");
          break;
        case "Digit4":
          this.setCurrentView("settings");
          break;
      }
    }
  }

  startUpdateLoop() {
    this.updateInterval = setInterval(() => {
      if (this.isInitialized && this.wasmModule) {
        this.wasmModule._update();
        this.updateTimerDisplay();
        this.updateCurrentTask();
      }
    }, 1000);
  }

  // Timer Methods
  startTimer() {
    console.log("startTimer() called");

    if (!this.wasmModule) {
      console.error("WASM module not available");
      this.showError("WebAssembly module not loaded");
      return;
    }

    // Check if WASM function exists
    if (typeof this.wasmModule._startTimer !== "function") {
      console.error("_startTimer function not found in WASM module");
      this.showError("Timer function not available");
      return;
    }

    try {
      console.log("Starting timer...");
      this.wasmModule._startTimer();
      this.isTimerRunning = true;
      this.isTimerPaused = false; // Clear paused state when starting
      this.updateTimerControls();
      this.showNotification("Timer Started", "Focus time begins!");

      // Save state when timer starts
      this.saveTimerState();
      console.log("Timer started successfully");
    } catch (error) {
      console.error("Error starting timer:", error);
      this.showError("Failed to start timer: " + error.message);
    }
  }

  pauseTimer() {
    console.log("pauseTimer() called");

    if (!this.wasmModule) {
      console.error("WASM module not available");
      this.showError("WebAssembly module not loaded");
      return;
    }

    if (typeof this.wasmModule._pauseTimer !== "function") {
      console.error("_pauseTimer function not found in WASM module");
      this.showError("Pause function not available");
      return;
    }

    try {
      console.log("Pausing timer...");
      this.wasmModule._pauseTimer();
      this.isTimerRunning = false;
      this.isTimerPaused = true; // Set paused state
      this.updateTimerControls();
      this.showToast("Timer paused", "info");

      // Save state when timer pauses
      this.saveTimerState();
      console.log("Timer paused successfully");
    } catch (error) {
      console.error("Error pausing timer:", error);
      this.showError("Failed to pause timer: " + error.message);
    }
  }

  resumeTimer() {
    console.log("resumeTimer() called");

    if (!this.wasmModule) {
      console.error("WASM module not available");
      this.showError("WebAssembly module not loaded");
      return;
    }

    // Check if _resumeTimer is available, fallback to _startTimer
    const resumeFunction =
      this.wasmModule._resumeTimer || this.wasmModule._startTimer;

    if (typeof resumeFunction !== "function") {
      console.error(
        "Neither _resumeTimer nor _startTimer function found in WASM module"
      );
      this.showError("Resume function not available");
      return;
    }

    try {
      console.log(
        "Resuming timer with function:",
        resumeFunction.name || "anonymous"
      );
      resumeFunction();
      this.isTimerRunning = true;
      this.isTimerPaused = false; // Clear paused state when resuming
      this.updateTimerControls();
      this.showToast("Timer resumed", "success");

      // Save state when timer resumes
      this.saveTimerState();
      console.log("Timer resumed successfully");
    } catch (error) {
      console.error("Error resuming timer:", error);
      this.showError("Failed to resume timer: " + error.message);
    }
  }

  stopTimer() {
    console.log("stopTimer() called");

    if (!this.wasmModule) {
      console.error("WASM module not available");
      this.showError("WebAssembly module not loaded");
      return;
    }

    if (typeof this.wasmModule._stopTimer !== "function") {
      console.error("_stopTimer function not found in WASM module");
      this.showError("Stop function not available");
      return;
    }

    try {
      console.log("Stopping timer...");
      this.wasmModule._stopTimer();
      this.isTimerRunning = false;
      this.isTimerPaused = false; // Clear paused state when stopping
      this.updateTimerControls();
      this.showToast("Timer stopped", "warning");

      // Save state when timer stops
      this.saveTimerState();
      console.log("Timer stopped successfully");
    } catch (error) {
      console.error("Error stopping timer:", error);
      this.showError("Failed to stop timer: " + error.message);
    }
  }

  resetTimer() {
    console.log("resetTimer() called");

    if (!this.wasmModule) {
      console.error("WASM module not available");
      this.showError("WebAssembly module not loaded");
      return;
    }

    if (
      this.isTimerRunning &&
      !confirm("Are you sure you want to reset the current session?")
    ) {
      console.log("Timer reset cancelled by user");
      return;
    }

    if (typeof this.wasmModule._resetTimer !== "function") {
      console.error("_resetTimer function not found in WASM module");
      this.showError("Reset function not available");
      return;
    }

    try {
      console.log("Resetting timer...");
      this.wasmModule._resetTimer();
      this.isTimerRunning = false;
      this.isTimerPaused = false; // Clear paused state when resetting
      this.updateTimerControls();
      this.updateTimerDisplay();
      this.showToast("Timer reset", "info");

      // Save state when timer resets
      this.saveTimerState();
      console.log("Timer reset successfully");
    } catch (error) {
      console.error("Error resetting timer:", error);
      this.showError("Failed to reset timer: " + error.message);
    }
  }

  skipSession() {
    console.log("skipSession() called");

    if (!this.wasmModule) {
      console.error("WASM module not available");
      this.showError("WebAssembly module not loaded");
      return;
    }

    if (typeof this.wasmModule._skipSession !== "function") {
      console.error("_skipSession function not found in WASM module");
      this.showError("Skip function not available");
      return;
    }

    try {
      console.log("Skipping session...");
      this.wasmModule._skipSession();
      this.updateTimerDisplay();
      this.showToast("Session skipped", "info");
      console.log("Session skipped successfully");
    } catch (error) {
      console.error("Error skipping session:", error);
      this.showError("Failed to skip session: " + error.message);
    }
  }

  toggleTimer() {
    console.log("toggleTimer() called, current state:", {
      isRunning: this.isTimerRunning,
      isPaused: this.isTimerPaused,
    });

    if (this.isTimerRunning) {
      // Timer is currently running, so pause it
      this.pauseTimer();
    } else {
      // Timer is not running, check if it's paused or stopped
      if (
        this.wasmModule &&
        this.wasmModule._getRemainingTime() > 0 &&
        this.isTimerPaused
      ) {
        // Timer is paused, so resume it
        this.resumeTimer();
      } else {
        // Timer is stopped or at 0, so start it fresh
        this.startTimer();
      }
    }
  }

  updateTimerDisplay() {
    if (!this.wasmModule) return;

    const remainingTime = this.wasmModule._getRemainingTime();
    const sessionType = this.wasmModule._getSessionType();
    const sessionCount = this.wasmModule._getSessionCount();
    const progress = this.wasmModule._getProgress();
    const state = this.wasmModule._getTimerState();

    // Update timer display
    if (this.elements.timerDisplay) {
      this.elements.timerDisplay.textContent = this.formatTime(remainingTime);
    }

    // Update session type
    if (this.elements.sessionType) {
      const sessionTypeText = this.getSessionTypeText(sessionType);
      this.elements.sessionType.textContent = sessionTypeText;
    }

    // Update session count
    if (this.elements.sessionCount) {
      this.elements.sessionCount.textContent = `Session ${sessionCount + 1}`;
    }

    // Update progress bar
    this.updateProgressBar(progress, sessionType);

    // Update timer state
    const newIsTimerRunning = state === 1; // Running state

    // Only update controls if timer state changed
    if (this.isTimerRunning !== newIsTimerRunning) {
      console.log(
        "Timer running state changed:",
        this.isTimerRunning,
        "->",
        newIsTimerRunning
      );
      this.isTimerRunning = newIsTimerRunning;
      this.updateTimerControls();
    } else {
      this.isTimerRunning = newIsTimerRunning;
    }

    // Update page title
    const sessionTypeText = this.getSessionTypeText(sessionType);
    document.title = `${this.formatTime(
      remainingTime
    )} - ${sessionTypeText} | Pomodoro Forest`;
  }

  updateProgressBar(progress, sessionType) {
    if (!this.elements.progressBar) return;

    const circumference = 2 * Math.PI * 140; // radius = 140
    const offset = circumference - progress * circumference;

    this.elements.progressBar.style.strokeDashoffset = offset;

    // Update color based on session type
    const color = this.getSessionColor(sessionType);
    this.elements.progressBar.style.stroke = color;
  }

  updateTimerControls() {
    if (!this.wasmModule) {
      // If no WASM module, show start button only
      if (this.elements.startBtn) {
        this.elements.startBtn.classList.remove("hidden");
        this.elements.startBtn.innerHTML =
          '<span class="btn-icon">▶️</span>Start';
        this.elements.startBtn.title = "Start timer";
      }
      if (this.elements.pauseBtn) {
        this.elements.pauseBtn.classList.add("hidden");
      }
      return;
    }

    const remainingTime = this.wasmModule._getRemainingTime
      ? this.wasmModule._getRemainingTime()
      : 0;

    // Only consider it paused if we explicitly set it as paused AND there's remaining time
    const isPaused = this.isTimerPaused && remainingTime > 0;

    // Create current state for comparison
    const currentState = {
      isRunning: this.isTimerRunning,
      isPaused: isPaused,
      remainingTime: remainingTime,
    };

    // Only log if this is different from last state
    if (
      !this.lastControlState ||
      this.lastControlState.isRunning !== currentState.isRunning ||
      this.lastControlState.isPaused !== currentState.isPaused
    ) {
      console.log("updateTimerControls - state changed:", currentState);
      this.lastControlState = currentState;
    }

    if (this.isTimerRunning) {
      // Timer is running - change start button to pause button functionality
      if (this.elements.startBtn) {
        this.elements.startBtn.classList.remove("hidden");
        this.elements.startBtn.innerHTML =
          '<span class="btn-icon">⏸️</span>Pause';
        this.elements.startBtn.title = "Pause timer";
        this.elements.startBtn.className = "control-btn secondary"; // Change to secondary style
      }
      if (this.elements.pauseBtn) {
        this.elements.pauseBtn.classList.add("hidden");
      }
    } else if (isPaused) {
      // Timer is paused - show resume button
      if (this.elements.startBtn) {
        this.elements.startBtn.classList.remove("hidden");
        this.elements.startBtn.innerHTML =
          '<span class="btn-icon">▶️</span>Resume';
        this.elements.startBtn.title = "Resume timer";
        this.elements.startBtn.className = "control-btn primary"; // Change back to primary style
      }
      if (this.elements.pauseBtn) {
        this.elements.pauseBtn.classList.add("hidden");
      }
    } else {
      // Timer is stopped - show start button
      if (this.elements.startBtn) {
        this.elements.startBtn.classList.remove("hidden");
        this.elements.startBtn.innerHTML =
          '<span class="btn-icon">▶️</span>Start';
        this.elements.startBtn.title = "Start timer";
        this.elements.startBtn.className = "control-btn primary";
      }
      if (this.elements.pauseBtn) {
        this.elements.pauseBtn.classList.add("hidden");
      }
    }
  }

  // Timer state persistence
  saveTimerState() {
    if (!this.wasmModule) return;

    try {
      const timerState = {
        isRunning: this.isTimerRunning,
        isPaused: this.isTimerPaused,
        remainingTime: this.wasmModule._getRemainingTime(),
        sessionType: this.wasmModule._getSessionType(),
        sessionCount: this.wasmModule._getSessionCount(),
        timestamp: Date.now(),
      };

      localStorage.setItem("pomodoroTimerState", JSON.stringify(timerState));
      console.log("Timer state saved:", timerState);
    } catch (error) {
      console.error("Error saving timer state:", error);
    }
  }

  loadTimerState() {
    try {
      const saved = localStorage.getItem("pomodoroTimerState");
      if (saved) {
        const timerState = JSON.parse(saved);
        console.log("Loaded timer state:", timerState);

        // Check if saved state is recent (within 1 hour)
        const timeSinceLastSave = Date.now() - timerState.timestamp;
        if (timeSinceLastSave < 3600000) {
          // 1 hour
          // Restore state if it's recent
          this.isTimerRunning = timerState.isRunning || false;
          this.isTimerPaused = timerState.isPaused || false;
          console.log(
            "Restored timer state - running:",
            this.isTimerRunning,
            "paused:",
            this.isTimerPaused
          );
          this.updateTimerControls();
        } else {
          console.log("Saved timer state is too old, ignoring");
        }
      } else {
        console.log("No saved timer state found");
      }
    } catch (error) {
      console.error("Error loading timer state:", error);
    }
  }

  // Debug method to clear timer state
  clearTimerState() {
    localStorage.removeItem("pomodoroTimerState");
    this.isTimerRunning = false;
    this.isTimerPaused = false;
    this.updateTimerControls();
    console.log("Timer state cleared");
  }

  // Task Methods
  showTaskModal() {
    this.clearTaskForm();
    this.showModal(this.elements.taskModal);
  }

  hideTaskModal() {
    this.hideModal(this.elements.taskModal);
  }

  clearTaskForm() {
    if (this.elements.taskTitle) this.elements.taskTitle.value = "";
    if (this.elements.taskDescription) this.elements.taskDescription.value = "";
    if (this.elements.estimatedPomodoros)
      this.elements.estimatedPomodoros.value = "1";
  }

  saveTask() {
    const title = this.elements.taskTitle?.value?.trim() || "";
    const description = this.elements.taskDescription?.value?.trim() || "";
    const estimatedPomodoros =
      parseInt(this.elements.estimatedPomodoros?.value) || 1;

    if (!title) {
      this.showError("Please enter a task title");
      return;
    }

    if (this.wasmModule) {
      const taskId = this.wasmModule.ccall(
        "addTask",
        "number",
        ["string", "string", "number"],
        [title, description, estimatedPomodoros]
      );

      if (taskId > 0) {
        this.updateTasksList();
        this.hideTaskModal();
        this.showSuccess("Task added successfully");
      }
    }
  }

  removeTask(taskId) {
    if (confirm("Are you sure you want to delete this task?")) {
      if (this.wasmModule) {
        this.wasmModule._removeTask(taskId);
        this.updateTasksList();
        this.updateCurrentTask();
      }
    }
  }

  completeTask(taskId) {
    if (this.wasmModule) {
      this.wasmModule._completeTask(taskId);
      this.updateTasksList();
      this.updateCurrentTask();
      this.updateStatistics();
    }
  }

  selectTask(taskId) {
    if (this.wasmModule) {
      this.wasmModule._setCurrentTask(taskId);
      this.updateCurrentTask();
      this.hideTaskSelectionModal();
    }
  }

  updateTasksList() {
    // This would be implemented to fetch tasks from WebAssembly
    // and render them in the UI
    if (this.elements.tasksList) {
      this.elements.tasksList.innerHTML = `
        <div class="task-item">
          <div class="task-checkbox"></div>
          <div class="task-content">
            <div class="task-title">Sample Task</div>
            <div class="task-description">This is a sample task description</div>
            <div class="task-progress">
              <span>2/4 pomodoros</span>
              <div class="progress-dots">
                <div class="progress-dot completed"></div>
                <div class="progress-dot completed"></div>
                <div class="progress-dot"></div>
                <div class="progress-dot"></div>
              </div>
            </div>
          </div>
          <div class="task-actions">
            <button class="task-action-btn" title="Edit">✏️</button>
            <button class="task-action-btn danger" title="Delete">🗑️</button>
          </div>
        </div>
      `;
    }
  }

  updateCurrentTask() {
    if (!this.wasmModule || !this.elements.currentTaskDisplay) return;

    const currentTaskId = this.wasmModule._getCurrentTaskId();
    if (currentTaskId > 0) {
      this.elements.currentTaskDisplay.innerHTML = `
        <div class="task-name">Current Task</div>
      `;
    } else {
      this.elements.currentTaskDisplay.innerHTML = `
        <span class="no-task">No task selected</span>
      `;
    }
  }

  showTaskSelectionModal() {
    this.updateTaskSelectionList();
    this.showModal(this.elements.taskSelectionModal);
  }

  hideTaskSelectionModal() {
    this.hideModal(this.elements.taskSelectionModal);
  }

  updateTaskSelectionList() {
    // This would be implemented to show available tasks for selection
    if (this.elements.taskSelectionList) {
      this.elements.taskSelectionList.innerHTML = `
        <div class="task-selection-item" data-task-id="1">
          <div class="task-title">Sample Task 1</div>
          <div class="task-description">Description for task 1</div>
        </div>
        <div class="task-selection-item" data-task-id="2">
          <div class="task-title">Sample Task 2</div>
          <div class="task-description">Description for task 2</div>
        </div>
      `;
    }
  }

  // Statistics Methods
  updateStatistics() {
    if (!this.wasmModule) return;

    const totalPomodoros = this.wasmModule._getTotalPomodoros();
    const todayPomodoros = this.wasmModule._getTodayPomodoros();
    const weekPomodoros = this.wasmModule._getWeekPomodoros();
    const monthPomodoros = this.wasmModule._getMonthPomodoros();
    const totalWorkTime = this.wasmModule._getTotalWorkTime();
    const totalBreakTime = this.wasmModule._getTotalBreakTime();

    if (this.elements.totalPomodoros) {
      this.elements.totalPomodoros.textContent = totalPomodoros;
    }
    if (this.elements.todayPomodoros) {
      this.elements.todayPomodoros.textContent = todayPomodoros;
    }
    if (this.elements.weekPomodoros) {
      this.elements.weekPomodoros.textContent = weekPomodoros;
    }
    if (this.elements.monthPomodoros) {
      this.elements.monthPomodoros.textContent = monthPomodoros;
    }
    if (this.elements.totalWorkTime) {
      this.elements.totalWorkTime.textContent =
        this.formatDuration(totalWorkTime);
    }
    if (this.elements.totalBreakTime) {
      this.elements.totalBreakTime.textContent =
        this.formatDuration(totalBreakTime);
    }
  }

  // Settings Methods
  loadSettings() {
    if (!this.wasmModule) return;

    if (this.elements.workDuration) {
      this.elements.workDuration.value = this.wasmModule._getWorkDuration();
    }
    if (this.elements.shortBreakDuration) {
      this.elements.shortBreakDuration.value =
        this.wasmModule._getShortBreakDuration();
    }
    if (this.elements.longBreakDuration) {
      this.elements.longBreakDuration.value =
        this.wasmModule._getLongBreakDuration();
    }
    if (this.elements.longBreakInterval) {
      this.elements.longBreakInterval.value =
        this.wasmModule._getLongBreakInterval();
    }
    if (this.elements.soundEnabled) {
      this.elements.soundEnabled.checked = this.wasmModule._getSoundEnabled();
    }
    if (this.elements.notificationsEnabled) {
      this.elements.notificationsEnabled.checked =
        this.wasmModule._getNotificationsEnabled();
    }
    if (this.elements.autoStartBreaks) {
      this.elements.autoStartBreaks.checked =
        this.wasmModule._getAutoStartBreaks();
    }
    if (this.elements.autoStartPomodoros) {
      this.elements.autoStartPomodoros.checked =
        this.wasmModule._getAutoStartPomodoros();
    }
  }

  saveSettings() {
    if (!this.wasmModule) return;

    const workDuration = parseInt(this.elements.workDuration?.value) || 25;
    const shortBreakDuration =
      parseInt(this.elements.shortBreakDuration?.value) || 5;
    const longBreakDuration =
      parseInt(this.elements.longBreakDuration?.value) || 15;
    const longBreakInterval =
      parseInt(this.elements.longBreakInterval?.value) || 4;
    const soundEnabled = this.elements.soundEnabled?.checked || false;
    const notificationsEnabled =
      this.elements.notificationsEnabled?.checked || false;
    const autoStartBreaks = this.elements.autoStartBreaks?.checked || false;
    const autoStartPomodoros =
      this.elements.autoStartPomodoros?.checked || false;

    this.wasmModule._setWorkDuration(workDuration);
    this.wasmModule._setShortBreakDuration(shortBreakDuration);
    this.wasmModule._setLongBreakDuration(longBreakDuration);
    this.wasmModule._setLongBreakInterval(longBreakInterval);
    this.wasmModule._setSoundEnabled(soundEnabled ? 1 : 0);
    this.wasmModule._setNotificationsEnabled(notificationsEnabled ? 1 : 0);
    this.wasmModule._setAutoStartBreaks(autoStartBreaks ? 1 : 0);
    this.wasmModule._setAutoStartPomodoros(autoStartPomodoros ? 1 : 0);

    // Save state
    this.wasmModule._saveState();

    this.showSuccess("Settings saved successfully");
  }

  resetSettings() {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      if (this.elements.workDuration) this.elements.workDuration.value = "25";
      if (this.elements.shortBreakDuration)
        this.elements.shortBreakDuration.value = "5";
      if (this.elements.longBreakDuration)
        this.elements.longBreakDuration.value = "15";
      if (this.elements.longBreakInterval)
        this.elements.longBreakInterval.value = "4";
      if (this.elements.soundEnabled) this.elements.soundEnabled.checked = true;
      if (this.elements.notificationsEnabled)
        this.elements.notificationsEnabled.checked = true;
      if (this.elements.autoStartBreaks)
        this.elements.autoStartBreaks.checked = false;
      if (this.elements.autoStartPomodoros)
        this.elements.autoStartPomodoros.checked = false;

      this.saveSettings();
    }
  }

  // UI Navigation Methods
  setCurrentView(view) {
    this.currentView = view;

    // Update navigation
    this.elements.navButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });

    // Update views
    this.elements.views.forEach((viewEl) => {
      viewEl.classList.toggle("active", viewEl.id === `${view}View`);
    });

    // Update statistics when switching to stats view
    if (view === "statistics") {
      this.updateStatistics();
    }
  }

  setActiveTab(tab) {
    this.elements.tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    this.elements.tabContents.forEach((content) => {
      content.classList.toggle("active", content.id === `${tab}Tab`);
    });
  }

  // Theme Methods
  setTheme(theme) {
    document.body.className = theme;
    this.isDarkMode = theme === "dark";
    localStorage.setItem("darkMode", this.isDarkMode);
  }

  toggleDarkMode() {
    this.setTheme(this.isDarkMode ? "light" : "dark");
  }

  // Modal Methods
  showModal(modal) {
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  hideModal(modal) {
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  hideAllModals() {
    this.elements.modals.forEach((modal) => {
      this.hideModal(modal);
    });
  }

  // Utility Methods
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  getSessionTypeText(sessionType) {
    switch (sessionType) {
      case 0:
        return "Work";
      case 1:
        return "Short Break";
      case 2:
        return "Long Break";
      default:
        return "Work";
    }
  }

  getSessionColor(sessionType) {
    switch (sessionType) {
      case 0:
        return "#4CAF50"; // Work - Green
      case 1:
        return "#2196F3"; // Short Break - Blue
      case 2:
        return "#FF9800"; // Long Break - Orange
      default:
        return "#4CAF50";
    }
  }

  // Notification Methods
  async requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  showNotification(title, body, icon = "/forest-icon.svg") {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon });
    }
  }

  // Feedback Methods
  showSuccess(message) {
    this.showToast(message, "success");
  }

  showError(message) {
    console.error("Error:", message);
    this.showToast(message, "error");

    // Show error screen for critical errors during initialization
    if (!this.isInitialized) {
      this.showErrorScreen(message);
    }
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => {
      toast.classList.add("show");
    }, 100);

    // Hide toast
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  showLoadingScreen() {
    const loadingScreen = document.querySelector("#loading-screen");
    const app = document.querySelector("#app");

    if (loadingScreen) {
      loadingScreen.classList.remove("hidden");
      loadingScreen.style.opacity = "1";
    }
    if (app) {
      app.classList.add("hidden");
    }
  }

  hideLoadingScreen() {
    console.log("Hiding loading screen...");
    const loadingScreen = document.querySelector("#loading-screen");
    const app = document.querySelector("#app");

    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.classList.add("hidden");
        console.log("Loading screen hidden");
      }, 500);
    }

    if (app) {
      app.classList.remove("hidden");
      console.log("App shown");
    }
  }

  showErrorScreen(message) {
    const errorScreen = document.querySelector("#error-screen");
    const loadingScreen = document.querySelector("#loading-screen");
    const app = document.querySelector("#app");
    const errorMessage = document.querySelector("#error-message");

    // Hide loading screen and app
    if (loadingScreen) {
      loadingScreen.classList.add("hidden");
    }
    if (app) {
      app.classList.add("hidden");
    }

    // Show error screen with message
    if (errorScreen) {
      errorScreen.classList.remove("hidden");
    }
    if (errorMessage && message) {
      errorMessage.textContent = message;
    }
  }

  hideErrorScreen() {
    const errorScreen = document.querySelector("#error-screen");
    if (errorScreen) {
      errorScreen.classList.add("hidden");
    }
  }

  // Cleanup
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    if (this.wasmModule) {
      this.wasmModule._cleanup();
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.pomodoroApp = new PomodoroForestApp();

  // Expose debug methods globally
  window.clearTimerState = () => {
    if (window.pomodoroApp) {
      window.pomodoroApp.clearTimerState();
    }
  };

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    if (window.pomodoroApp) {
      window.pomodoroApp.cleanup();
    }
  });
});

// Handle visibility change to pause/resume timer
document.addEventListener("visibilitychange", () => {
  if (window.pomodoroApp && window.pomodoroApp.isInitialized) {
    console.log("Visibility changed, document.hidden:", document.hidden);

    // Check if timer auto-pause is enabled (we can add this to settings later)
    const autoPauseOnHide = localStorage.getItem("autoPauseOnHide") !== "false"; // Default to true

    if (autoPauseOnHide && window.pomodoroApp.wasmModule) {
      if (document.hidden && window.pomodoroApp.isTimerRunning) {
        // Page is now hidden and timer is running - pause it
        console.log("Page hidden, auto-pausing timer");
        window.pomodoroApp.wasAutoPaused = true;
        window.pomodoroApp.pauseTimer();
        window.pomodoroApp.showToast("Timer auto-paused (tab hidden)", "info");
      } else if (!document.hidden && window.pomodoroApp.wasAutoPaused) {
        // Page is now visible and was auto-paused - resume it
        console.log("Page visible, auto-resuming timer");
        window.pomodoroApp.wasAutoPaused = false;

        // Ask user if they want to resume
        if (
          confirm("Resume the timer that was paused when you switched tabs?")
        ) {
          window.pomodoroApp.resumeTimer();
          window.pomodoroApp.showToast("Timer auto-resumed", "success");
        }
      }
    }
  }
});
