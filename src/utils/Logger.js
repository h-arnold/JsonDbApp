/**
 * Logger - Provides standardized logging functionality for GAS DB
 * 
 * This class provides different log levels and formats messages consistently
 * across the entire library. Designed to work with Google Apps Script's
 * console logging capabilities.
 */
class Logger {
  
  // Log levels
  static LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  };
  
  // Current log level - can be configured
  static currentLevel = Logger.LOG_LEVELS.INFO;
  
  /**
   * Set the current logging level
   * @param {number} level - The log level from LOG_LEVELS
   */
  static setLevel(level) {
    if (Object.values(Logger.LOG_LEVELS).includes(level)) {
      Logger.currentLevel = level;
    } else {
      throw new Error(`Invalid log level: ${level}`);
    }
  }
  
  /**
   * Set the current logging level by name
   * @param {string} levelName - The log level name (ERROR, WARN, INFO, DEBUG)
   */
  static setLevelByName(levelName) {
    const level = Logger.LOG_LEVELS[levelName.toUpperCase()];
    if (level !== undefined) {
      Logger.currentLevel = level;
    } else {
      throw new Error(`Invalid log level name: ${levelName}`);
    }
  }
  
  /**
   * Get the current logging level
   * @returns {number} The current log level
   */
  static getLevel() {
    return Logger.currentLevel;
  }
  
  /**
   * Get the current logging level name
   * @returns {string} The current log level name
   */
  static getLevelName() {
    for (const [name, level] of Object.entries(Logger.LOG_LEVELS)) {
      if (level === Logger.currentLevel) {
        return name;
      }
    }
    return 'UNKNOWN';
  }
  
  /**
   * Format a log message with timestamp and level
   * @param {string} level - The log level name
   * @param {string} message - The message to log
   * @param {Object} context - Optional context object
   * @returns {string} Formatted log message
   */
  static formatMessage(level, message, context = null) {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level}] ${message}`;
    
    if (context) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }
    
    return formatted;
  }
  
  /**
   * Log an error message
   * @param {string} message - The error message
   * @param {Object} context - Optional context object
   */
  static error(message, context = null) {
    if (Logger.currentLevel >= Logger.LOG_LEVELS.ERROR) {
      const formatted = Logger.formatMessage('ERROR', message, context);
      console.error(formatted);
    }
  }
  
  /**
   * Log a warning message
   * @param {string} message - The warning message
   * @param {Object} context - Optional context object
   */
  static warn(message, context = null) {
    if (Logger.currentLevel >= Logger.LOG_LEVELS.WARN) {
      const formatted = Logger.formatMessage('WARN', message, context);
      console.warn(formatted);
    }
  }
  
  /**
   * Log an info message
   * @param {string} message - The info message
   * @param {Object} context - Optional context object
   */
  static info(message, context = null) {
    if (Logger.currentLevel >= Logger.LOG_LEVELS.INFO) {
      const formatted = Logger.formatMessage('INFO', message, context);
      console.log(formatted);
    }
  }
  
  /**
   * Log a debug message
   * @param {string} message - The debug message
   * @param {Object} context - Optional context object
   */
  static debug(message, context = null) {
    if (Logger.currentLevel >= Logger.LOG_LEVELS.DEBUG) {
      const formatted = Logger.formatMessage('DEBUG', message, context);
      console.log(formatted);
    }
  }
  
  /**
   * Log a message with custom level (for internal use)
   * @param {string} level - The log level name
   * @param {string} message - The message to log
   * @param {Object} context - Optional context object
   */
  static log(level, message, context = null) {
    const levelValue = Logger.LOG_LEVELS[level.toUpperCase()];
    if (levelValue !== undefined && Logger.currentLevel >= levelValue) {
      const formatted = Logger.formatMessage(level.toUpperCase(), message, context);
      
      // Use appropriate console method based on level
      switch (level.toUpperCase()) {
        case 'ERROR':
          console.error(formatted);
          break;
        case 'WARN':
          console.warn(formatted);
          break;
        default:
          console.log(formatted);
      }
    }
  }
  
  /**
   * Create a logger instance for a specific component
   * @param {string} component - The component name
   * @returns {Object} Component-specific logger
   */
  static createComponentLogger(component) {
    return {
      error: (message, context = null) => {
        Logger.error(`[${component}] ${message}`, context);
      },
      warn: (message, context = null) => {
        Logger.warn(`[${component}] ${message}`, context);
      },
      info: (message, context = null) => {
        Logger.info(`[${component}] ${message}`, context);
      },
      debug: (message, context = null) => {
        Logger.debug(`[${component}] ${message}`, context);
      }
    };
  }
  
  /**
   * Log an operation start
   * @param {string} operation - The operation name
   * @param {Object} context - Optional context object
   */
  static startOperation(operation, context = null) {
    Logger.debug(`Starting operation: ${operation}`, context);
  }
  
  /**
   * Log an operation completion
   * @param {string} operation - The operation name
   * @param {number} duration - Optional duration in milliseconds
   * @param {Object} context - Optional context object
   */
  static endOperation(operation, duration = null, context = null) {
    let message = `Completed operation: ${operation}`;
    if (duration !== null) {
      message += ` (${duration}ms)`;
    }
    Logger.debug(message, context);
  }
  
  /**
   * Time an operation and log its duration
   * @param {string} operation - The operation name
   * @param {Function} fn - The function to time
   * @param {Object} context - Optional context object
   * @returns {*} The result of the function
   */
  static timeOperation(operation, fn, context = null) {
    const startTime = Date.now();
    Logger.startOperation(operation, context);
    
    try {
      const result = fn();
      const duration = Date.now() - startTime;
      Logger.endOperation(operation, duration, context);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error(`Operation failed: ${operation} (${duration}ms)`, { ...context, error: error.message });
      throw error;
    }
  }
}
