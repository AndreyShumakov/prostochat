#!/bin/sh
set -e

# Hosts from environment
FRONTEND_HOST=${FRONTEND_HOST:-chat.prostodoska.ru}
BACKEND_HOST=${BACKEND_HOST:-adminchat.prostodoska.ru}
BACKEND_URL=${BACKEND_URL:-https://${BACKEND_HOST}}

# Generate nginx.conf (static files only)
cat > /etc/nginx/conf.d/default.conf << NGINXEOF
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css)$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1d;
        add_header Cache-Control "public";
    }
}
NGINXEOF

echo "Nginx config generated (static files only)"

# Generate config.js from environment variables
cat > /usr/share/nginx/html/js/config.js << EOF
/**
 * Prostochat Configuration
 * Generated from environment variables
 */

// Hosts configuration from environment
const HOSTS = {
    frontend: '${FRONTEND_HOST}',
    backend: '${BACKEND_HOST}'
};

// Auto-detect environment
const IS_PRODUCTION = window.location.hostname === HOSTS.frontend ||
                      window.location.hostname === HOSTS.backend ||
                      window.location.hostname.endsWith('.prostodoska.ru');
const IS_LOCAL = window.location.hostname === 'localhost' ||
                 window.location.hostname === '127.0.0.1';

// Backend API URL from environment
const BACKEND_URL = IS_LOCAL ? 'http://localhost:3081' : '${BACKEND_URL}';

const CONFIG = {
    // Environment
    env: IS_PRODUCTION ? 'production' : (IS_LOCAL ? 'local' : 'development'),

    // Hosts
    hosts: HOSTS,

    // Backend API - direct URL to backend
    apiUrl: BACKEND_URL,

    // LLM Settings
    llm: {
        provider: '${LLM_PROVIDER:-openrouter}',
        openrouter: {
            apiKey: '${OPENROUTER_API_KEY:-}',
            model: '${LLM_MODEL:-anthropic/claude-3.5-sonnet}'
        },
        claude: {
            apiKey: '${CLAUDE_API_KEY:-}'
        }
    },

    // Sync settings
    sync: {
        interval: 30000,
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

// Load saved LLM config (overrides env defaults)
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
EOF

echo "Config generated with LLM_PROVIDER=${LLM_PROVIDER:-openrouter}"

# Start nginx
exec nginx -g 'daemon off;'
