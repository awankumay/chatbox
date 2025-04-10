// Helper function to sanitize input to prevent XSS
function sanitizeHTML(input) {
  if (typeof input !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Utility function for creating DOM elements with attributes
function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'style') {
      Object.assign(element.style, value);
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, value);
    } else {
      element[key] = value;
    }
  });
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });
  return element;
}

// Debounce function to optimize event listeners
function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Function to generate UUID v4 (client-side implementation)
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Import logger atau gunakan window.createLogger jika diload sebagai script biasa
const logger = (typeof window.createLogger === 'function') 
  ? window.createLogger('Chatbox') 
  : {
      debug: (...args) => console.debug('[Fallback Logger][DEBUG]', ...args),
      info: (...args) => console.info('[Fallback Logger][INFO]', ...args),
      warn: (...args) => console.warn('[Fallback Logger][WARN]', ...args),
      error: (...args) => console.error('[Fallback Logger][ERROR]', ...args),
    };

logger.info('Chatbox initialized');

/**
 * Chatbox Unified Class
 * Digunakan untuk menggabungkan fitur chatbox static dan embed.
 * Konfigurasi menentukan mode penggunaan (static atau embed).
 */
class Chatbox {
  constructor(config) {
    this.config = config || {};
    this.conversationHistory = [];
    this.isConversationActive = false;
    this.conversation_id = null;
    this.MAX_HISTORY_LENGTH = 10;
    this.theme = this.config.theme || {}; 
    this.isLoaded = false;

    // Tambahkan prefix untuk localStorage keys
    this.storagePrefix = this.config.isEmbed ? 'embed_chatbox_' : 'native_chatbox_';

    // Inisialisasi chatbox
    this.init();
  }

  // Inisialisasi chatbox
  init() {
    // Buat UI chatbox tetapi jangan tampilkan dulu
    this.createChatboxUI();

    // Set status koneksi ke "Standby"
    this.updateConnectionStatus('Standby', 'orange');

    // Muat percakapan sebelumnya
    this.loadConversation();

    // Pastikan UI diperbarui setelah percakapan dimuat
    setTimeout(() => {
      this.finishLoading();
    }, 100);
  }

  // New method to handle when loading is complete
  finishLoading() {
    this.isLoaded = true;
    const wrapper = document.querySelector('.chatbox-wrapper');
    
    if (wrapper) {
      wrapper.classList.remove('loading');
      wrapper.classList.add('loaded');
      setTimeout(() => {
        wrapper.style.opacity = '1';
      }, 100);
    }
    
    const textarea = document.querySelector('.chatbox-message-input');
    const sendButton = document.querySelector('.chatbox-message-submit');
    
    if (textarea) textarea.disabled = false;
    if (sendButton) sendButton.disabled = false;
    
    this.updateConnectionStatus('Standby', 'orange');
  }

  // Apply custom CSS if provided
  applyCustomCSS(customCSS) {
    if (typeof customCSS === 'string' && customCSS.trim() !== '') {
      const customStyleEl = document.createElement('style');
      customStyleEl.id = 'chatbox-custom-styles';
      customStyleEl.textContent = customCSS;
      document.head.appendChild(customStyleEl);
    }
  }

  // Membuat UI chatbox
  createChatboxUI() {
    const wrapper = document.createElement('div');
    wrapper.className = 'chatbox-wrapper loading'; // Add loading class
    
    // Add inline style to hide initially
    wrapper.style.opacity = '0';
    wrapper.style.transition = 'opacity 0.3s ease-in-out';

    const buttonConfig = this.theme.button || {};
    const toggleBgColor = buttonConfig.backgroundColor || 'var(--blue)';
    const toggleIcon = buttonConfig.customIcon
      ? `<img src="${buttonConfig.customIcon}" alt="Chatbox Icon" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
      : '<i class=\'bx bx-message-dots\'></i>';

    const toggle = document.createElement('div');
    toggle.className = 'chatbox-toggle';

    // Apply size configuration
    const sizeMap = {
      small: '3rem',
      medium: '4rem',
      large: '5rem',
    };
    const buttonSize = sizeMap[buttonConfig.size] || '4rem';
    toggle.style.width = buttonSize;
    toggle.style.height = buttonSize;

    // Apply position configuration
    toggle.style.position = 'absolute';
    toggle.style.right = buttonConfig.right || '2rem';
    toggle.style.bottom = buttonConfig.bottom || '2rem';

    // Apply styles based on whether customIcon is provided
    if (buttonConfig.customIcon) {
      toggle.style.background = 'transparent'; // No background color
      toggle.style.padding = '0'; // Remove padding for full icon display
    } else {
      toggle.style.background = toggleBgColor; // Show background color
      toggle.style.color = buttonConfig.iconColor || 'var(--white)';
      toggle.style.fontSize = '2rem';
      toggle.style.display = 'flex';
      toggle.style.justifyContent = 'center';
      toggle.style.alignItems = 'center';
    }

    toggle.innerHTML = toggleIcon;

    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'chatbox-message-wrapper';

    // Apply chatWindow styles dynamically
    const chatWindowConfig = this.theme.chatWindow || {};
    const chatWindowStyle = chatWindowConfig.style || {};
    const chatWindowHeight = parseInt(chatWindowStyle.height || '481px', 10);
    const chatWindowWidth = chatWindowStyle.width || '420px';

    messageWrapper.style.width = chatWindowWidth;
    messageWrapper.style.height = `${chatWindowHeight}px`;
    messageWrapper.style.background = chatWindowConfig.backgroundColor || 'var(--white)';

    // Dynamically adjust position based on button configuration
    const wrapperRight = parseInt(buttonConfig.right || '32px', 10);
    const wrapperBottom = parseInt(buttonConfig.bottom || '32px', 10);
    const buttonHeight = parseInt(buttonSize, 10); // Height of the button

    // Adjust the bottom position to account for button size and spacing
    messageWrapper.style.right = `${wrapperRight}px`;
    messageWrapper.style.bottom = `calc(100% + ${wrapperBottom + buttonHeight + 20}px)`; 
    messageWrapper.style.left = `calc(100% - ${wrapperRight + parseInt(chatWindowWidth, 10)}px)`;

    const headerBgColor = this.theme.header?.backgroundColor || 'var(--white)';
    const headerTextColor = this.theme.header?.textColor || '#000';

    const header = document.createElement('div');
    header.className = 'chatbox-message-header';
    header.style.background = headerBgColor;
    header.style.color = headerTextColor;

    // Kondisi untuk menampilkan title dan status
    const showTitle = this.theme.header?.showTitle !== false; // Default true
    const showStatus = this.theme.header?.showStatus !== false; // Default true

    // Get title and avatar from theme
    const title = this.theme.header?.title || "Support Agent";
    const titleAvatar = this.theme.header?.titleAvatar || "/assets/img/logo-bot.png";

    // Hanya tambahkan elemen title dan status jika diizinkan
    header.innerHTML = `
      <div class="chatbox-message-profile">
        ${showTitle ? `
          <img src="${titleAvatar}" alt="" class="chatbox-message-image">
          <div>
            <h4 class="chatbox-message-name">${title}</h4>
            ${showStatus ? `<p class="chatbox-message-status" id="connectionStatus">Connecting...</p>` : ''}
          </div>
        ` : ''}
      </div>
      <div class="chatbox-message-actions">
        <button class="chatbox-message-clear" title="Refresh chat"><i class='bx bx-refresh'></i></button>
      </div>
    `;

    const content = document.createElement('div');
    content.className = 'chatbox-message-content';

    // Hitung tinggi elemen chatbox-message-bottom secara dinamis
    const bottomElement = document.querySelector('.chatbox-message-bottom');
    const bottomHeight = bottomElement ? bottomElement.offsetHeight : 0;

    // Sesuaikan tinggi chatbox-message-content secara dinamis
    content.style.height = `${chatWindowHeight - bottomHeight}px`;
    content.style.maxHeight = `${chatWindowHeight - bottomHeight}px`;
    content.style.overflowY = 'auto';
    content.style.padding = '10px';

    content.style.fontSize = `${chatWindowConfig.fontSize || '12'}px`;
    content.innerHTML = `<h4 class="chatbox-message-no-message">${chatWindowConfig.welcomeMessage || "You don't have message yet!"}</h4>`;

    const bottom = document.createElement('div');
    bottom.className = 'chatbox-message-bottom';

    // Tambahkan gaya default untuk memastikan ukuran tetap
    bottom.style.minHeight = '50px'; // Atur tinggi minimum
    bottom.style.display = 'flex'; // Gunakan flexbox untuk tata letak
    bottom.style.flexDirection = 'column'; // Tata letak vertikal
    bottom.style.justifyContent = 'center'; // Pusatkan konten secara vertikal

    const inputBgColor = this.theme.inputBackgroundColor || 'var(--grey)';
    const sendButtonColor = this.theme.sendButtonColor || 'var(--blue)';
    
    bottom.innerHTML = `
      <form action="#" class="chatbox-message-form" style="background: ${inputBgColor};">
        <textarea rows="1" placeholder="${chatWindowConfig.inputPlaceholder || "Type message..."}" class="chatbox-message-input" style="min-height: 1em;"></textarea>
        <button type="submit" class="chatbox-message-submit" style="color: ${sendButtonColor};"><i class='bx bx-send'></i></button>
      </form>
    `;
    messageWrapper.appendChild(header);
    messageWrapper.appendChild(content);

    const footerConfig = this.theme.footer || {};
    const showFooter = footerConfig.showFooter || false;

    if (showFooter) {
      const footerTextContent = footerConfig.text || '';
      const footerLink = footerConfig.footerLink || '';
      const footerTextColor = footerConfig.textColor || '#888';

      if (footerTextContent) {
        const footer = document.createElement('div');
        footer.className = 'chatbox-footer-text';
        footer.style.textAlign = 'center';
        footer.style.fontSize = '0.875rem';
        footer.style.color = footerTextColor;
        footer.style.marginTop = '0.5rem';

        if (footerLink) {
          footer.innerHTML = `${footerTextContent} <a href="${footerLink}" target="_blank" style="color: ${footerTextColor}; text-decoration: underline;">${footerConfig.footerText || ''}</a>`;
        } else {
          footer.textContent = footerTextContent;
        }

        bottom.appendChild(footer);
      }
    }
    messageWrapper.appendChild(bottom);
    wrapper.appendChild(toggle);
    wrapper.appendChild(messageWrapper);
    document.body.appendChild(wrapper);
    
    toggle.addEventListener('click', () => {
      messageWrapper.classList.toggle('show');
    });

    const form = bottom.querySelector('.chatbox-message-form');
    const textarea = form.querySelector('.chatbox-message-input');
    const sendButton = form.querySelector('.chatbox-message-submit');

    textarea.disabled = true;
    sendButton.disabled = true;

    const handleSendMessage = () => {
      if (textarea.value.trim() !== '' && !textarea.disabled) {
        this.sendMessage(textarea.value);
        textarea.value = '';
      }
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSendMessage();
    });

    // Remove debounce for immediate response
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !textarea.disabled) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    const clearButton = header.querySelector('.chatbox-message-clear');
    clearButton.addEventListener('click', () => {
      this.clearChat();
    });

    setTimeout(() => {
      if (this.isLoaded) {
        wrapper.style.opacity = '1';
      }
    }, 100);

    // Call adjustChatboxContentHeight after chatbox UI is created
    setTimeout(() => {
      adjustChatboxContentHeight();
    }, 100);
  }

  // Check if all components are loaded
  checkIfFullyLoaded() {
    // All UI components are loaded, check if connection is also ready
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      this.finishLoading();
    } else if (!this.config.isEmbed) {
      // For HTTP fallback, we can finish loading now
      this.finishLoading();
    }
    // Otherwise, the WebSocket's onopen handler will call finishLoading
  }

  // Mengirim pesan ke server
  sendMessage(text) {
    const sanitizedText = sanitizeHTML(text);
    this.addMessage('You', sanitizedText);

    // Respons statis
    const staticResponse = "It's Work!";
    this.addMessage('AI Assistant', staticResponse);
  }

  // Check if a string is a valid UUID
  isValidUUID(uuid) {
    if (!uuid) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Menampilkan indikator mengetik
  showTypingIndicator() {
    const content = document.querySelector('.chatbox-message-content');
    // Remove existing typing indicator to avoid duplicates
    const existingIndicator = content.querySelector('.chatbox-typing-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chatbox-typing-indicator';
    typingIndicator.innerHTML = `
      <span class="chatbox-message-item-text">
        <div class="typing-dots">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </span>
    `;
    content.appendChild(typingIndicator);
    this.scrollBottom();
  }

  // Menambahkan pesan ke UI
  addMessage(sender, text) {
    const content = document.querySelector('.chatbox-message-content');
    const sanitizedText = sanitizeHTML(text);

    // Hide or replace the "no message" content if it exists
    const noMessageElement = content.querySelector('.chatbox-message-no-message');
    if (noMessageElement) {
      noMessageElement.remove();
    }

    const messageClass = sender === 'You' ? 'chatbox-message-item sent' : 'chatbox-message-item received';
    const messageStyle = sender === 'You'
      ? { background: this.theme.userMessageColor, color: this.theme.userMessageTextColor }
      : { background: this.theme.botMessageColor, color: this.theme.botMessageTextColor };

    const message = createElement('div', { className: messageClass, style: messageStyle }, [
      createElement('span', { className: 'chatbox-message-item-text' }, [sanitizedText])
    ]);

    content.appendChild(message);
    this.scrollBottom();

    // Tambahkan pesan ke riwayat percakapan
    this.conversationHistory.push({
      role: sender === 'You' ? 'user' : 'assistant',
      content: text,
      isUser: sender === 'You',
      time: new Date().toISOString()
    });

    // Simpan riwayat percakapan ke localStorage
    this.saveConversation();
  }

  // Tambahkan pesan ke UI tanpa menambahkannya ke conversationHistory
  addMessageToUI(sender, text) {
    const content = document.querySelector('.chatbox-message-content');
    const sanitizedText = sanitizeHTML(text);

    // Hide or replace the "no message" content if it exists
    const noMessageElement = content.querySelector('.chatbox-message-no-message');
    if (noMessageElement) {
      noMessageElement.remove();
    }

    const messageClass = sender === 'You' ? 'chatbox-message-item sent' : 'chatbox-message-item received';
    const messageStyle = sender === 'You'
      ? { background: this.theme.userMessageColor, color: this.theme.userMessageTextColor }
      : { background: this.theme.botMessageColor, color: this.theme.botMessageTextColor };

    const message = createElement('div', { className: messageClass, style: messageStyle }, [
      createElement('span', { className: 'chatbox-message-item-text' }, [sanitizedText])
    ]);

    content.appendChild(message);
    this.scrollBottom();
  }

  saveConversation() {
    try {
      localStorage.setItem(`${this.storagePrefix}conversation_history`, JSON.stringify(this.conversationHistory));
      localStorage.setItem(`${this.storagePrefix}conversation_active`, this.isConversationActive.toString());
      if (this.conversation_id) {
        localStorage.setItem(`${this.storagePrefix}conversation_id`, this.conversation_id);
      }
    } catch (error) {
      logger.error('Error saving conversation:', error);
    }
  }

  // Membersihkan chat
  clearChat() {
    const content = document.querySelector('.chatbox-message-content');
    content.innerHTML = `<h4 class="chatbox-message-no-message">${this.theme.chatWindow?.welcomeMessage || "You don't have message yet!"}</h4>`;
    this.conversationHistory = [];
    this.isConversationActive = false;

    // Hapus data dari localStorage dengan prefix yang benar
    localStorage.removeItem(`${this.storagePrefix}conversation_history`);
    localStorage.removeItem(`${this.storagePrefix}conversation_active`);
    localStorage.removeItem(`${this.storagePrefix}conversation_id`);

    // Perbarui status sesi di server jika conversation_id ada
    if (this.conversation_id) {
      // Kirim informasi jenis client saat deactivate
      fetch(`${this.config.baseURL}/chatbot/conversation/${this.conversation_id}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientType: this.config.isEmbed ? 'embed' : 'native'
        })
      }).catch((error) => {
        console.error('Error updating session status:', error);
      });
    }

    this.conversation_id = null;
  }

  // Memuat percakapan dari localStorage
  loadConversation() {
    try {
      if (this.isConversationLoaded) return; // Cegah duplikasi

      // Clear any conflicting localStorage items first
      if (this.config.isEmbed) {
        // Jika mode embed, pastikan tidak menggunakan storage dari native
        localStorage.removeItem('native_chatbox_conversation_history');
        localStorage.removeItem('native_chatbox_conversation_active');
        localStorage.removeItem('native_chatbox_conversation_id');
      } else {
        // Jika mode native, pastikan tidak menggunakan storage dari embed
        localStorage.removeItem('embed_chatbox_conversation_history');
        localStorage.removeItem('embed_chatbox_conversation_active');
        localStorage.removeItem('embed_chatbox_conversation_id');
      }

      const savedHistory = localStorage.getItem(`${this.storagePrefix}conversation_history`);
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          if (Array.isArray(parsedHistory)) {
            this.conversationHistory = parsedHistory;
            this.isConversationActive = true;
          } else {
            throw new Error('Format riwayat percakapan tidak valid');
          }
        } catch (parseError) {
          logger.error('Error parsing conversation history:', parseError);
          this.conversationHistory = [];
          localStorage.removeItem(`${this.storagePrefix}conversation_history`);
        }
      }
      
      this.conversation_id = localStorage.getItem(`${this.storagePrefix}conversation_id`) || null;

      // Display history in UI if exists
      if (this.conversationHistory.length > 0) {
        this.conversationHistory.forEach((message) => {
          if (!message || !message.role || !message.content) return;
          
          const sender = message.role === 'user' ? 'You' : 'AI Assistant';
          this.addMessageToUI(sender, message.content);
        });
      }

      this.isConversationLoaded = true;
    } catch (error) {
      logger.error('Error loading conversation:', error);
      this.conversationHistory = [];
      this.conversation_id = null;
      this.isConversationActive = false;
      this.isConversationLoaded = true;
    }
  }

  // Memperbarui status koneksi dan memblokir/menonaktifkan elemen UI
  updateConnectionStatus(status, color) {
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
      connectionStatus.textContent = status;
      connectionStatus.style.color = color;
    }

    const isEnabled = status === 'Standby';
    const textarea = document.querySelector('.chatbox-message-input');
    const sendButton = document.querySelector('.chatbox-message-submit');

    if (textarea) textarea.disabled = !isEnabled;
    if (sendButton) sendButton.disabled = !isEnabled;
  }

  // Scroll ke bawah untuk menampilkan pesan terbaru
  scrollBottom() {
    const content = document.querySelector('.chatbox-message-content');
    if (!content) return;
    
    // Gunakan requestAnimationFrame untuk memastikan DOM telah dirender
    requestAnimationFrame(() => {
      content.scrollTop = content.scrollHeight;
      
      // Fallback - kadang diperlukan penundaan singkat
      setTimeout(() => {
        content.scrollTop = content.scrollHeight;
      }, 100);
    });
  }
}

// Function to calculate and set dynamic height for chatbox-message-content
function adjustChatboxContentHeight() {
  const wrapper = document.querySelector('.chatbox-message-wrapper');
  const header = document.querySelector('.chatbox-message-header');
  const bottom = document.querySelector('.chatbox-message-bottom');
  const content = document.querySelector('.chatbox-message-content');

  if (wrapper && header && bottom && content) {
    const wrapperHeight = wrapper.offsetHeight;
    const headerHeight = header.offsetHeight;
    const bottomHeight = bottom.offsetHeight;

    // Set dynamic height for content
    const contentHeight = wrapperHeight - headerHeight - bottomHeight;
    content.style.height = `${contentHeight}px`;
    content.style.maxHeight = `${contentHeight}px`;
  }
}

// Call adjustChatboxContentHeight on window resize
window.addEventListener('resize', adjustChatboxContentHeight);

// Pastikan class Chatbox tersedia di global scope dengan nama Chatbot
if (typeof window !== 'undefined') {
  window.Chatbot = Chatbox;
}