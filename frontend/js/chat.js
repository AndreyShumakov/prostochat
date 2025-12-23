/**
 * Prostochat Chat Module
 * Handles chat UI and messaging
 */

const Chat = {
    isLoading: false,

    /**
     * Initialize chat
     */
    init() {
        this.renderChatList();
        this.renderMessages();
        this.updateChatTitle();

        // Set provider from config
        const providerSelect = document.getElementById('llm-provider');
        if (providerSelect) {
            providerSelect.value = CONFIG.llm.provider;
        }
    },

    /**
     * Render chat list in left panel
     */
    renderChatList() {
        const container = document.getElementById('chat-list');
        if (!container) return;

        const chats = Memory.chats;
        const currentId = Memory.currentChatId;

        container.innerHTML = chats.map(chat => `
            <div class="chat-item ${chat.id === currentId ? 'active' : ''}"
                 onclick="Chat.switchToChat('${chat.id}')"
                 title="${this.escape(chat.title)}">
                <span>${this.escape(this.truncate(chat.title, 20))}</span>
                ${chats.length > 1 ? `<button class="btn-icon" onclick="event.stopPropagation(); Chat.deleteChat('${chat.id}')" title="Delete">×</button>` : ''}
            </div>
        `).join('');
    },

    /**
     * Switch to chat
     */
    switchToChat(chatId) {
        Memory.switchToChat(chatId);
        this.renderChatList();
        this.renderMessages();
        this.updateChatTitle();
    },

    /**
     * Create new chat
     */
    newChat() {
        const title = prompt('Chat name:', 'New Chat');
        if (title) {
            Memory.createChat(title);
            this.renderChatList();
            this.renderMessages();
            this.updateChatTitle();
        }
    },

    /**
     * Delete chat
     */
    deleteChat(chatId) {
        if (confirm('Delete this chat?')) {
            Memory.deleteChat(chatId);
            this.renderChatList();
            this.renderMessages();
            this.updateChatTitle();
        }
    },

    /**
     * Update chat title
     */
    updateChatTitle() {
        const titleEl = document.getElementById('chat-title');
        const chat = Memory.getCurrentChat();
        if (titleEl && chat) {
            titleEl.textContent = chat.title;
        }
    },

    /**
     * Render messages
     */
    renderMessages() {
        const container = document.getElementById('messages');
        if (!container) return;

        const messages = Memory.getMessages();

        if (messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    <p>Start a conversation</p>
                    <p style="font-size: 0.875rem;">Ask about anything or create semantic data</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(msg => this.renderMessage(msg)).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    },

    /**
     * Render single message
     */
    renderMessage(message) {
        const roleClass = message.role === 'user' ? 'user' : (message.role === 'system' ? 'system' : 'llm');
        const content = message.role === 'user' ? this.escape(message.content) : this.renderMarkdown(message.content);
        const time = new Date(message.timestamp).toLocaleTimeString();

        return `
            <div class="message ${roleClass}">
                ${content}
                <div class="message-meta">${time}</div>
            </div>
        `;
    },

    /**
     * Render markdown content
     */
    renderMarkdown(content) {
        if (typeof marked !== 'undefined' && marked.parse) {
            try {
                // Configure marked
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    highlight: function(code, lang) {
                        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                            try {
                                return hljs.highlight(code, { language: lang }).value;
                            } catch (e) {}
                        }
                        return code;
                    }
                });
                return marked.parse(content);
            } catch (e) {
                console.warn('Markdown parse error:', e);
            }
        }
        return this.escape(content).replace(/\n/g, '<br>');
    },

    /**
     * Send message
     */
    async sendMessage(event) {
        event.preventDefault();

        const input = document.getElementById('message-input');
        const content = input.value.trim();

        if (!content || this.isLoading) return;

        // Add user message
        Memory.addMessage('user', content);
        this.renderMessages();
        input.value = '';

        // Show loading state
        this.setLoading(true);

        try {
            // Send to LLM
            const response = await LLMClient.sendMessage(content);

            // Process response (adds events, views)
            const textResponse = LLMClient.processResponse(response);

            // Add LLM message
            Memory.addMessage('llm', textResponse);

        } catch (error) {
            console.error('LLM error:', error);
            Memory.addMessage('system', `Error: ${error.message}`);
        } finally {
            this.setLoading(false);
            this.renderMessages();
        }
    },

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;

        const sendBtn = document.getElementById('send-btn');
        const input = document.getElementById('message-input');

        if (sendBtn) {
            sendBtn.disabled = loading;
            sendBtn.textContent = loading ? 'Sending...' : 'Send';
        }

        if (input) {
            input.disabled = loading;
        }
    },

    /**
     * Add system message
     */
    addSystemMessage(content) {
        Memory.addMessage('system', content);
        this.renderMessages();
    },

    /**
     * Send message programmatically
     */
    sendProgrammatic(content) {
        const input = document.getElementById('message-input');
        if (input) {
            input.value = content;
            // Use bubbles: true to avoid deprecated warning
            document.getElementById('chat-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    },

    /**
     * Escape HTML
     */
    escape(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Truncate string
     */
    truncate(str, maxLength) {
        if (!str) return '';
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    }
};

// Global functions for HTML onclick handlers
function newChat() {
    Chat.newChat();
}

function sendMessage(event) {
    Chat.sendMessage(event);
}

function sendMessageToChat(content) {
    Chat.sendProgrammatic(content);
}

function addSystemMessage(content) {
    Chat.addSystemMessage(content);
}
