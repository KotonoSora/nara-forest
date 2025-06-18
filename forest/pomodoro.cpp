#include "pomodoro.h"
#include <algorithm>
#include <sstream>
#include <iomanip>
#include <fstream>
#include <ctime>

namespace Pomodoro {

PomodoroTimer::PomodoroTimer() 
    : state_(TimerState::STOPPED)
    , currentSessionType_(SessionType::WORK)
    , remainingTime_(25 * 60) // Default 25 minutes
    , sessionCount_(0)
    , currentTaskId_(-1)
    , nextTaskId_(1)
{
    stats_.lastResetDate = std::chrono::system_clock::now();
}

void PomodoroTimer::start() {
    if (state_ == TimerState::STOPPED || state_ == TimerState::COMPLETED) {
        remainingTime_ = getDurationForSessionType(currentSessionType_);
        startTime_ = std::chrono::steady_clock::now();
        state_ = TimerState::RUNNING;
        
        if (onSessionStart_) {
            onSessionStart_(currentSessionType_);
        }
    } else if (state_ == TimerState::PAUSED) {
        resume();
    }
}

void PomodoroTimer::pause() {
    if (state_ == TimerState::RUNNING) {
        pauseTime_ = std::chrono::steady_clock::now();
        state_ = TimerState::PAUSED;
    }
}

void PomodoroTimer::resume() {
    if (state_ == TimerState::PAUSED) {
        auto pauseDuration = std::chrono::steady_clock::now() - pauseTime_;
        startTime_ += pauseDuration;
        state_ = TimerState::RUNNING;
    }
}

void PomodoroTimer::stop() {
    state_ = TimerState::STOPPED;
    remainingTime_ = getDurationForSessionType(currentSessionType_);
    
    if (onTimerStop_) {
        onTimerStop_();
    }
}

void PomodoroTimer::reset() {
    stop();
    sessionCount_ = 0;
    currentSessionType_ = SessionType::WORK;
    remainingTime_ = getDurationForSessionType(currentSessionType_);
}

void PomodoroTimer::skip() {
    if (state_ == TimerState::RUNNING || state_ == TimerState::PAUSED) {
        completeCurrentSession();
        moveToNextSession();
    }
}

double PomodoroTimer::getProgress() const {
    int totalDuration = getDurationForSessionType(currentSessionType_);
    if (totalDuration == 0) return 0.0;
    return 1.0 - (static_cast<double>(remainingTime_) / totalDuration);
}

void PomodoroTimer::startWorkSession() {
    currentSessionType_ = SessionType::WORK;
    remainingTime_ = getDurationForSessionType(currentSessionType_);
    if (state_ != TimerState::RUNNING) {
        state_ = TimerState::STOPPED;
    }
}

void PomodoroTimer::startShortBreak() {
    currentSessionType_ = SessionType::SHORT_BREAK;
    remainingTime_ = getDurationForSessionType(currentSessionType_);
    if (state_ != TimerState::RUNNING) {
        state_ = TimerState::STOPPED;
    }
}

void PomodoroTimer::startLongBreak() {
    currentSessionType_ = SessionType::LONG_BREAK;
    remainingTime_ = getDurationForSessionType(currentSessionType_);
    if (state_ != TimerState::RUNNING) {
        state_ = TimerState::STOPPED;
    }
}

bool PomodoroTimer::shouldTakeLongBreak() const {
    return sessionCount_ > 0 && sessionCount_ % settings_.longBreakInterval == 0;
}

void PomodoroTimer::updateSettings(const Settings& newSettings) {
    settings_ = newSettings;
    
    // Update current session duration if not running
    if (state_ == TimerState::STOPPED) {
        remainingTime_ = getDurationForSessionType(currentSessionType_);
    }
}

void PomodoroTimer::setWorkDuration(int minutes) {
    settings_.workDuration = minutes * 60;
    if (currentSessionType_ == SessionType::WORK && state_ == TimerState::STOPPED) {
        remainingTime_ = settings_.workDuration;
    }
}

void PomodoroTimer::setShortBreakDuration(int minutes) {
    settings_.shortBreakDuration = minutes * 60;
    if (currentSessionType_ == SessionType::SHORT_BREAK && state_ == TimerState::STOPPED) {
        remainingTime_ = settings_.shortBreakDuration;
    }
}

void PomodoroTimer::setLongBreakDuration(int minutes) {
    settings_.longBreakDuration = minutes * 60;
    if (currentSessionType_ == SessionType::LONG_BREAK && state_ == TimerState::STOPPED) {
        remainingTime_ = settings_.longBreakDuration;
    }
}

void PomodoroTimer::setLongBreakInterval(int interval) {
    settings_.longBreakInterval = std::max(1, interval);
}

void PomodoroTimer::setSoundEnabled(bool enabled) {
    settings_.soundEnabled = enabled;
}

void PomodoroTimer::setNotificationsEnabled(bool enabled) {
    settings_.notificationsEnabled = enabled;
}

void PomodoroTimer::setAutoStartBreaks(bool enabled) {
    settings_.autoStartBreaks = enabled;
}

void PomodoroTimer::setAutoStartPomodoros(bool enabled) {
    settings_.autoStartPomodoros = enabled;
}

void PomodoroTimer::updateStatistics() {
    auto now = std::chrono::system_clock::now();
    auto now_time_t = std::chrono::system_clock::to_time_t(now);
    auto reset_time_t = std::chrono::system_clock::to_time_t(stats_.lastResetDate);
    
    // Check if we need to reset daily stats
    std::tm now_tm = *std::localtime(&now_time_t);
    std::tm reset_tm = *std::localtime(&reset_time_t);
    
    if (now_tm.tm_yday != reset_tm.tm_yday || now_tm.tm_year != reset_tm.tm_year) {
        stats_.todayPomodoros = 0;
    }
    
    // Check if we need to reset weekly stats (assuming week starts on Monday)
    int now_week = now_tm.tm_yday / 7;
    int reset_week = reset_tm.tm_yday / 7;
    if (now_week != reset_week || now_tm.tm_year != reset_tm.tm_year) {
        stats_.weekPomodoros = 0;
    }
    
    // Check if we need to reset monthly stats
    if (now_tm.tm_mon != reset_tm.tm_mon || now_tm.tm_year != reset_tm.tm_year) {
        stats_.monthPomodoros = 0;
    }
    
    stats_.lastResetDate = now;
}

void PomodoroTimer::resetDailyStats() {
    stats_.todayPomodoros = 0;
}

void PomodoroTimer::resetWeeklyStats() {
    stats_.weekPomodoros = 0;
}

void PomodoroTimer::resetMonthlyStats() {
    stats_.monthPomodoros = 0;
}

void PomodoroTimer::resetAllStats() {
    stats_ = Statistics{};
    stats_.lastResetDate = std::chrono::system_clock::now();
}

int PomodoroTimer::addTask(const std::string& title, const std::string& description, int estimatedPomodoros) {
    Task task;
    task.id = nextTaskId_++;
    task.title = title;
    task.description = description;
    task.completed = false;
    task.estimatedPomodoros = std::max(1, estimatedPomodoros);
    task.completedPomodoros = 0;
    task.createdAt = std::chrono::system_clock::now();
    
    tasks_.push_back(task);
    return task.id;
}

bool PomodoroTimer::removeTask(int taskId) {
    auto it = std::find_if(tasks_.begin(), tasks_.end(),
        [taskId](const Task& task) { return task.id == taskId; });
    
    if (it != tasks_.end()) {
        if (currentTaskId_ == taskId) {
            currentTaskId_ = -1;
        }
        tasks_.erase(it);
        return true;
    }
    return false;
}

bool PomodoroTimer::updateTask(int taskId, const std::string& title, const std::string& description, int estimatedPomodoros) {
    Task* task = findTask(taskId);
    if (task) {
        task->title = title;
        task->description = description;
        task->estimatedPomodoros = std::max(1, estimatedPomodoros);
        return true;
    }
    return false;
}

bool PomodoroTimer::completeTask(int taskId) {
    Task* task = findTask(taskId);
    if (task && !task->completed) {
        task->completed = true;
        task->completedAt = std::chrono::system_clock::now();
        
        if (currentTaskId_ == taskId) {
            currentTaskId_ = -1;
        }
        return true;
    }
    return false;
}

bool PomodoroTimer::setCurrentTask(int taskId) {
    const Task* task = findTask(taskId);
    if (task && !task->completed) {
        currentTaskId_ = taskId;
        return true;
    }
    return false;
}

const Task* PomodoroTimer::getCurrentTask() const {
    return findTask(currentTaskId_);
}

std::vector<Task> PomodoroTimer::getActiveTasks() const {
    std::vector<Task> activeTasks;
    std::copy_if(tasks_.begin(), tasks_.end(), std::back_inserter(activeTasks),
        [](const Task& task) { return !task.completed; });
    return activeTasks;
}

std::vector<Task> PomodoroTimer::getCompletedTasks() const {
    std::vector<Task> completedTasks;
    std::copy_if(tasks_.begin(), tasks_.end(), std::back_inserter(completedTasks),
        [](const Task& task) { return task.completed; });
    return completedTasks;
}

void PomodoroTimer::update() {
    if (state_ != TimerState::RUNNING) {
        return;
    }
    
    auto now = std::chrono::steady_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - startTime_).count();
    int totalDuration = getDurationForSessionType(currentSessionType_);
    
    remainingTime_ = totalDuration - static_cast<int>(elapsed);
    
    if (remainingTime_ <= 0) {
        remainingTime_ = 0;
        completeCurrentSession();
        moveToNextSession();
    }
    
    if (onTick_) {
        onTick_(remainingTime_);
    }
}

std::string PomodoroTimer::formatTime(int seconds) const {
    int minutes = seconds / 60;
    int secs = seconds % 60;
    
    std::ostringstream oss;
    oss << std::setfill('0') << std::setw(2) << minutes 
        << ":" << std::setfill('0') << std::setw(2) << secs;
    return oss.str();
}

std::string PomodoroTimer::getSessionTypeString(SessionType type) const {
    switch (type) {
        case SessionType::WORK: return "Work";
        case SessionType::SHORT_BREAK: return "Short Break";
        case SessionType::LONG_BREAK: return "Long Break";
        default: return "Unknown";
    }
}

std::string PomodoroTimer::getStateString(TimerState state) const {
    switch (state) {
        case TimerState::STOPPED: return "Stopped";
        case TimerState::RUNNING: return "Running";
        case TimerState::PAUSED: return "Paused";
        case TimerState::COMPLETED: return "Completed";
        default: return "Unknown";
    }
}

void PomodoroTimer::completeCurrentSession() {
    state_ = TimerState::COMPLETED;
    
    if (currentSessionType_ == SessionType::WORK) {
        sessionCount_++;
        stats_.totalPomodoros++;
        stats_.todayPomodoros++;
        stats_.weekPomodoros++;
        stats_.monthPomodoros++;
        stats_.totalWorkTime += getDurationForSessionType(SessionType::WORK);
        
        updateCurrentTask();
    } else {
        stats_.totalBreakTime += getDurationForSessionType(currentSessionType_);
    }
    
    if (onSessionComplete_) {
        onSessionComplete_(currentSessionType_);
    }
    
    updateStatistics();
}

void PomodoroTimer::moveToNextSession() {
    if (currentSessionType_ == SessionType::WORK) {
        if (shouldTakeLongBreak()) {
            currentSessionType_ = SessionType::LONG_BREAK;
        } else {
            currentSessionType_ = SessionType::SHORT_BREAK;
        }
        
        if (settings_.autoStartBreaks) {
            start();
        } else {
            state_ = TimerState::STOPPED;
            remainingTime_ = getDurationForSessionType(currentSessionType_);
        }
    } else {
        currentSessionType_ = SessionType::WORK;
        
        if (settings_.autoStartPomodoros) {
            start();
        } else {
            state_ = TimerState::STOPPED;
            remainingTime_ = getDurationForSessionType(currentSessionType_);
        }
    }
    
    if (onSessionStart_) {
        onSessionStart_(currentSessionType_);
    }
}

int PomodoroTimer::getDurationForSessionType(SessionType type) const {
    switch (type) {
        case SessionType::WORK: return settings_.workDuration;
        case SessionType::SHORT_BREAK: return settings_.shortBreakDuration;
        case SessionType::LONG_BREAK: return settings_.longBreakDuration;
        default: return settings_.workDuration;
    }
}

void PomodoroTimer::updateCurrentTask() {
    Task* task = findTask(currentTaskId_);
    if (task && !task->completed) {
        task->completedPomodoros++;
        
        // Auto-complete task if we've reached the estimated pomodoros
        if (task->completedPomodoros >= task->estimatedPomodoros) {
            completeTask(task->id);
        }
    }
}

Task* PomodoroTimer::findTask(int taskId) {
    auto it = std::find_if(tasks_.begin(), tasks_.end(),
        [taskId](const Task& task) { return task.id == taskId; });
    return (it != tasks_.end()) ? &(*it) : nullptr;
}

const Task* PomodoroTimer::findTask(int taskId) const {
    auto it = std::find_if(tasks_.begin(), tasks_.end(),
        [taskId](const Task& task) { return task.id == taskId; });
    return (it != tasks_.end()) ? &(*it) : nullptr;
}

std::string PomodoroTimer::toJson() const {
    std::ostringstream json;
    json << "{"
         << "\"state\":\"" << getStateString(state_) << "\","
         << "\"sessionType\":\"" << getSessionTypeString(currentSessionType_) << "\","
         << "\"remainingTime\":" << remainingTime_ << ","
         << "\"sessionCount\":" << sessionCount_ << ","
         << "\"currentTaskId\":" << currentTaskId_ << ","
         << "\"settings\":{"
         << "\"workDuration\":" << settings_.workDuration << ","
         << "\"shortBreakDuration\":" << settings_.shortBreakDuration << ","
         << "\"longBreakDuration\":" << settings_.longBreakDuration << ","
         << "\"longBreakInterval\":" << settings_.longBreakInterval << ","
         << "\"soundEnabled\":" << (settings_.soundEnabled ? "true" : "false") << ","
         << "\"notificationsEnabled\":" << (settings_.notificationsEnabled ? "true" : "false") << ","
         << "\"autoStartBreaks\":" << (settings_.autoStartBreaks ? "true" : "false") << ","
         << "\"autoStartPomodoros\":" << (settings_.autoStartPomodoros ? "true" : "false")
         << "},"
         << "\"statistics\":{"
         << "\"totalPomodoros\":" << stats_.totalPomodoros << ","
         << "\"totalWorkTime\":" << stats_.totalWorkTime << ","
         << "\"totalBreakTime\":" << stats_.totalBreakTime << ","
         << "\"todayPomodoros\":" << stats_.todayPomodoros << ","
         << "\"weekPomodoros\":" << stats_.weekPomodoros << ","
         << "\"monthPomodoros\":" << stats_.monthPomodoros
         << "},"
         << "\"tasks\":[";
    
    for (size_t i = 0; i < tasks_.size(); ++i) {
        const auto& task = tasks_[i];
        if (i > 0) json << ",";
        json << "{"
             << "\"id\":" << task.id << ","
             << "\"title\":\"" << task.title << "\","
             << "\"description\":\"" << task.description << "\","
             << "\"completed\":" << (task.completed ? "true" : "false") << ","
             << "\"estimatedPomodoros\":" << task.estimatedPomodoros << ","
             << "\"completedPomodoros\":" << task.completedPomodoros
             << "}";
    }
    
    json << "]}";
    return json.str();
}

bool PomodoroTimer::saveToFile(const std::string& filename) const {
    std::ofstream file(filename);
    if (!file.is_open()) {
        return false;
    }
    
    file << toJson();
    return file.good();
}

bool PomodoroTimer::loadFromFile(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        return false;
    }
    
    std::string json((std::istreambuf_iterator<char>(file)),
                     std::istreambuf_iterator<char>());
    
    return fromJson(json);
}

bool PomodoroTimer::fromJson(const std::string& json) {
    // This is a simplified JSON parser - in a real implementation,
    // you'd want to use a proper JSON library like nlohmann/json
    // For now, this serves as a placeholder
    return true;
}

} // namespace Pomodoro
