#include "pomodoro_app.h"
#include <emscripten/emscripten.h>
#include <memory>

using namespace Pomodoro;

// Global app instance
static std::unique_ptr<PomodoroApp> g_app;

extern "C" {
    // App lifecycle
    EMSCRIPTEN_KEEPALIVE
    int initialize() {
        try {
            g_app = std::make_unique<PomodoroApp>();
            g_app->initialize();
            return 1; // Success
        } catch (...) {
            return 0; // Error
        }
    }
    
    EMSCRIPTEN_KEEPALIVE
    void cleanup() {
        if (g_app) {
            g_app->cleanup();
            g_app.reset();
        }
    }
    
    EMSCRIPTEN_KEEPALIVE
    void update() {
        if (g_app) {
            g_app->update();
        }
    }
    
    // Timer controls
    EMSCRIPTEN_KEEPALIVE
    void startTimer() {
        if (g_app) g_app->startTimer();
    }
    
    EMSCRIPTEN_KEEPALIVE
    void pauseTimer() {
        if (g_app) g_app->pauseTimer();
    }
    
    EMSCRIPTEN_KEEPALIVE
    void resumeTimer() {
        if (g_app) g_app->resumeTimer();
    }
    
    EMSCRIPTEN_KEEPALIVE
    void stopTimer() {
        if (g_app) g_app->stopTimer();
    }
    
    EMSCRIPTEN_KEEPALIVE
    void resetTimer() {
        if (g_app) g_app->resetTimer();
    }
    
    EMSCRIPTEN_KEEPALIVE
    void skipSession() {
        if (g_app) g_app->skipSession();
    }
    
    // Timer state getters
    EMSCRIPTEN_KEEPALIVE
    int getTimerState() {
        return g_app ? static_cast<int>(g_app->getTimer()->getState()) : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getSessionType() {
        return g_app ? static_cast<int>(g_app->getTimer()->getCurrentSessionType()) : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getRemainingTime() {
        return g_app ? g_app->getTimer()->getRemainingTime() : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getSessionCount() {
        return g_app ? g_app->getTimer()->getSessionCount() : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    double getProgress() {
        return g_app ? g_app->getTimer()->getProgress() : 0.0;
    }
    
    // Settings setters
    EMSCRIPTEN_KEEPALIVE
    void setWorkDuration(int minutes) {
        if (g_app) g_app->getTimer()->setWorkDuration(minutes);
    }
    
    EMSCRIPTEN_KEEPALIVE
    void setShortBreakDuration(int minutes) {
        if (g_app) g_app->getTimer()->setShortBreakDuration(minutes);
    }
    
    EMSCRIPTEN_KEEPALIVE
    void setLongBreakDuration(int minutes) {
        if (g_app) g_app->getTimer()->setLongBreakDuration(minutes);
    }
    
    EMSCRIPTEN_KEEPALIVE
    void setLongBreakInterval(int interval) {
        if (g_app) g_app->getTimer()->setLongBreakInterval(interval);
    }
    
    EMSCRIPTEN_KEEPALIVE
    void setSoundEnabled(int enabled) {
        if (g_app) {
            g_app->getTimer()->setSoundEnabled(enabled != 0);
            g_app->getSoundManager()->setEnabled(enabled != 0);
        }
    }
    
    EMSCRIPTEN_KEEPALIVE
    void setNotificationsEnabled(int enabled) {
        if (g_app) {
            g_app->getTimer()->setNotificationsEnabled(enabled != 0);
            g_app->getNotificationManager()->setEnabled(enabled != 0);
        }
    }
    
    EMSCRIPTEN_KEEPALIVE
    void setAutoStartBreaks(int enabled) {
        if (g_app) g_app->getTimer()->setAutoStartBreaks(enabled != 0);
    }
    
    EMSCRIPTEN_KEEPALIVE
    void setAutoStartPomodoros(int enabled) {
        if (g_app) g_app->getTimer()->setAutoStartPomodoros(enabled != 0);
    }
    
    // Settings getters
    EMSCRIPTEN_KEEPALIVE
    int getWorkDuration() {
        return g_app ? g_app->getTimer()->getSettings().workDuration / 60 : 25;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getShortBreakDuration() {
        return g_app ? g_app->getTimer()->getSettings().shortBreakDuration / 60 : 5;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getLongBreakDuration() {
        return g_app ? g_app->getTimer()->getSettings().longBreakDuration / 60 : 15;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getLongBreakInterval() {
        return g_app ? g_app->getTimer()->getSettings().longBreakInterval : 4;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getSoundEnabled() {
        return g_app ? (g_app->getTimer()->getSettings().soundEnabled ? 1 : 0) : 1;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getNotificationsEnabled() {
        return g_app ? (g_app->getTimer()->getSettings().notificationsEnabled ? 1 : 0) : 1;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getAutoStartBreaks() {
        return g_app ? (g_app->getTimer()->getSettings().autoStartBreaks ? 1 : 0) : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getAutoStartPomodoros() {
        return g_app ? (g_app->getTimer()->getSettings().autoStartPomodoros ? 1 : 0) : 0;
    }
    
    // Task management
    EMSCRIPTEN_KEEPALIVE
    int addTask(const char* title, const char* description, int estimatedPomodoros) {
        if (g_app && title) {
            std::string titleStr(title);
            std::string descStr(description ? description : "");
            return g_app->getTimer()->addTask(titleStr, descStr, estimatedPomodoros);
        }
        return -1;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int removeTask(int taskId) {
        return g_app ? (g_app->getTimer()->removeTask(taskId) ? 1 : 0) : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int completeTask(int taskId) {
        if (g_app) {
            g_app->completeTask(taskId);
            return 1;
        }
        return 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int setCurrentTask(int taskId) {
        return g_app ? (g_app->getTimer()->setCurrentTask(taskId) ? 1 : 0) : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getCurrentTaskId() {
        if (g_app) {
            const Task* task = g_app->getTimer()->getCurrentTask();
            return task ? task->id : -1;
        }
        return -1;
    }
    
    // Statistics
    EMSCRIPTEN_KEEPALIVE
    int getTotalPomodoros() {
        return g_app ? g_app->getTimer()->getStatistics().totalPomodoros : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getTodayPomodoros() {
        return g_app ? g_app->getTimer()->getStatistics().todayPomodoros : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getWeekPomodoros() {
        return g_app ? g_app->getTimer()->getStatistics().weekPomodoros : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getMonthPomodoros() {
        return g_app ? g_app->getTimer()->getStatistics().monthPomodoros : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getTotalWorkTime() {
        return g_app ? g_app->getTimer()->getStatistics().totalWorkTime : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getTotalBreakTime() {
        return g_app ? g_app->getTimer()->getStatistics().totalBreakTime : 0;
    }
    
    // Data persistence
    EMSCRIPTEN_KEEPALIVE
    int saveState() {
        return g_app ? (g_app->saveAppState() ? 1 : 0) : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int loadState() {
        return g_app ? (g_app->loadAppState() ? 1 : 0) : 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getTaskCount() {
        if (g_app) {
            const auto& tasks = g_app->getTimer()->getTasks();
            return static_cast<int>(tasks.size());
        }
        return 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    const char* getTaskTitle(int taskId) {
        if (g_app) {
            const Task* task = g_app->getTimer()->findTask(taskId);
            if (task) {
                static std::string title = task->title;
                return title.c_str();
            }
        }
        return "";
    }
    
    EMSCRIPTEN_KEEPALIVE
    const char* getTaskDescription(int taskId) {
        if (g_app) {
            const Task* task = g_app->getTimer()->findTask(taskId);
            if (task) {
                static std::string description = task->description;
                return description.c_str();
            }
        }
        return "";
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getTaskEstimatedPomodoros(int taskId) {
        if (g_app) {
            const Task* task = g_app->getTimer()->findTask(taskId);
            return task ? task->estimatedPomodoros : 0;
        }
        return 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getTaskCompletedPomodoros(int taskId) {
        if (g_app) {
            const Task* task = g_app->getTimer()->findTask(taskId);
            return task ? task->completedPomodoros : 0;
        }
        return 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int isTaskCompleted(int taskId) {
        if (g_app) {
            const Task* task = g_app->getTimer()->findTask(taskId);
            return task ? (task->completed ? 1 : 0) : 0;
        }
        return 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int getTaskIdByIndex(int index) {
        if (g_app) {
            const auto& tasks = g_app->getTimer()->getTasks();
            if (index >= 0 && index < static_cast<int>(tasks.size())) {
                return tasks[index].id;
            }
        }
        return -1;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int updateTask(int taskId, const char* title, const char* description, int estimatedPomodoros) {
        if (g_app && title) {
            std::string titleStr(title);
            std::string descStr(description ? description : "");
            return g_app->getTimer()->updateTask(taskId, titleStr, descStr, estimatedPomodoros) ? 1 : 0;
        }
        return 0;
    }
}
