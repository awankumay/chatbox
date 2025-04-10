// Periksa apakah logger sudah ada, jika belum buat fungsi kosong
const logger = (typeof window.createLogger === 'function') 
  ? window.createLogger('WebLoader') 
  : {
      debug: (...args) => console.debug('[Fallback Logger][DEBUG]', ...args),
      info: (...args) => console.info('[Fallback Logger][INFO]', ...args),
      warn: (...args) => console.warn('[Fallback Logger][WARN]', ...args),
      error: (...args) => console.error('[Fallback Logger][ERROR]', ...args),
    };

export default class Chatbox {
  static init(config) {
    if (!config || !config.baseURL) {
      throw new Error("baseURL is required to initialize the Chatbox.");
    }

    const isEmbed = config.isEmbed || false;
    const secretKey = config.secretKey || null;
    const theme = config.theme || {};

    if (isEmbed && !secretKey) {
      throw new Error("secretKey is required for embed mode.");
    }

    logger.info("Initializing chatbox with config:", {
      isEmbed,
      baseURL: config.baseURL,
      hasSecretKey: !!secretKey,
      theme: Object.keys(theme)
    });

    const assetsLoaded = this.loadAssets(config.baseURL, theme);
    
    assetsLoaded.then(() => {
      logger.info("All assets loaded successfully");
      this.initChatbox(config, isEmbed, secretKey, theme);
    }).catch(error => {
      logger.error("Failed to load assets:", error);
      // Tambahkan pesan kesalahan yang terlihat pada halaman
      const errorDiv = document.createElement('div');
      errorDiv.style.color = 'red';
      errorDiv.style.padding = '10px';
      errorDiv.style.margin = '10px';
      errorDiv.style.border = '1px solid red';
      errorDiv.textContent = `Failed to load assets: ${error.message}`;
      document.body.appendChild(errorDiv);
    });
  }

  static loadAssets(baseURL, theme) {
    return new Promise((resolve, reject) => {
      let assetsToLoad = 2;
      let assetsLoaded = 0;
      
      const assetLoaded = () => {
        assetsLoaded++;
        if (assetsLoaded >= assetsToLoad) {
          resolve();
        }
      };
      
      const boxiconsLink = document.createElement("link");
      boxiconsLink.rel = "stylesheet";
      boxiconsLink.href = "https://unpkg.com/boxicons@2.1.1/css/boxicons.min.css";
      boxiconsLink.onload = assetLoaded;
      boxiconsLink.onerror = reject;
      document.head.appendChild(boxiconsLink);
      
      const chatboxLink = document.createElement("link");
      chatboxLink.rel = "stylesheet";
      chatboxLink.href = `${baseURL}/assets/css/chatbox.css`;
      chatboxLink.onload = assetLoaded;
      chatboxLink.onerror = reject;
      document.head.appendChild(chatboxLink);
      
      if (theme.logoAgent) {
        assetsToLoad++;
        const img = new Image();
        img.onload = assetLoaded;
        img.onerror = () => {
          console.warn("Failed to preload logo image, but continuing...");
          assetLoaded();
        };
        img.src = theme.logoAgent;
      }
      
      if (theme.logoIcon) {
        assetsToLoad++;
        const img = new Image();
        img.onload = assetLoaded;
        img.onerror = () => {
          console.warn("Failed to preload icon image, but continuing...");
          assetLoaded();
        };
        img.src = theme.logoIcon;
      }
    });
  }

  static initChatbox(config, isEmbed, secretKey, theme) {
    // Pertama, muat utilitas logger
    const loadLogger = new Promise((resolve, reject) => {
      // Cek jika logger sudah dimuat
      if (typeof window.createLogger === 'function') {
        resolve();
        return;
      }

      // Jika tidak, muat logger.js
      const loggerScript = document.createElement("script");
      loggerScript.src = `${config.baseURL}/assets/js/utils/logger.js`;
      
      loggerScript.onload = () => {
        logger.info("Logger utility loaded");
        resolve();
      };
      
      loggerScript.onerror = (err) => {
        // Jika logger gagal dimuat, buat fungsi kosong sebagai fallback
        logger.error("Failed to load logger utility", err);
        window.createLogger = (module) => ({
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {}
        });
        resolve(); // Tetap lanjutkan meskipun gagal
      };
      
      document.head.appendChild(loggerScript);
    });

    // Setelah logger dimuat, lanjut muat chatbox.js
    loadLogger.then(() => {
      const script = document.createElement("script");
      script.src = `${config.baseURL}/assets/js/chatbox.js`;

      script.onload = () => {
        if (typeof Chatbot === 'undefined') {
          logger.error("Chatbot class not found after loading chatbox.js");
          const errorDiv = document.createElement('div');
          errorDiv.style.color = 'red';
          errorDiv.style.padding = '10px';
          errorDiv.style.margin = '10px';
          errorDiv.style.border = '1px solid red';
          errorDiv.textContent = "Error: Chatbot class not found after loading chatbox.js";
          document.body.appendChild(errorDiv);
          return;
        }

        try {
          // Ambil conversation_id dari localStorage
          const storagePrefix = isEmbed ? 'embed_chatbox_' : 'native_chatbox_';
          const conversation_id = localStorage.getItem(`${storagePrefix}conversation_id`) || null;
          
          logger.info("Creating Chatbot instance with conversation_id:", conversation_id);
          
          // Daftar origin yang diizinkan untuk mode non-embed
          const allowedOrigins = [];
          
          if (!isEmbed) {
            // Ambil hostname dan port dari baseURL
            const baseUrlObj = new URL(config.baseURL);
            const port = baseUrlObj.port || (baseUrlObj.protocol === 'https:' ? '443' : '80');
            
            // Tambahkan variasi localhost dan IP
            allowedOrigins.push(
              `http://localhost:${port}`,
              `http://127.0.0.1:${port}`,
              baseUrlObj.origin
            );
            
            // Tambahkan origin saat ini jika berbeda
            if (!allowedOrigins.includes(window.location.origin)) {
              allowedOrigins.push(window.location.origin);
            }
            
            logger.info("Allowed origins for non-embed mode:", allowedOrigins);
          }
          
          // Gunakan pendekatan autentikasi yang lebih sederhana
          const tokenAuth = this.generateLocalToken(window.location.origin);
          
          const chatboxConfig = {
            isEmbed,
            baseURL: config.baseURL,
            theme,
            conversation_id,
            allowedOrigins: isEmbed ? [] : allowedOrigins,
            useWebSocket: true,
            fallbackToHTTP: true,
            tokenAuth
          };
          
          // Tambahkan secretKey hanya jika mode embed
          if (isEmbed && secretKey) {
            chatboxConfig.secretKey = secretKey;
          }
          
          // Buat instance chatbox
          const chatbox = new Chatbot(chatboxConfig);
          
          // Simpan instance dalam window untuk debugging
          window._chatboxInstance = chatbox;
          
          logger.info("Chatbox initialized successfully");
        } catch (error) {
          logger.error("Failed to initialize Chatbox:", error);
          // Tambahkan pesan kesalahan yang terlihat pada halaman
          const errorDiv = document.createElement('div');
          errorDiv.style.color = 'red';
          errorDiv.style.padding = '10px';
          errorDiv.style.margin = '10px';
          errorDiv.style.border = '1px solid red';
          errorDiv.textContent = `Error initializing chatbox: ${error.message}`;
          document.body.appendChild(errorDiv);
        }
      };

      script.onerror = (error) => {
        logger.error("Failed to load chatbox.js from:", config.baseURL, error);
        // Tambahkan pesan kesalahan yang terlihat pada halaman
        const errorDiv = document.createElement('div');
        errorDiv.style.color = 'red';
        errorDiv.style.padding = '10px';
        errorDiv.style.margin = '10px';
        errorDiv.style.border = '1px solid red';
        errorDiv.textContent = `Failed to load chatbox.js from: ${config.baseURL}`;
        document.body.appendChild(errorDiv);
      };

      document.head.appendChild(script);
    });
  }
  
  // Fungsi untuk menghasilkan token autentikasi untuk domain lokal
  static generateLocalToken(origin) {
    // Membuat token sederhana berdasarkan origin dan hari ini
    // Token berubah setiap hari
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const tokenData = `${origin}|${today}|local_auth`;
    
    // Base64 encode untuk mendapatkan string token
    const token = btoa(tokenData);
    
    logger.info("Generated local token for authentication");
    return token;
  }
}