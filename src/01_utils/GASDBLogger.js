/**
 * GASDBLogger - Provides standardized logging functionality for GAS DB
 * 
 * This class provides different log levels and formats messages consistently
 * across the entire library. Designed to work with Google Apps Script's
 * console logging capabilities.
 */
class GASDBLogger {
  
  /**
   * Set the current logging level
   * @param {number} level - The log level from LOG_LEVELS
   */
  static setLevel(level) {
    if (Object.values(GASDBLogger.LOG_LEVELS).includes(level)) {
      GASDBLogger.currentLevel = level;
    } else {
      throw new Error(`Invalid log level: ${level}`);
    }
  }
  
  /**
   * Set the current logging level by name
   * @param {string} levelName - The log level name (ERROR, WARN, INFO, DEBUG)
   */
  static setLevelByName(levelName) {
    const level = GASDBLogger.LOG_LEVELS[levelName.toUpperCase()];
    if (level !== undefined) {
      GASDBLogger.currentLevel = level;
    } else {
      throw new Error(`Invalid log level name: ${levelName}`);
    }
  }
  
  /**
   * Get the current logging level
   * @returns {number} The current log level
   */
  static getLevel() {
    return GASDBLogger.currentLevel;
  }
  
  /**
   * Get the current logging level name
   * @returns {string} The current log level name
   */
  static getLevelName() {
    for (const [name, level] of Object.entries(GASDBLogger.LOG_LEVELS)) {
      if (level === GASDBLogger.currentLevel) {
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
    if (GASDBLogger.currentLevel >= GASDBLogger.LOG_LEVELS.ERROR) {
      const formatted = GASDBLogger.formatMessage('ERROR', message, context);
      console.error(formatted);
    }
  }
  
  /**
   * Log a warning message
   * @param {string} message - The warning message
   * @param {Object} context - Optional context object
   */
  static warn(message, context = null) {
    if (GASDBLogger.currentLevel >= GASDBLogger.LOG_LEVELS.WARN) {
      const formatted = GASDBLogger.formatMessage('WARN', message, context);
      console.warn(formatted);
    }
  }
  
  /**
   * Log an info message
   * @param {string} message - The info message
   * @param {Object} context - Optional context object
   */
  static info(message, context = null) {
    if (GASDBLogger.currentLevel >= GASDBLogger.LOG_LEVELS.INFO) {
      const formatted = GASDBLogger.formatMessage('INFO', message, context);
      console.log(formatted);
    }
  }
  
  /**
   * Log a debug message
   * @param {string} message - The debug message
   * @param {Object} context - Optional context object
   */
  static debug(message, context = null) {
    if (GASDBLogger.currentLevel >= GASDBLogger.LOG_LEVELS.DEBUG) {
      const formatted = GASDBLogger.formatMessage('DEBUG', message, context);
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
    const levelValue = GASDBLogger.LOG_LEVELS[level.toUpperCase()];
    if (levelValue !== undefined && GASDBLogger.currentLevel >= levelValue) {
      const formatted = GASDBLogger.formatMessage(level.toUpperCase(), message, context);
      
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
        GASDBLogger.error(`[${component}] ${message}`, context);
      },
      warn: (message, context = null) => {
        GASDBLogger.warn(`[${component}] ${message}`, context);
      },
      info: (message, context = null) => {
        GASDBLogger.info(`[${component}] ${message}`, context);
      },
      debug: (message, context = null) => {
        GASDBLogger.debug(`[${component}] ${message}`, context);
      }
    };
  }
  
  /**
   * Log an operation start
   * @param {string} operation - The operation name
   * @param {Object} context - Optional context object
   */
  static startOperation(operation, context = null) {
    GASDBLogger.debug(`Starting operation: ${operation}`, context);
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
    GASDBLogger.debug(message, context);
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
    GASDBLogger.startOperation(operation, context);
    
    try {
      const result = fn();
      const duration = Date.now() - startTime;
      GASDBLogger.endOperation(operation, duration, context);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorContext = Object.assign({}, context, { error: error.message });
      GASDBLogger.error(`Operation failed: ${operation} (${duration}ms)`, errorContext);
      throw error;
    }
  }
}

// initialise static properties after class declaration
GASDBLogger.LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

GASDBLogger.currentLevel = GASDBLogger.LOG_LEVELS.INFO;
