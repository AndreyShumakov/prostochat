/**
 * Prostochat Main Application
 * Entry point and initialization
 */

/**
 * Panel Resizer - handles resizable columns
 */
const PanelResizer = {
    leftHandle: null,
    rightHandle: null,
    container: null,
    isResizing: false,
    currentHandle: null,
    startX: 0,
    startWidth: 0,

    // Constraints
    minLeftWidth: 200,
    maxLeftWidth: 500,
    minRightWidth: 200,
    maxRightWidth: 600,

    init() {
        this.container = document.querySelector('.app-container');
        this.leftHandle = document.getElementById('resize-left');
        this.rightHandle = document.getElementById('resize-right');

        if (!this.container || !this.leftHandle || !this.rightHandle) {
            console.warn('PanelResizer: elements not found');
            return;
        }

        // Load saved widths
        this.loadWidths();

        // Setup event listeners
        this.leftHandle.addEventListener('mousedown', (e) => this.startResize(e, 'left'));
        this.rightHandle.addEventListener('mousedown', (e) => this.startResize(e, 'right'));

        // Double-click to reset
        this.leftHandle.addEventListener('dblclick', () => this.resetPanel('left'));
        this.rightHandle.addEventListener('dblclick', () => this.resetPanel('right'));

        document.addEventListener('mousemove', (e) => this.onResize(e));
        document.addEventListener('mouseup', () => this.stopResize());

        // Touch support
        this.leftHandle.addEventListener('touchstart', (e) => this.startResize(e, 'left'));
        this.rightHandle.addEventListener('touchstart', (e) => this.startResize(e, 'right'));
        document.addEventListener('touchmove', (e) => this.onResize(e));
        document.addEventListener('touchend', () => this.stopResize());

        console.log('PanelResizer initialized');
    },

    loadWidths() {
        const savedLeft = localStorage.getItem('prostochat_left_panel_width');
        const savedRight = localStorage.getItem('prostochat_right_panel_width');

        if (savedLeft) {
            this.container.style.setProperty('--left-panel-width', savedLeft + 'px');
        }
        if (savedRight) {
            this.container.style.setProperty('--right-panel-width', savedRight + 'px');
        }
    },

    saveWidths() {
        const leftWidth = parseInt(getComputedStyle(this.container).getPropertyValue('--left-panel-width'));
        const rightWidth = parseInt(getComputedStyle(this.container).getPropertyValue('--right-panel-width'));

        if (leftWidth) localStorage.setItem('prostochat_left_panel_width', leftWidth);
        if (rightWidth) localStorage.setItem('prostochat_right_panel_width', rightWidth);
    },

    startResize(e, side) {
        e.preventDefault();
        this.isResizing = true;
        this.currentHandle = side;

        // Get starting position
        this.startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;

        // Get current width
        const cssVar = side === 'left' ? '--left-panel-width' : '--right-panel-width';
        this.startWidth = parseInt(getComputedStyle(this.container).getPropertyValue(cssVar)) || (side === 'left' ? 280 : 320);

        // Add visual feedback
        document.body.classList.add('resizing');
        (side === 'left' ? this.leftHandle : this.rightHandle).classList.add('dragging');
    },

    onResize(e) {
        if (!this.isResizing) return;

        e.preventDefault();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const delta = clientX - this.startX;

        let newWidth;
        let cssVar;

        if (this.currentHandle === 'left') {
            newWidth = this.startWidth + delta;
            newWidth = Math.max(this.minLeftWidth, Math.min(this.maxLeftWidth, newWidth));
            cssVar = '--left-panel-width';
        } else {
            // Right panel: delta is inverted (dragging right = smaller)
            newWidth = this.startWidth - delta;
            newWidth = Math.max(this.minRightWidth, Math.min(this.maxRightWidth, newWidth));
            cssVar = '--right-panel-width';
        }

        this.container.style.setProperty(cssVar, newWidth + 'px');
    },

    stopResize() {
        if (!this.isResizing) return;

        this.isResizing = false;
        document.body.classList.remove('resizing');
        this.leftHandle.classList.remove('dragging');
        this.rightHandle.classList.remove('dragging');

        // Save widths
        this.saveWidths();

        this.currentHandle = null;
    },

    // Reset single panel to default
    resetPanel(side) {
        if (side === 'left') {
            this.container.style.setProperty('--left-panel-width', '280px');
            localStorage.removeItem('prostochat_left_panel_width');
        } else {
            this.container.style.setProperty('--right-panel-width', '320px');
            localStorage.removeItem('prostochat_right_panel_width');
        }
    },

    // Reset all to defaults
    resetWidths() {
        this.container.style.setProperty('--left-panel-width', '280px');
        this.container.style.setProperty('--right-panel-width', '320px');
        localStorage.removeItem('prostochat_left_panel_width');
        localStorage.removeItem('prostochat_right_panel_width');
    }
};

const App = {
    /**
     * Initialize application
     */
    init() {
        console.log('Prostochat initializing...');

        // Initialize memory first
        Memory.init();

        // Initialize sync
        Sync.init();

        // Initialize UI
        Chat.init();
        UIRenderer.init();

        // Initialize panel resizer
        PanelResizer.init();

        // Initialize actor selector
        this.initActorSelector();

        // Render initial state
        this.renderEvents();
        this.updateStats();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Listen for actor changes
        window.addEventListener('actorChanged', (e) => {
            this.updateActorUI(e.detail.actor);
        });

        console.log('Prostochat ready');
    },

    /**
     * Initialize actor selector with available actors/roles
     */
    initActorSelector() {
        const select = document.getElementById('actor-select');
        const iconEl = document.getElementById('actor-icon');
        if (!select) return;

        // Get available actors
        const actors = Memory.getAvailableActors();
        const roles = Memory.getAvailableRoles();

        // Build options
        const options = [];

        // Add actors
        actors.forEach(a => {
            options.push({ value: a.id, label: `${a.icon} ${a.name}`, icon: a.icon, group: 'actor' });
        });

        // Add roles (if different from actors)
        roles.forEach(r => {
            if (!options.find(o => o.value === r.id)) {
                options.push({ value: r.id, label: `${r.icon} ${r.name}`, icon: r.icon, group: 'role' });
            }
        });

        // Build select HTML
        select.innerHTML = options.map(o =>
            `<option value="${o.value}">${o.label}</option>`
        ).join('');

        // Set current value
        const currentActor = Memory.getCurrentActor();
        select.value = currentActor;

        // Update icon
        const current = options.find(o => o.value === currentActor);
        if (current && iconEl) {
            iconEl.textContent = current.icon;
        }
    },

    /**
     * Update actor UI (icon and select)
     */
    updateActorUI(actor) {
        const select = document.getElementById('actor-select');
        const iconEl = document.getElementById('actor-icon');

        if (select) {
            select.value = actor;
        }

        if (iconEl) {
            iconEl.textContent = Memory.getActorIcon(actor);
        }
    },

    /**
     * Render events list
     */
    renderEvents(filter = null) {
        const container = document.getElementById('event-list');
        if (!container) return;

        let events = Memory.getLocalEvents().filter(e => !isGenesisEvent(e));

        // Apply filter
        if (filter) {
            events = events.filter(e => e.actor === filter);
        }

        // Sort by date descending
        events.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Take latest 50
        events = events.slice(0, 50);

        if (events.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.75rem;">
                    No events yet
                </div>
            `;
            return;
        }

        container.innerHTML = events.map(e => {
            // Count causes (BSL A2, A3)
            const causes = Array.isArray(e.cause) ? e.cause : (e.cause ? [e.cause] : []);
            const causeCount = causes.filter(Boolean).length;
            const causeIndicator = causeCount > 0
                ? `<span class="cause-count" title="Cause: ${causes.join(', ')}">${causeCount}</span>`
                : '<span class="cause-count no-cause" title="No cause!">!</span>';

            return `
                <div class="event-item" title="${this.formatDate(e.date)}">
                    <div>
                        <span class="base">${this.escape(e.base)}</span>
                        <span class="type">${this.escape(e.type)}</span>
                        <span class="value">${this.escape(this.truncate(this.formatValue(e.value), 30))}</span>
                    </div>
                    <div class="meta">
                        ${causeIndicator}
                        <span class="actor">${e.actor}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Update statistics
     */
    updateStats() {
        const stats = Memory.getStats();

        const eventsEl = document.getElementById('stat-events');
        const individualsEl = document.getElementById('stat-individuals');
        const localCountEl = document.getElementById('local-count');
        const genesisStatusEl = document.getElementById('genesis-status');

        if (eventsEl) eventsEl.textContent = stats.local;
        if (individualsEl) individualsEl.textContent = stats.individuals;
        if (localCountEl) localCountEl.textContent = stats.unsynced;

        // Update genesis status
        if (genesisStatusEl) {
            const validation = validateGenesis(Memory.events);
            if (validation.valid) {
                genesisStatusEl.innerHTML = `<span style="color: var(--success);">G✓</span>`;
                genesisStatusEl.title = `Genesis: ${validation.found}/${validation.total} events OK`;
            } else {
                genesisStatusEl.innerHTML = `<span style="color: var(--error);">G✗${validation.missing.length}</span>`;
                genesisStatusEl.title = `Genesis: ${validation.missing.length} missing events!\nClick to see details.`;
                genesisStatusEl.style.cursor = 'pointer';
                genesisStatusEl.onclick = () => {
                    console.log(Memory.getGenesisStatus());
                    alert(`Genesis validation failed!\n\nMissing: ${validation.missing.length} events\n\nCheck console for details.`);
                };
            }
        }
    },

    /**
     * Toggle event filter
     */
    toggleEventFilter() {
        const filter = document.getElementById('event-filter');
        if (filter) {
            filter.style.display = filter.style.display === 'none' ? 'block' : 'none';
        }
    },

    /**
     * Filter events by actor
     */
    filterEvents() {
        const select = document.getElementById('filter-actor');
        const filter = select ? select.value : null;
        this.renderEvents(filter);
    },

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to send message
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const form = document.getElementById('chat-form');
                if (form) {
                    form.dispatchEvent(new Event('submit'));
                }
            }

            // Ctrl/Cmd + N for new chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                newChat();
            }

            // Escape to clear input
            if (e.key === 'Escape') {
                const input = document.getElementById('message-input');
                if (input && document.activeElement === input) {
                    input.value = '';
                }
            }
        });
    },

    /**
     * Show settings modal
     */
    showSettings() {
        const provider = CONFIG.llm.provider;
        const openrouterKey = CONFIG.llm.openrouter.apiKey;
        const claudeKey = CONFIG.llm.claude.apiKey;
        const model = CONFIG.llm.openrouter.model;

        // Simple prompt-based settings (can be replaced with modal)
        const newProvider = prompt('LLM Provider (openrouter or claude):', provider);
        if (newProvider && (newProvider === 'openrouter' || newProvider === 'claude')) {
            CONFIG.llm.provider = newProvider;
        }

        if (CONFIG.llm.provider === 'openrouter') {
            const newKey = prompt('OpenRouter API Key:', openrouterKey || '');
            if (newKey !== null) CONFIG.llm.openrouter.apiKey = newKey;

            const newModel = prompt('Model:', model);
            if (newModel) CONFIG.llm.openrouter.model = newModel;
        } else {
            const newKey = prompt('Claude API Key:', claudeKey || '');
            if (newKey !== null) CONFIG.llm.claude.apiKey = newKey;
        }

        saveLLMConfig();

        // Update provider select
        const select = document.getElementById('llm-provider');
        if (select) select.value = CONFIG.llm.provider;
    },

    /**
     * Format value for display
     */
    formatValue(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    },

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        try {
            return new Date(dateStr).toLocaleString();
        } catch (e) {
            return dateStr;
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

// Global functions
function renderEvents() {
    App.renderEvents();
}

function updateStats() {
    App.updateStats();
}

function toggleEventFilter() {
    App.toggleEventFilter();
}

function filterEvents() {
    App.filterEvents();
}

/**
 * Change current actor/role
 * Called from actor-select dropdown
 */
function changeActor(actor) {
    Memory.setCurrentActor(actor);

    // Update icon
    const iconEl = document.getElementById('actor-icon');
    if (iconEl) {
        iconEl.textContent = Memory.getActorIcon(actor);
    }

    console.log('Actor changed to:', actor);
}

// === Events Modal Functions ===


function showAllEvents() {
    const modal = document.getElementById('events-modal');
    modal.style.display = 'flex';
    renderEventsModal();
}

function closeEventsModal() {
    const modal = document.getElementById('events-modal');
    modal.style.display = 'none';
}

function renderEventsModal(filter = {}) {
    const container = document.getElementById('events-modal-list');
    if (!container) return;

    let events = Memory.getAllEvents();

    // Update stats
    const statsEl = document.getElementById('events-stats');
    if (statsEl) {
        const total = events.length;

        // Count by source using proper functions
        const genesisCount = events.filter(e => isGenesisId(e.id)).length;
        const bootstrapCount = events.filter(e => e.id && e.id.startsWith('bootstrap_')).length;
        const thesaurusCount = events.filter(e => e.id && e.id.startsWith('thesaurus_')).length;
        const systemCount = genesisCount + bootstrapCount + thesaurusCount;
        const userCount = total - systemCount;

        statsEl.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Всего:</span>
                <span class="stat-value">${total}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Genesis:</span>
                <span class="stat-value">${genesisCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Bootstrap:</span>
                <span class="stat-value">${bootstrapCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Thesaurus:</span>
                <span class="stat-value">${thesaurusCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Пользовательские:</span>
                <span class="stat-value">${userCount}</span>
            </div>
        `;
    }

    // Apply search filter
    const searchTerm = document.getElementById('events-search')?.value?.toLowerCase() || '';
    if (searchTerm) {
        events = events.filter(e =>
            e.base?.toLowerCase().includes(searchTerm) ||
            e.type?.toLowerCase().includes(searchTerm) ||
            String(e.value).toLowerCase().includes(searchTerm) ||
            e.id?.toLowerCase().includes(searchTerm)
        );
    }

    // Apply type filter
    const typeFilter = document.getElementById('events-filter-type')?.value || '';
    if (typeFilter) {
        events = events.filter(e => e.type === typeFilter);
    }

    // Apply actor filter
    const actorFilter = document.getElementById('events-filter-actor')?.value || '';
    if (actorFilter) {
        events = events.filter(e => e.actor === actorFilter);
    }

    // Sort by date descending - newest first
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (events.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">Нет событий</div>';
        return;
    }

    container.innerHTML = events.map(e => {
        const hasModel = e.model || e.type === 'Individual' || e.type === 'Model' || isGenesisEvent(e);
        const valueStr = typeof e.value === 'object' ? JSON.stringify(e.value) : String(e.value);
        const truncatedValue = valueStr.length > 40 ? valueStr.substring(0, 40) + '...' : valueStr;

        // Build cause links - handle array of causes (BSL A2, A3)
        let causeLinks = '<span style="color: var(--text-muted)">—</span>';
        const causes = Array.isArray(e.cause) ? e.cause : (e.cause ? [e.cause] : []);

        if (causes.length > 0) {
            causeLinks = causes.map(causeId => {
                if (!causeId) return '';
                const shortId = causeId.length > 12 ? causeId.substring(0, 10) + '..' : causeId;
                return `<a href="#" class="cause-link" onclick="scrollToEvent('${App.escape(causeId)}'); return false;" title="${App.escape(causeId)}">${App.escape(shortId)}</a>`;
            }).filter(Boolean).join(', ');

            if (!causeLinks) {
                causeLinks = '<span style="color: var(--text-muted)">—</span>';
            }
        }

        const isGenesis = isGenesisEvent(e);
        const cssClass = `event-modal-item ${hasModel ? '' : 'no-model'} ${isGenesis ? 'genesis-event' : ''}`;

        return `
            <div class="${cssClass}" id="event-${App.escape(e.id)}" data-event-id="${App.escape(e.id)}">
                <span class="event-id" title="${App.escape(e.id)}">${App.escape(e.id.substring(0, 12))}...</span>
                <span class="base">${App.escape(e.base)}</span>
                <span class="type">${App.escape(e.type)}</span>
                <span class="value">
                    ${App.escape(truncatedValue)}
                    ${e.model ? `<span class="model-tag">${App.escape(e.model)}</span>` : ''}
                </span>
                <span class="cause-col">
                    ${causeLinks}
                </span>
                <span class="meta">
                    ${isGenesis ? '🌱' : ''} ${e.actor}
                </span>
            </div>
        `;
    }).join('');
}

/**
 * Scroll to event by ID and highlight it
 */
function scrollToEvent(eventId) {
    const element = document.getElementById('event-' + eventId);
    if (element) {
        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight effect
        element.classList.add('highlight');
        setTimeout(() => {
            element.classList.remove('highlight');
        }, 2000);
    } else {
        // Event not visible (filtered out), clear filters and try again
        const searchInput = document.getElementById('events-search');
        const typeFilter = document.getElementById('events-filter-type');

        if (searchInput) searchInput.value = '';
        if (typeFilter) typeFilter.value = '';

        renderEventsModal();

        // Try again after re-render
        setTimeout(() => {
            const el = document.getElementById('event-' + eventId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('highlight');
                setTimeout(() => el.classList.remove('highlight'), 2000);
            }
        }, 100);
    }
}

function filterEventsModal() {
    renderEventsModal();
}

function exportEvents() {
    const events = Memory.getLocalEvents();
    const bslText = events.map(e => {
        const valueStr = typeof e.value === 'object' ? JSON.stringify(e.value) : e.value;
        return `${e.base}: ${e.type}: ${valueStr}`;
    }).join('\n');

    // Download as file
    const blob = new Blob([bslText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prostochat_events_${new Date().toISOString().split('T')[0]}.bsl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Clear user events (keep system events: genesis + bootstrap + thesaurus)
 */
function clearUserEvents() {
    const userCount = Memory.getUserEventsCount();
    const systemCount = Memory.getSystemEventsCount();

    if (userCount === 0) {
        alert('Нет пользовательских событий для удаления.');
        return;
    }

    if (!confirm(`Удалить ${userCount} пользовательских событий?\n\nОстанутся системные события (genesis + bootstrap + thesaurus): ${systemCount} шт.\n\nЭто действие необратимо!`)) {
        return;
    }

    // Clear user events (keep system events)
    Memory.clearUserEvents();

    // Update UI
    renderEventsModal();
    updateStats();
    App.renderEvents();

    // Show result
    alert(`✅ Удалено ${userCount} пользовательских событий.\nОсталось ${Memory.events.length} системных событий.`);
}

// Backward compatibility alias
function clearToGenesis() {
    clearUserEvents();
}

/**
 * Rebuild world - recalculate Model and Cause for all events
 */
function rebuildWorld() {
    if (!confirm('Пересобрать мир?\n\nЭто пересчитает Model и Cause для всех событий.\nОперация может занять несколько секунд.')) {
        return;
    }

    // Show loading state
    const btn = document.querySelector('.btn-warning');
    const originalText = btn?.textContent;
    if (btn) {
        btn.textContent = '⏳ Пересборка...';
        btn.disabled = true;
    }

    // Run rebuild with slight delay to allow UI update
    setTimeout(() => {
        try {
            const report = Memory.rebuildWorld();

            // Update UI
            renderEventsModal();
            updateStats();

            // Show result
            alert(`✅ Мир пересобран!\n\nВсего событий: ${report.totalEvents}\nИсправлено Model: ${report.modelsFixed}\nИсправлено Cause: ${report.causesFixed}\nВремя: ${report.duration}`);

        } catch (error) {
            console.error('Rebuild failed:', error);
            alert(`❌ Ошибка пересборки:\n${error.message}`);
        } finally {
            // Restore button
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }
    }, 100);
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEventsModal();
    }
});

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeEventsModal();
    }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
