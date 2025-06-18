#pragma once

#include <string>
#include <vector>
#include <chrono>
#include <functional>
#include <memory>

namespace Pomodoro {

enum class TimerState {
    STOPPED,
    RUNNING,
    PAUSED,
    COMPLETED
};

enum class SessionType {
    WORK,
    SHORT_BREAK,
    LONG_BREAK
};

struct Task {
    int id;
    std::string title;
    std::string description;
    bool completed;
    int estimatedPomodoros;
    int completedPomodoros;
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point completedAt;
};

struct Settings {
    int workDuration = 25 * 60; // 25 minutes in seconds
    int shortBreakDuration = 5 * 60; // 5 minutes in seconds
    int longBreakDuration = 15 * 60; // 15 minutes in seconds
    int longBreakInterval = 4; // Every 4 pomodoros
    bool soundEnabled = true;
    bool notificationsEnabled = true;
    bool autoStartBreaks = false;
    bool autoStartPomodoros = false;
};

struct Statistics {
    int totalPomodoros = 0;
    int totalWorkTime = 0; // in seconds
    int totalBreakTime = 0; // in seconds
    int todayPomodoros = 0;
    int weekPomodoros = 0;
    int monthPomodoros = 0;
    std::chrono::system_clock::time_point lastResetDate;
};

class PomodoroTimer {
private:
    TimerState state_;
    SessionType currentSessionType_;
    int remainingTime_; // in seconds
    int sessionCount_; // number of completed work sessions
    std::chrono::steady_clock::time_point startTime_;
    std::chrono::steady_clock::time_point pauseTime_;
    
    Settings settings_;
    Statistics stats_;
    std::vector<Task> tasks_;
    int currentTaskId_;
    int nextTaskId_;
    
    // Callbacks
    std::function<void(int)> onTick_;
    std::function<void(SessionType)> onSessionComplete_;
    std::function<void(SessionType)> onSessionStart_;
    std::function<void()> onTimerStop_;

public:
    PomodoroTimer();
    ~PomodoroTimer() = default;

    // Timer control
    void start();
    void pause();
    void resume();
    void stop();
    void reset();
    void skip();

    // Timer state
    TimerState getState() const { return state_; }
    SessionType getCurrentSessionType() const { return currentSessionType_; }
    int getRemainingTime() const { return remainingTime_; }
    int getSessionCount() const { return sessionCount_; }
    double getProgress() const;

    // Session management
    void startWorkSession();
    void startShortBreak();
    void startLongBreak();
    bool shouldTakeLongBreak() const;

    // Settings
    const Settings& getSettings() const { return settings_; }
    void updateSettings(const Settings& newSettings);
    void setWorkDuration(int minutes);
    void setShortBreakDuration(int minutes);
    void setLongBreakDuration(int minutes);
    void setLongBreakInterval(int interval);
    void setSoundEnabled(bool enabled);
    void setNotificationsEnabled(bool enabled);
    void setAutoStartBreaks(bool enabled);
    void setAutoStartPomodoros(bool enabled);

    // Statistics
    const Statistics& getStatistics() const { return stats_; }
    void updateStatistics();
    void resetDailyStats();
    void resetWeeklyStats();
    void resetMonthlyStats();
    void resetAllStats();

    // Task management
    int addTask(const std::string& title, const std::string& description = "", int estimatedPomodoros = 1);
    bool removeTask(int taskId);
    bool updateTask(int taskId, const std::string& title, const std::string& description = "", int estimatedPomodoros = 1);
    bool completeTask(int taskId);
    bool setCurrentTask(int taskId);
    const Task* getCurrentTask() const;
    const std::vector<Task>& getTasks() const { return tasks_; }
    std::vector<Task> getActiveTasks() const;
    std::vector<Task> getCompletedTasks() const;

    // Callbacks
    void setOnTick(std::function<void(int)> callback) { onTick_ = callback; }
    void setOnSessionComplete(std::function<void(SessionType)> callback) { onSessionComplete_ = callback; }
    void setOnSessionStart(std::function<void(SessionType)> callback) { onSessionStart_ = callback; }
    void setOnTimerStop(std::function<void()> callback) { onTimerStop_ = callback; }

    // Update method (call regularly to update timer)
    void update();

    // Utility methods
    std::string formatTime(int seconds) const;
    std::string getSessionTypeString(SessionType type) const;
    std::string getStateString(TimerState state) const;

    // Data persistence
    bool saveToFile(const std::string& filename) const;
    bool loadFromFile(const std::string& filename);
    std::string toJson() const;
    bool fromJson(const std::string& json);

    // Task lookup (public for WebAssembly access)
    Task* findTask(int taskId);
    const Task* findTask(int taskId) const;

private:
    void completeCurrentSession();
    void moveToNextSession();
    int getDurationForSessionType(SessionType type) const;
    void updateCurrentTask();
};

} // namespace Pomodoro
