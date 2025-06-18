CXX = em++
CXXFLAGS = -std=c++17 -O2 -s WASM=1 -s MODULARIZE=1 -s EXPORT_ES6=1 \
           -s EXPORT_NAME='createPomodoroModule' \
           -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
           -s EXPORTED_FUNCTIONS='["_malloc", "_free", "_initialize", "_cleanup", \
           "_startTimer", "_pauseTimer", "_resumeTimer", "_stopTimer", "_resetTimer", "_skipSession", \
           "_getRemainingTime", "_getSessionType", "_getTimerState", "_getSessionCount", \
           "_getProgress", "_setWorkDuration", "_setShortBreakDuration", \
           "_setLongBreakDuration", "_setLongBreakInterval", "_setSoundEnabled", \
           "_setNotificationsEnabled", "_setAutoStartBreaks", "_setAutoStartPomodoros", \
           "_getWorkDuration", "_getShortBreakDuration", "_getLongBreakDuration", \
           "_getLongBreakInterval", "_getSoundEnabled", "_getNotificationsEnabled", \
           "_getAutoStartBreaks", "_getAutoStartPomodoros", "_addTask", "_removeTask", \
           "_completeTask", "_setCurrentTask", "_getCurrentTaskId", "_getTotalPomodoros", \
           "_getTodayPomodoros", "_getWeekPomodoros", "_getMonthPomodoros", \
           "_getTotalWorkTime", "_getTotalBreakTime", "_update", "_saveState", "_loadState"]'

SRCDIR = .
SOURCES = pomodoro.cpp pomodoro_app.cpp pomodoro_wasm.cpp
TARGET = pomodoro
OUTPUT_DIR = ../web/public

# Default target
all: $(OUTPUT_DIR)/$(TARGET).js

# Build the WebAssembly module
$(OUTPUT_DIR)/$(TARGET).js: $(SOURCES)
	@mkdir -p $(OUTPUT_DIR)
	$(CXX) $(CXXFLAGS) -o $@ $(SOURCES)

# Clean build artifacts
clean:
	rm -f $(OUTPUT_DIR)/$(TARGET).js
	rm -f $(OUTPUT_DIR)/$(TARGET).wasm

# Development build with debug symbols
debug: CXXFLAGS += -g -s ASSERTIONS=1 -s SAFE_HEAP=1
debug: clean all

# Optimized release build
release: CXXFLAGS += -O3 -DNDEBUG
release: clean all

# Install dependencies (if any)
install:
	@echo "No external dependencies to install"

# Run a simple test
test: all
	@echo "WebAssembly module built successfully"
	@ls -la $(OUTPUT_DIR)/$(TARGET).*

# Watch for changes and rebuild
watch:
	@echo "Watching for changes..."
	@while true; do \
		$(MAKE) -q all || $(MAKE) all; \
		sleep 2; \
	done

# Help target
help:
	@echo "Available targets:"
	@echo "  all      - Build the WebAssembly module (default)"
	@echo "  debug    - Build with debug symbols"
	@echo "  release  - Build optimized release version"
	@echo "  clean    - Remove build artifacts"
	@echo "  test     - Build and test the module"
	@echo "  watch    - Watch for changes and rebuild"
	@echo "  help     - Show this help message"

.PHONY: all clean debug release install test watch help
