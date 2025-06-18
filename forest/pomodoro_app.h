#pragma once

#include "pomodoro.h"
#include <string>
#include <vector>
#include <memory>

namespace Pomodoro {

class SoundManager {
public:
    SoundManager() = default;
    ~SoundManager() = default;

    void playWorkComplete();
    void playBreakComplete();
    void playTick();
    void setVolume(float volume);
    void setEnabled(bool enabled);
    bool isEnabled() const { return enabled_; }

private:
    bool enabled_ = true;
    float volume_ = 1.0f;
};

class NotificationManager {
public:
    NotificationManager() = default;
    ~NotificationManager() = default;

    void showNotification(const std::string& title, const std::string& message);
    void showSessionComplete(SessionType sessionType);
    void showTaskComplete(const std::string& taskName);
    void setEnabled(bool enabled);
    bool isEnabled() const { return enabled_; }

private:
    bool enabled_ = true;
};

struct PomodoroAppState {
    std::string currentView = "timer"; // "timer", "tasks", "statistics", "settings"
    bool isFullscreen = false;
    bool isDarkMode = true;
    std::string selectedTheme = "forest";
    float uiScale = 1.0f;
};

class PomodoroApp {
private:
    std::unique_ptr<PomodoroTimer> timer_;
    std::unique_ptr<SoundManager> soundManager_;
    std::unique_ptr<NotificationManager> notificationManager_;
    PomodoroAppState appState_;
    
    // UI state
    std::string newTaskTitle_;
    std::string newTaskDescription_;
    int newTaskEstimatedPomodoros_ = 1;
    bool showAddTaskDialog_ = false;
    bool showSettingsDialog_ = false;
    bool showStatisticsDialog_ = false;
    int selectedTaskId_ = -1;

public:
    PomodoroApp();
    ~PomodoroApp() = default;

    // App lifecycle
    void initialize();
    void update();
    void render();
    void cleanup();

    // Timer interface
    void startTimer();
    void pauseTimer();
    void resumeTimer(); // Add resume method
    void stopTimer();
    void skipSession();
    void resetTimer();

    // Task management
    void showAddTaskDialog();
    void hideAddTaskDialog();
    void addTask();
    void removeTask(int taskId);
    void selectTask(int taskId);
    void completeTask(int taskId);

    // View management
    void setCurrentView(const std::string& view);
    const std::string& getCurrentView() const { return appState_.currentView; }
    
    // Settings
    void showSettingsDialog();
    void hideSettingsDialog();
    void applySettings();
    void resetSettings();

    // Statistics
    void showStatisticsDialog();
    void hideStatisticsDialog();
    void exportStatistics();

    // Theme and UI
    void setTheme(const std::string& theme);
    void toggleDarkMode();
    void setUIScale(float scale);
    void toggleFullscreen();

    // Getters for UI
    PomodoroTimer* getTimer() const { return timer_.get(); }
    SoundManager* getSoundManager() const { return soundManager_.get(); }
    NotificationManager* getNotificationManager() const { return notificationManager_.get(); }
    const PomodoroAppState& getAppState() const { return appState_; }

    // JSON serialization
    std::string toJson() const;
    bool fromJson(const std::string& json);
    
    // Persistence
    bool saveAppState(const std::string& filename = "pomodoro_state.json");
    bool loadAppState(const std::string& filename = "pomodoro_state.json");

private:
    void setupCallbacks();
    void onTimerTick(int remainingTime);
    void onSessionComplete(SessionType sessionType);
    void onSessionStart(SessionType sessionType);
    void onTimerStop();
    void autoSelectNextTask();
};

// Utility functions for WebAssembly interface
std::string formatDuration(int seconds);
std::string getCurrentTimeString();
std::string getSessionTypeColor(SessionType sessionType);
std::string getProgressBarColor(SessionType sessionType, double progress);
int calculateProductivityScore(const Statistics& stats);
std::vector<std::pair<std::string, int>> getWeeklyPomodoroData(const Statistics& stats);
std::vector<std::pair<std::string, int>> getTaskCompletionData(const std::vector<Task>& tasks);

} // namespace Pomodoro
