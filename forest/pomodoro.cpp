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
    // Basic JSON parsing implementation
    // In production, use a proper JSON library like nlohmann/json
    
    try {
        // Parse state
        size_t statePos = json.find("\"state\":\"");
        if (statePos != std::string::npos) {
            statePos += 9; // Length of "\"state\":\""
            size_t stateEnd = json.find("\"", statePos);
            if (stateEnd != std::string::npos) {
                std::string stateStr = json.substr(statePos, stateEnd - statePos);
                if (stateStr == "RUNNING") state_ = TimerState::RUNNING;
                else if (stateStr == "PAUSED") state_ = TimerState::PAUSED;
                else if (stateStr == "COMPLETED") state_ = TimerState::COMPLETED;
                else state_ = TimerState::STOPPED;
            }
        }
        
        // Parse sessionType
        size_t sessionPos = json.find("\"sessionType\":\"");
        if (sessionPos != std::string::npos) {
            sessionPos += 15; // Length of "\"sessionType\":\""
            size_t sessionEnd = json.find("\"", sessionPos);
            if (sessionEnd != std::string::npos) {
                std::string sessionStr = json.substr(sessionPos, sessionEnd - sessionPos);
                if (sessionStr == "SHORT_BREAK") currentSessionType_ = SessionType::SHORT_BREAK;
                else if (sessionStr == "LONG_BREAK") currentSessionType_ = SessionType::LONG_BREAK;
                else currentSessionType_ = SessionType::WORK;
            }
        }
        
        // Parse remainingTime
        size_t timePos = json.find("\"remainingTime\":");
        if (timePos != std::string::npos) {
            timePos += 16; // Length of "\"remainingTime\":"
            size_t timeEnd = json.find(",", timePos);
            if (timeEnd != std::string::npos) {
                std::string timeStr = json.substr(timePos, timeEnd - timePos);
                remainingTime_ = std::stoi(timeStr);
            }
        }
        
        // Parse sessionCount
        size_t countPos = json.find("\"sessionCount\":");
        if (countPos != std::string::npos) {
            countPos += 15; // Length of "\"sessionCount\":"
            size_t countEnd = json.find(",", countPos);
            if (countEnd != std::string::npos) {
                std::string countStr = json.substr(countPos, countEnd - countPos);
                sessionCount_ = std::stoi(countStr);
            }
        }
        
        // Parse currentTaskId
        size_t taskIdPos = json.find("\"currentTaskId\":");
        if (taskIdPos != std::string::npos) {
            taskIdPos += 16; // Length of "\"currentTaskId\":"
            size_t taskIdEnd = json.find(",", taskIdPos);
            if (taskIdEnd != std::string::npos) {
                std::string taskIdStr = json.substr(taskIdPos, taskIdEnd - taskIdPos);
                currentTaskId_ = std::stoi(taskIdStr);
            }
        }
        
        // Parse settings
        parseJsonSettings(json);
        
        // Parse statistics
        parseJsonStatistics(json);
        
        // Parse tasks
        parseJsonTasks(json);
        
        return true;
    } catch (const std::exception& e) {
        // If parsing fails, return false
        return false;
    }
}

// Helper functions for JSON parsing
void PomodoroTimer::parseJsonSettings(const std::string& json) {
    size_t settingsPos = json.find("\"settings\":{");
    if (settingsPos == std::string::npos) return;
    
    size_t settingsEnd = json.find("}", settingsPos);
    if (settingsEnd == std::string::npos) return;
    
    std::string settingsJson = json.substr(settingsPos, settingsEnd - settingsPos + 1);
    
    // Parse workDuration
    size_t workPos = settingsJson.find("\"workDuration\":");
    if (workPos != std::string::npos) {
        workPos += 15;
        size_t workEnd = settingsJson.find(",", workPos);
        if (workEnd != std::string::npos) {
            settings_.workDuration = std::stoi(settingsJson.substr(workPos, workEnd - workPos));
        }
    }
    
    // Parse shortBreakDuration
    size_t shortPos = settingsJson.find("\"shortBreakDuration\":");
    if (shortPos != std::string::npos) {
        shortPos += 21;
        size_t shortEnd = settingsJson.find(",", shortPos);
        if (shortEnd != std::string::npos) {
            settings_.shortBreakDuration = std::stoi(settingsJson.substr(shortPos, shortEnd - shortPos));
        }
    }
    
    // Parse longBreakDuration
    size_t longPos = settingsJson.find("\"longBreakDuration\":");
    if (longPos != std::string::npos) {
        longPos += 20;
        size_t longEnd = settingsJson.find(",", longPos);
        if (longEnd != std::string::npos) {
            settings_.longBreakDuration = std::stoi(settingsJson.substr(longPos, longEnd - longPos));
        }
    }
    
    // Parse longBreakInterval
    size_t intervalPos = settingsJson.find("\"longBreakInterval\":");
    if (intervalPos != std::string::npos) {
        intervalPos += 20;
        size_t intervalEnd = settingsJson.find(",", intervalPos);
        if (intervalEnd != std::string::npos) {
            settings_.longBreakInterval = std::stoi(settingsJson.substr(intervalPos, intervalEnd - intervalPos));
        }
    }
    
    // Parse boolean settings
    settings_.soundEnabled = settingsJson.find("\"soundEnabled\":true") != std::string::npos;
    settings_.notificationsEnabled = settingsJson.find("\"notificationsEnabled\":true") != std::string::npos;
    settings_.autoStartBreaks = settingsJson.find("\"autoStartBreaks\":true") != std::string::npos;
    settings_.autoStartPomodoros = settingsJson.find("\"autoStartPomodoros\":true") != std::string::npos;
}

void PomodoroTimer::parseJsonStatistics(const std::string& json) {
    size_t statsPos = json.find("\"statistics\":{");
    if (statsPos == std::string::npos) return;
    
    size_t statsEnd = json.find("}", statsPos);
    if (statsEnd == std::string::npos) return;
    
    std::string statsJson = json.substr(statsPos, statsEnd - statsPos + 1);
    
    // Parse totalPomodoros
    size_t totalPos = statsJson.find("\"totalPomodoros\":");
    if (totalPos != std::string::npos) {
        totalPos += 17;
        size_t totalEnd = statsJson.find(",", totalPos);
        if (totalEnd != std::string::npos) {
            stats_.totalPomodoros = std::stoi(statsJson.substr(totalPos, totalEnd - totalPos));
        }
    }
    
    // Parse totalWorkTime
    size_t workTimePos = statsJson.find("\"totalWorkTime\":");
    if (workTimePos != std::string::npos) {
        workTimePos += 16;
        size_t workTimeEnd = statsJson.find(",", workTimePos);
        if (workTimeEnd != std::string::npos) {
            stats_.totalWorkTime = std::stoi(statsJson.substr(workTimePos, workTimeEnd - workTimePos));
        }
    }
    
    // Parse totalBreakTime
    size_t breakTimePos = statsJson.find("\"totalBreakTime\":");
    if (breakTimePos != std::string::npos) {
        breakTimePos += 17;
        size_t breakTimeEnd = statsJson.find(",", breakTimePos);
        if (breakTimeEnd != std::string::npos) {
            stats_.totalBreakTime = std::stoi(statsJson.substr(breakTimePos, breakTimeEnd - breakTimePos));
        }
    }
    
    // Parse todayPomodoros
    size_t todayPos = statsJson.find("\"todayPomodoros\":");
    if (todayPos != std::string::npos) {
        todayPos += 17;
        size_t todayEnd = statsJson.find(",", todayPos);
        if (todayEnd != std::string::npos) {
            stats_.todayPomodoros = std::stoi(statsJson.substr(todayPos, todayEnd - todayPos));
        }
    }
    
    // Parse weekPomodoros
    size_t weekPos = statsJson.find("\"weekPomodoros\":");
    if (weekPos != std::string::npos) {
        weekPos += 16;
        size_t weekEnd = statsJson.find(",", weekPos);
        if (weekEnd != std::string::npos) {
            stats_.weekPomodoros = std::stoi(statsJson.substr(weekPos, weekEnd - weekPos));
        }
    }
    
    // Parse monthPomodoros
    size_t monthPos = statsJson.find("\"monthPomodoros\":");
    if (monthPos != std::string::npos) {
        monthPos += 17;
        size_t monthEnd = statsJson.find("}", monthPos);
        if (monthEnd == std::string::npos) {
            monthEnd = statsJson.find(",", monthPos);
        }
        if (monthEnd != std::string::npos) {
            stats_.monthPomodoros = std::stoi(statsJson.substr(monthPos, monthEnd - monthPos));
        }
    }
}

void PomodoroTimer::parseJsonTasks(const std::string& json) {
    size_t tasksPos = json.find("\"tasks\":[");
    if (tasksPos == std::string::npos) return;
    
    size_t tasksStart = tasksPos + 9;
    size_t tasksEnd = json.find("]}", tasksStart);
    if (tasksEnd == std::string::npos) return;
    
    std::string tasksJson = json.substr(tasksStart, tasksEnd - tasksStart);
    
    tasks_.clear();
    
    // Parse each task object
    size_t pos = 0;
    while (pos < tasksJson.length()) {
        size_t taskStart = tasksJson.find("{", pos);
        if (taskStart == std::string::npos) break;
        
        size_t taskEnd = tasksJson.find("}", taskStart);
        if (taskEnd == std::string::npos) break;
        
        std::string taskJson = tasksJson.substr(taskStart, taskEnd - taskStart + 1);
        
        Task task;
        
        // Parse task id
        size_t idPos = taskJson.find("\"id\":");
        if (idPos != std::string::npos) {
            idPos += 5;
            size_t idEnd = taskJson.find(",", idPos);
            if (idEnd != std::string::npos) {
                task.id = std::stoi(taskJson.substr(idPos, idEnd - idPos));
            }
        }
        
        // Parse task title
        size_t titlePos = taskJson.find("\"title\":\"");
        if (titlePos != std::string::npos) {
            titlePos += 9;
            size_t titleEnd = taskJson.find("\"", titlePos);
            if (titleEnd != std::string::npos) {
                task.title = taskJson.substr(titlePos, titleEnd - titlePos);
            }
        }
        
        // Parse task description
        size_t descPos = taskJson.find("\"description\":\"");
        if (descPos != std::string::npos) {
            descPos += 15;
            size_t descEnd = taskJson.find("\"", descPos);
            if (descEnd != std::string::npos) {
                task.description = taskJson.substr(descPos, descEnd - descPos);
            }
        }
        
        // Parse completed status
        task.completed = taskJson.find("\"completed\":true") != std::string::npos;
        
        // Parse estimatedPomodoros
        size_t estPos = taskJson.find("\"estimatedPomodoros\":");
        if (estPos != std::string::npos) {
            estPos += 21;
            size_t estEnd = taskJson.find(",", estPos);
            if (estEnd != std::string::npos) {
                task.estimatedPomodoros = std::stoi(taskJson.substr(estPos, estEnd - estPos));
            }
        }
        
        // Parse completedPomodoros
        size_t compPos = taskJson.find("\"completedPomodoros\":");
        if (compPos != std::string::npos) {
            compPos += 21;
            size_t compEnd = taskJson.find("}", compPos);
            if (compEnd == std::string::npos) {
                compEnd = taskJson.find(",", compPos);
            }
            if (compEnd != std::string::npos) {
                task.completedPomodoros = std::stoi(taskJson.substr(compPos, compEnd - compPos));
            }
        }
        
        task.createdAt = std::chrono::system_clock::now();
        tasks_.push_back(task);
        
        // Update nextTaskId to be higher than any loaded task
        if (task.id >= nextTaskId_) {
            nextTaskId_ = task.id + 1;
        }
        
        pos = taskEnd + 1;
    }
}

} // namespace Pomodoro
