/**
 * Prostochat Configuration
 */

// Hosts configuration
const HOSTS = {
    frontend: 'chat.prostodoska.ru',
    backend: 'adminchat.prostodoska.ru'
};

// Auto-detect environment
const IS_PRODUCTION = window.location.hostname === HOSTS.frontend ||
                      window.location.hostname === HOSTS.backend ||
                      window.location.hostname.endsWith('.prostodoska.ru');
const IS_LOCAL = window.location.hostname === 'localhost' ||
                 window.location.hostname === '127.0.0.1';

// Backend API URL
const BACKEND_URL = IS_LOCAL
    ? 'http://localhost:3081'
    : 'https://' + HOSTS.backend;

const CONFIG = {
    // Environment
    env: IS_PRODUCTION ? 'production' : (IS_LOCAL ? 'local' : 'development'),

    // Hosts
    hosts: HOSTS,

    // Backend API - direct URL to backend
    apiUrl: BACKEND_URL,

    // LLM Settings - Keys loaded from localStorage or set via UI
    llm: {
        provider: 'openrouter', // 'openrouter' or 'claude'
        openrouter: {
            apiKey: '', // Set via settings UI or localStorage
            model: 'anthropic/claude-sonnet-4'
        },
        claude: {
            apiKey: '' // Set via settings UI or localStorage
        }
    },

    // Sync settings
    sync: {
        interval: 30000, // 30 seconds
        retryDelay: 5000
    },

    // Storage keys
    storage: {
        events: 'prostochat_events',
        chats: 'prostochat_chats',
        currentChat: 'prostochat_current_chat',
        lastSync: 'prostochat_last_sync',
        llmConfig: 'prostochat_llm_config'
    }
};

// Load saved LLM config
(function loadLLMConfig() {
    try {
        const saved = localStorage.getItem(CONFIG.storage.llmConfig);
        if (saved) {
            const config = JSON.parse(saved);
            if (config.provider) CONFIG.llm.provider = config.provider;
            if (config.openrouterKey) CONFIG.llm.openrouter.apiKey = config.openrouterKey;
            if (config.claudeKey) CONFIG.llm.claude.apiKey = config.claudeKey;
            if (config.model) CONFIG.llm.openrouter.model = config.model;
        }
    } catch (e) {
        console.warn('Failed to load LLM config:', e);
    }
})();

// Save LLM config
function saveLLMConfig() {
    const config = {
        provider: CONFIG.llm.provider,
        openrouterKey: CONFIG.llm.openrouter.apiKey,
        claudeKey: CONFIG.llm.claude.apiKey,
        model: CONFIG.llm.openrouter.model
    };
    localStorage.setItem(CONFIG.storage.llmConfig, JSON.stringify(config));
}
