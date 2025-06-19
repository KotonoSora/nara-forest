#include "pomodoro_app.h"
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <ctime>

namespace Pomodoro {

// SoundManager Implementation
void SoundManager::playWorkComplete() {
    if (enabled_) {
        // In a real implementation, this would play a work completion sound
        // For WebAssembly, we'll emit an event that JavaScript can handle
    }
}

void SoundManager::playBreakComplete() {
    if (enabled_) {
        // In a real implementation, this would play a break completion sound
        // For WebAssembly, we'll emit an event that JavaScript can handle
    }
}

void SoundManager::playTick() {
    if (enabled_) {
        // In a real implementation, this would play a tick sound
        // For WebAssembly, we'll emit an event that JavaScript can handle
    }
}

void SoundManager::setVolume(float volume) {
    volume_ = std::max(0.0f, std::min(1.0f, volume));
}

void SoundManager::setEnabled(bool enabled) {
    enabled_ = enabled;
}

// NotificationManager Implementation
void NotificationManager::showNotification(const std::string& title, const std::string& message) {
    if (enabled_) {
        // In a real implementation, this would show a system notification
        // For WebAssembly, we'll emit an event that JavaScript can handle
    }
}

void NotificationManager::showSessionComplete(SessionType sessionType) {
    if (!enabled_) return;
    
    std::string title, message;
    
    switch (sessionType) {
        case SessionType::WORK:
            title = "Work Session Complete!";
            message = "Great job! Time for a break.";
            break;
        case SessionType::SHORT_BREAK:
            title = "Break Complete!";
            message = "Ready to get back to work?";
            break;
        case SessionType::LONG_BREAK:
            title = "Long Break Complete!";
            message = "You're refreshed and ready to focus!";
            break;
    }
    
    showNotification(title, message);
}

void NotificationManager::showTaskComplete(const std::string& taskName) {
    if (enabled_) {
        showNotification("Task Complete!", "You've finished: " + taskName);
    }
}

void NotificationManager::setEnabled(bool enabled) {
    enabled_ = enabled;
}

// PomodoroApp Implementation
PomodoroApp::PomodoroApp() 
    : timer_(std::make_unique<PomodoroTimer>())
    , soundManager_(std::make_unique<SoundManager>())
    , notificationManager_(std::make_unique<NotificationManager>())
{
    setupCallbacks();
}

void PomodoroApp::initialize() {
    // Load saved state if available
    loadAppState();
    
    // Initialize managers
    soundManager_->setEnabled(timer_->getSettings().soundEnabled);
    notificationManager_->setEnabled(timer_->getSettings().notificationsEnabled);
}

void PomodoroApp::update() {
    timer_->update();
}

void PomodoroApp::render() {
    // This method would contain UI rendering logic
    // For WebAssembly, the actual rendering is handled by JavaScript
    // This method serves as a placeholder for any C++ side rendering logic
}

void PomodoroApp::cleanup() {
    // Save current state
    saveAppState();
}

void PomodoroApp::startTimer() {
    timer_->start();
}

void PomodoroApp::pauseTimer() {
    timer_->pause();
}

void PomodoroApp::resumeTimer() {
    timer_->resume();
}

void PomodoroApp::stopTimer() {
    timer_->stop();
}

void PomodoroApp::skipSession() {
    timer_->skip();
}

void PomodoroApp::resetTimer() {
    timer_->reset();
}

void PomodoroApp::showAddTaskDialog() {
    showAddTaskDialog_ = true;
    newTaskTitle_.clear();
    newTaskDescription_.clear();
    newTaskEstimatedPomodoros_ = 1;
}

void PomodoroApp::hideAddTaskDialog() {
    showAddTaskDialog_ = false;
}

void PomodoroApp::addTask() {
    if (!newTaskTitle_.empty()) {
        int taskId = timer_->addTask(newTaskTitle_, newTaskDescription_, newTaskEstimatedPomodoros_);
        
        // Auto-select the new task if no task is currently selected
        if (timer_->getCurrentTask() == nullptr) {
            timer_->setCurrentTask(taskId);
        }
        
        hideAddTaskDialog();
    }
}

void PomodoroApp::removeTask(int taskId) {
    timer_->removeTask(taskId);
    if (selectedTaskId_ == taskId) {
        selectedTaskId_ = -1;
    }
}

void PomodoroApp::selectTask(int taskId) {
    selectedTaskId_ = taskId;
    timer_->setCurrentTask(taskId);
}

void PomodoroApp::completeTask(int taskId) {
    const Task* task = timer_->findTask(taskId);
    if (task) {
        notificationManager_->showTaskComplete(task->title);
        timer_->completeTask(taskId);
        autoSelectNextTask();
    }
}

void PomodoroApp::setCurrentView(const std::string& view) {
    if (view == "timer" || view == "tasks" || view == "statistics" || view == "settings") {
        appState_.currentView = view;
    }
}

void PomodoroApp::showSettingsDialog() {
    showSettingsDialog_ = true;
}

void PomodoroApp::hideSettingsDialog() {
    showSettingsDialog_ = false;
}

void PomodoroApp::applySettings() {
    soundManager_->setEnabled(timer_->getSettings().soundEnabled);
    notificationManager_->setEnabled(timer_->getSettings().notificationsEnabled);
    hideSettingsDialog();
}

void PomodoroApp::resetSettings() {
    Settings defaultSettings;
    timer_->updateSettings(defaultSettings);
    applySettings();
}

void PomodoroApp::showStatisticsDialog() {
    showStatisticsDialog_ = true;
}

void PomodoroApp::hideStatisticsDialog() {
    showStatisticsDialog_ = false;
}

void PomodoroApp::exportStatistics() {
    // Export statistics to JSON format
    std::string statsJson = timer_->toJson();
    // In WebAssembly, trigger download or copy to clipboard
}

void PomodoroApp::setTheme(const std::string& theme) {
    appState_.selectedTheme = theme;
}

void PomodoroApp::toggleDarkMode() {
    appState_.isDarkMode = !appState_.isDarkMode;
}

void PomodoroApp::setUIScale(float scale) {
    appState_.uiScale = std::max(0.5f, std::min(2.0f, scale));
}

void PomodoroApp::toggleFullscreen() {
    appState_.isFullscreen = !appState_.isFullscreen;
}

std::string PomodoroApp::toJson() const {
    std::ostringstream json;
    json << "{"
         << "\"appState\":{"
         << "\"currentView\":\"" << appState_.currentView << "\","
         << "\"isFullscreen\":" << (appState_.isFullscreen ? "true" : "false") << ","
         << "\"isDarkMode\":" << (appState_.isDarkMode ? "true" : "false") << ","
         << "\"selectedTheme\":\"" << appState_.selectedTheme << "\","
         << "\"uiScale\":" << appState_.uiScale
         << "},"
         << "\"timerData\":" << timer_->toJson()
         << "}";
    return json.str();
}

bool PomodoroApp::fromJson(const std::string& json) {
    // Simplified JSON parsing - in a real implementation, use a proper JSON library
    return timer_->fromJson(json);
}

bool PomodoroApp::saveAppState(const std::string& filename) {
    return timer_->saveToFile(filename);
}

bool PomodoroApp::loadAppState(const std::string& filename) {
    return timer_->loadFromFile(filename);
}

void PomodoroApp::setupCallbacks() {
    timer_->setOnTick([this](int remainingTime) {
        onTimerTick(remainingTime);
    });
    
    timer_->setOnSessionComplete([this](SessionType sessionType) {
        onSessionComplete(sessionType);
    });
    
    timer_->setOnSessionStart([this](SessionType sessionType) {
        onSessionStart(sessionType);
    });
    
    timer_->setOnTimerStop([this]() {
        onTimerStop();
    });
}

void PomodoroApp::onTimerTick(int remainingTime) {
    // Handle tick events - update UI, play sounds, etc.
    if (remainingTime <= 3 && remainingTime > 0) {
        soundManager_->playTick();
    }
}

void PomodoroApp::onSessionComplete(SessionType sessionType) {
    // Handle session completion
    notificationManager_->showSessionComplete(sessionType);
    
    if (sessionType == SessionType::WORK) {
        soundManager_->playWorkComplete();
    } else {
        soundManager_->playBreakComplete();
    }
}

void PomodoroApp::onSessionStart(SessionType sessionType) {
    // Handle session start
    // Could play a start sound or show a notification
}

void PomodoroApp::onTimerStop() {
    // Handle timer stop
}

void PomodoroApp::autoSelectNextTask() {
    auto activeTasks = timer_->getActiveTasks();
    if (!activeTasks.empty() && timer_->getCurrentTask() == nullptr) {
        timer_->setCurrentTask(activeTasks[0].id);
        selectedTaskId_ = activeTasks[0].id;
    }
}

// Utility Functions
std::string formatDuration(int seconds) {
    int hours = seconds / 3600;
    int minutes = (seconds % 3600) / 60;
    int secs = seconds % 60;
    
    std::ostringstream oss;
    if (hours > 0) {
        oss << hours << "h " << minutes << "m";
    } else {
        oss << std::setfill('0') << std::setw(2) << minutes 
            << ":" << std::setfill('0') << std::setw(2) << secs;
    }
    return oss.str();
}

std::string getCurrentTimeString() {
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto tm = *std::localtime(&time_t);
    
    std::ostringstream oss;
    oss << std::put_time(&tm, "%H:%M:%S");
    return oss.str();
}

std::string getSessionTypeColor(SessionType sessionType) {
    switch (sessionType) {
        case SessionType::WORK: return "#FF6B6B";
        case SessionType::SHORT_BREAK: return "#4ECDC4";
        case SessionType::LONG_BREAK: return "#45B7D1";
        default: return "#888888";
    }
}

std::string getProgressBarColor(SessionType sessionType, double progress) {
    std::string baseColor = getSessionTypeColor(sessionType);
    
    // Add opacity based on progress
    if (progress < 0.25) return baseColor + "40"; // 25% opacity
    else if (progress < 0.5) return baseColor + "60"; // 38% opacity
    else if (progress < 0.75) return baseColor + "80"; // 50% opacity
    else return baseColor + "FF"; // 100% opacity
}

int calculateProductivityScore(const Statistics& stats) {
    // Simple productivity score based on pomodoros completed
    int baseScore = stats.todayPomodoros * 10;
    int weeklyBonus = (stats.weekPomodoros >= 20) ? 50 : 0;
    int monthlyBonus = (stats.monthPomodoros >= 80) ? 100 : 0;
    
    return std::min(1000, baseScore + weeklyBonus + monthlyBonus);
}

std::vector<std::pair<std::string, int>> getWeeklyPomodoroData(const Statistics& stats) {
    std::vector<std::pair<std::string, int>> weekData;
    std::vector<std::string> days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
    
    // Calculate realistic daily distribution based on total week pomodoros
    int remainingPomodoros = stats.weekPomodoros;
    
    for (size_t i = 0; i < days.size(); ++i) {
        int dailyPomodoros = 0;
        
        if (i == days.size() - 1) {
            // Last day gets all remaining pomodoros
            dailyPomodoros = remainingPomodoros;
        } else if (remainingPomodoros > 0) {
            // Distribute pomodoros with some realistic variation
            // Weekdays tend to have more activity than weekends
            int baseAmount = remainingPomodoros / (days.size() - i);
            int variance = 0;
            
            if (i < 5) { // Weekdays (Mon-Fri)
                variance = (baseAmount > 2) ? (rand() % 3) - 1 : 0; // -1 to +1
            } else { // Weekends (Sat-Sun)
                variance = (baseAmount > 1) ? -(rand() % 2) : 0; // 0 to -1 (less activity)
            }
            
            dailyPomodoros = std::max(0, baseAmount + variance);
            remainingPomodoros -= dailyPomodoros;
        }
        
        weekData.emplace_back(days[i], dailyPomodoros);
    }
    
    return weekData;
}

std::vector<std::pair<std::string, int>> getTaskCompletionData(const std::vector<Task>& tasks) {
    std::vector<std::pair<std::string, int>> taskData;
    
    for (const auto& task : tasks) {
        if (task.completedPomodoros > 0) {
            // Truncate long task names for display
            std::string displayName = task.title;
            if (displayName.length() > 25) {
                displayName = displayName.substr(0, 22) + "...";
            }
            
            taskData.emplace_back(displayName, task.completedPomodoros);
        }
    }
    
    // Sort by completed pomodoros (descending)
    std::sort(taskData.begin(), taskData.end(),
        [](const auto& a, const auto& b) { return a.second > b.second; });
    
    // Return top 10 tasks for better visualization
    if (taskData.size() > 10) {
        taskData.resize(10);
    }
    
    // If no tasks have completed pomodoros, return a message
    if (taskData.empty()) {
        taskData.emplace_back("No completed tasks", 0);
    }
    
    return taskData;
}

// Additional utility functions for better data tracking and analytics

std::vector<std::pair<std::string, double>> getProductivityTrends(const Statistics& stats) {
    std::vector<std::pair<std::string, double>> trends;
    
    // Calculate productivity metrics
    double avgPomodorosPerDay = (stats.weekPomodoros > 0) ? static_cast<double>(stats.weekPomodoros) / 7.0 : 0.0;
    double todayVsAverage = (avgPomodorosPerDay > 0) ? static_cast<double>(stats.todayPomodoros) / avgPomodorosPerDay : 0.0;
    
    // Week over month trend (simplified calculation)
    double weeklyProgress = (stats.monthPomodoros > 0) ? static_cast<double>(stats.weekPomodoros) / (stats.monthPomodoros / 4.0) : 1.0;
    
    trends.emplace_back("Daily Average", avgPomodorosPerDay);
    trends.emplace_back("Today vs Average", todayVsAverage);
    trends.emplace_back("Weekly Progress", weeklyProgress);
    
    return trends;
}

std::string getMotivationalMessage(const Statistics& stats) {
    if (stats.todayPomodoros == 0) {
        return "Ready to start your first pomodoro of the day?";
    } else if (stats.todayPomodoros < 4) {
        return "Great start! Keep the momentum going.";
    } else if (stats.todayPomodoros < 8) {
        return "You're on fire today! Excellent focus.";
    } else {
        return "Amazing productivity! You're absolutely crushing it!";
    }
}

std::string getStreakInfo(const Statistics& stats) {
    // This is a simplified streak calculation
    // In a real implementation, you'd track daily data over time
    if (stats.todayPomodoros > 0) {
        int estimatedStreak = std::min(7, stats.weekPomodoros / 4); // Rough estimation
        if (estimatedStreak <= 1) {
            return "Current streak: 1 day";
        } else {
            return "Current streak: " + std::to_string(estimatedStreak) + " days";
        }
    } else {
        return "Start a new streak today!";
    }
}

double calculateFocusEfficiency(const Statistics& stats) {
    // Calculate focus efficiency based on work time vs total time
    int totalTime = stats.totalWorkTime + stats.totalBreakTime;
    if (totalTime == 0) return 0.0;
    
    return static_cast<double>(stats.totalWorkTime) / totalTime * 100.0;
}

std::vector<std::pair<std::string, int>> getSessionTypeBreakdown(const Statistics& stats) {
    std::vector<std::pair<std::string, int>> breakdown;
    
    // Estimate session breakdown based on total times
    // Standard pomodoro: 25min work, 5min short break, 15min long break
    int estimatedWorkSessions = stats.totalWorkTime / (25 * 60); // 25 minutes per session
    int estimatedShortBreaks = stats.totalBreakTime / (5 * 60); // Estimate short breaks
    int estimatedLongBreaks = std::max(0, estimatedWorkSessions / 4); // Long break every 4 sessions
    
    breakdown.emplace_back("Work Sessions", estimatedWorkSessions);
    breakdown.emplace_back("Short Breaks", estimatedShortBreaks);
    breakdown.emplace_back("Long Breaks", estimatedLongBreaks);
    
    return breakdown;
}

} // namespace Pomodoro
