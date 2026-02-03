/**
 * GASDBLogger - Provides standardized logging functionality for GAS DB
 * 
 * This class provides different log levels and formats messages consistently
 * across the entire library. Designed to work with Google Apps Script's
 * console logging capabilities.
 */
class JDbLogger {
  
  /**
   * Set the current logging level
   * @param {number} level - The log level from LOG_LEVELS
   */
  static setLevel(level) {
    if (Object.values(JDbLogger.LOG_LEVELS).includes(level)) {
      JDbLogger.currentLevel = level;
    } else {
      throw new Error(`Invalid log level: ${level}`);
    }
  }
  
  /**
   * Set the current logging level by name
   * @param {string} levelName - The log level name (ERROR, WARN, INFO, DEBUG)
   */
  static setLevelByName(levelName) {
    const level = JDbLogger.LOG_LEVELS[levelName.toUpperCase()];
    if (level !== undefined) {
      JDbLogger.currentLevel = level;
    } else {
      throw new Error(`Invalid log level name: ${levelName}`);
    }
  }
  
  /**
   * Get the current logging level
   * @returns {number} The current log level
   */
  static getLevel() {
    return JDbLogger.currentLevel;
  }
  
  /**
   * Get the current logging level name
   * @returns {string} The current log level name
   */
  static getLevelName() {
    for (const [name, level] of Object.entries(JDbLogger.LOG_LEVELS)) {
      if (level === JDbLogger.currentLevel) {
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
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.ERROR) {
      const formatted = JDbLogger.formatMessage('ERROR', message, context);
      console.error(formatted);
    }
  }
  
  /**
   * Log a warning message
   * @param {string} message - The warning message
   * @param {Object} context - Optional context object
   */
  static warn(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.WARN) {
      const formatted = JDbLogger.formatMessage('WARN', message, context);
      console.warn(formatted);
    }
  }
  
  /**
   * Log an info message
   * @param {string} message - The info message
   * @param {Object} context - Optional context object
   */
  static info(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.INFO) {
      const formatted = JDbLogger.formatMessage('INFO', message, context);
      console.log(formatted);
    }
  }
  
  /**
   * Log a debug message
   * @param {string} message - The debug message
   * @param {Object} context - Optional context object
   */
  static debug(message, context = null) {
    if (JDbLogger.currentLevel >= JDbLogger.LOG_LEVELS.DEBUG) {
      const formatted = JDbLogger.formatMessage('DEBUG', message, context);
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
    const levelValue = JDbLogger.LOG_LEVELS[level.toUpperCase()];
    if (levelValue !== undefined && JDbLogger.currentLevel >= levelValue) {
      const formatted = JDbLogger.formatMessage(level.toUpperCase(), message, context);
      
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
      /**
       * Log an error message for this component.
       * @param {string} message - Message to record.
       * @param {Object|null} [context=null] - Optional structured context.
       */
      error: (message, context = null) => {
        JDbLogger.error(`[${component}] ${message}`, context);
      },
      /**
       * Log a warning for this component.
       * @param {string} message - Message to record.
       * @param {Object|null} [context=null] - Optional structured context.
       */
      warn: (message, context = null) => {
        JDbLogger.warn(`[${component}] ${message}`, context);
      },
      /**
       * Log informational details for this component.
       * @param {string} message - Message to record.
       * @param {Object|null} [context=null] - Optional structured context.
       */
      info: (message, context = null) => {
        JDbLogger.info(`[${component}] ${message}`, context);
      },
      /**
       * Log verbose debug details for this component.
       * @param {string} message - Message to record.
       * @param {Object|null} [context=null] - Optional structured context.
       */
      debug: (message, context = null) => {
        JDbLogger.debug(`[${component}] ${message}`, context);
      }
    };
  }
  
  /**
   * Log an operation start
   * @param {string} operation - The operation name
   * @param {Object} context - Optional context object
   */
  static startOperation(operation, context = null) {
    JDbLogger.debug(`Starting operation: ${operation}`, context);
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
    JDbLogger.debug(message, context);
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
    JDbLogger.startOperation(operation, context);
    
    try {
      const result = fn();
      const duration = Date.now() - startTime;
      JDbLogger.endOperation(operation, duration, context);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorContext = Object.assign({}, context, { error: error.message });
      JDbLogger.error(`Operation failed: ${operation} (${duration}ms)`, errorContext);
      throw error;
    }
  }
}

// initialise static properties after class declaration
JDbLogger.LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

JDbLogger.currentLevel = JDbLogger.LOG_LEVELS.DEBUG;
