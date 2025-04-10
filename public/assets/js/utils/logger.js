(function (global) {
  if (typeof global.createLogger === 'function') {
    console.warn('Logger already initialized. Skipping reinitialization.');
    return;
  }

  /**
   * Fungsi untuk membuat logger dengan namespace tertentu.
   * @param {string} namespace - Nama modul atau namespace untuk logger.
   * @returns {object} - Objek logger dengan metode debug, info, warn, dan error.
   */
  global.createLogger = function (namespace) {
    const log = (level, ...args) => {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${namespace}] [${level.toUpperCase()}]`;
      if (console && typeof console[level] === 'function') {
        console[level](prefix, ...args);
      } else if (console && typeof console.log === 'function') {
        console.log(prefix, ...args);
      }
    };

    return {
      debug: (...args) => log('debug', ...args),
      info: (...args) => log('info', ...args),
      warn: (...args) => log('warn', ...args),
      error: (...args) => log('error', ...args),
    };
  };
})(window);
