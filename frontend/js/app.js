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
 * Now with auto-fix for unambiguous errors and LLM fix for ambiguous ones
 */
function rebuildWorld() {
    if (!confirm('Пересобрать мир?\n\nЭто пересчитает Model и Cause для всех событий.\nОшибки валидации будут исправлены автоматически или через LLM.')) {
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

            // Collect validation errors with fix info
            const allAutoFixes = [];
            const allManualFixes = [];

            Memory.events.forEach(event => {
                // Skip genesis events
                if (isGenesisEvent(event)) return;

                const systemTypes = ['Instance', 'Model', 'Individual', 'SetModel', 'Attribute', 'Relation', 'Role'];
                if (systemTypes.includes(event.type)) return;

                const fixInfo = Memory.validateEventWithFixInfo(event);
                if (!fixInfo.valid) {
                    fixInfo.autoFixable.forEach(af => {
                        allAutoFixes.push({ eventId: event.id, ...af });
                    });
                    fixInfo.manualFix.forEach(mf => {
                        allManualFixes.push({ eventId: event.id, event, ...mf });
                    });
                }
            });

            // Apply auto-fixes
            let autoFixed = 0;
            allAutoFixes.forEach(({ eventId, fix, description }) => {
                if (Memory.applyAutoFix(eventId, fix)) {
                    console.log(`Auto-fixed ${eventId}: ${description}`);
                    autoFixed++;
                }
            });

            // Update UI
            renderEventsModal();
            updateStats();

            // Show result
            let message = `✅ Мир пересобран!\n\n`;
            message += `Всего событий: ${report.totalEvents}\n`;
            message += `Исправлено Model: ${report.modelsFixed}\n`;
            message += `Исправлено Cause: ${report.causesFixed}\n`;
            if (report.conditionWitnessesAdded > 0) {
                message += `Добавлено Condition witnesses: ${report.conditionWitnessesAdded}\n`;
            }
            if (autoFixed > 0) {
                message += `✅ Автоисправлено: ${autoFixed}\n`;
            }
            if (allManualFixes.length > 0) {
                message += `⚠️ Требуют ручного исправления: ${allManualFixes.length}\n`;
            }
            message += `Время: ${report.duration}`;

            // If there are manual fixes needed, show validation modal
            if (allManualFixes.length > 0) {
                alert(message);
                showValidationModal(allManualFixes, autoFixed);
            } else {
                alert(message);
            }

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

// ========================================
// VALIDATION MODAL
// ========================================

let pendingValidationErrors = [];

function showValidationModal(errors, autoFixedCount) {
    pendingValidationErrors = errors;

    const modal = document.getElementById('validation-modal');
    const summary = document.getElementById('validation-summary');
    const list = document.getElementById('validation-errors-list');
    const fixAllBtn = document.getElementById('fix-all-llm-btn');

    // Show summary
    summary.innerHTML = `
        <span class="summary-stat">Автоисправлено: <span class="stat-value">${autoFixedCount}</span></span>
        <span class="summary-stat">Требуют решения: <span class="stat-value">${errors.length}</span></span>
    `;

    // Render errors
    list.innerHTML = errors.map((errInfo, idx) => renderValidationError(errInfo, idx)).join('');

    // Show fix all button if there are errors
    fixAllBtn.style.display = errors.length > 0 ? 'inline-flex' : 'none';

    modal.style.display = 'flex';
}

function renderValidationError(errInfo, idx) {
    const { eventId, event, error, candidates, context } = errInfo;

    const candidatesHtml = candidates && candidates.length > 0
        ? `<div class="error-context">Варианты: ${candidates.join(', ')}</div>`
        : '';

    const contextHtml = context ? `
        <details>
            <summary>Контекст события</summary>
            <pre>${JSON.stringify(context, null, 2)}</pre>
        </details>
    ` : '';

    return `
        <div class="validation-error-item" id="error-item-${idx}" data-event-id="${eventId}">
            <div class="error-header">
                <div class="error-event-info">
                    <div class="event-id">${eventId}</div>
                    <div class="event-details">
                        ${event.base}: ${event.type}: ${event.value} (actor: ${event.actor})
                    </div>
                </div>
                <div class="error-actions">
                    <button class="btn-fix" onclick="fixErrorWithLLM(${idx})">
                        🤖 Исправить LLM
                    </button>
                    <button class="btn-skip" onclick="skipError(${idx})">
                        Пропустить
                    </button>
                </div>
            </div>
            <div class="error-message">${error.message}</div>
            ${candidatesHtml}
            <div class="error-context">
                ${contextHtml}
            </div>
        </div>
    `;
}

function closeValidationModal() {
    document.getElementById('validation-modal').style.display = 'none';
    pendingValidationErrors = [];
}

async function fixErrorWithLLM(idx) {
    const errInfo = pendingValidationErrors[idx];
    if (!errInfo) return;

    const itemEl = document.getElementById(`error-item-${idx}`);
    if (!itemEl) return;

    // Show loading state
    itemEl.classList.add('error-fixing');
    const actionsEl = itemEl.querySelector('.error-actions');
    actionsEl.innerHTML = '<span>⏳ Запрос к LLM...</span>';

    try {
        console.log('fixErrorWithLLM: requesting fix for', errInfo.eventId);
        const result = await Memory.requestLLMFix(errInfo);
        console.log('fixErrorWithLLM: LLM response', result);

        if (result.success) {
            // Apply fix
            const applied = Memory.applyLLMFix(errInfo.eventId, result.fixes);
            console.log('fixErrorWithLLM: applied =', applied);

            // Re-validate to confirm fix worked
            const event = Memory.events.find(e => e.id === errInfo.eventId);
            const revalidation = event ? Memory.validateEventWithFixInfo(event) : { valid: false };
            console.log('fixErrorWithLLM: revalidation =', revalidation);

            itemEl.classList.remove('error-fixing');

            if (revalidation.valid) {
                itemEl.classList.add('error-fixed');

                // Show result
                const fixDesc = Object.entries(result.fixes)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ');

                actionsEl.innerHTML = `
                    <div class="error-result success">
                        ✅ Исправлено: ${fixDesc}
                    </div>
                `;

                // Mark as resolved
                pendingValidationErrors[idx].resolved = true;
            } else {
                // Fix didn't work
                itemEl.classList.add('error-failed');
                const remainingErrors = revalidation.manualFix.map(m => m.error.message).join('; ');
                actionsEl.innerHTML = `
                    <div class="error-result failure">
                        ⚠️ Исправление применено, но ошибки остались: ${remainingErrors}
                    </div>
                    <button class="btn-fix" onclick="fixErrorWithLLM(${idx})">
                        🔄 Повторить
                    </button>
                    <button class="btn-skip" onclick="skipError(${idx})">Пропустить</button>
                `;
            }

            // Update events modal
            renderEventsModal();
            updateStats();
        } else {
            itemEl.classList.remove('error-fixing');
            itemEl.classList.add('error-failed');
            actionsEl.innerHTML = `
                <div class="error-result failure">
                    ❌ ${result.error}
                </div>
                <button class="btn-skip" onclick="skipError(${idx})">Пропустить</button>
            `;
        }
    } catch (e) {
        console.error('LLM fix failed:', e);
        itemEl.classList.remove('error-fixing');
        itemEl.classList.add('error-failed');
        actionsEl.innerHTML = `
            <div class="error-result failure">
                ❌ Ошибка: ${e.message}
            </div>
            <button class="btn-skip" onclick="skipError(${idx})">Пропустить</button>
        `;
    }
}

function skipError(idx) {
    const itemEl = document.getElementById(`error-item-${idx}`);
    if (itemEl) {
        itemEl.style.display = 'none';
        pendingValidationErrors[idx].skipped = true;
    }

    // Check if all errors are resolved/skipped
    const remaining = pendingValidationErrors.filter(e => !e.resolved && !e.skipped);
    if (remaining.length === 0) {
        closeValidationModal();
    }
}

async function fixAllWithLLM() {
    const unresolved = pendingValidationErrors
        .map((e, idx) => ({ ...e, idx }))
        .filter(e => !e.resolved && !e.skipped);

    if (unresolved.length === 0) {
        closeValidationModal();
        return;
    }

    const fixAllBtn = document.getElementById('fix-all-llm-btn');
    fixAllBtn.disabled = true;
    fixAllBtn.textContent = '⏳ Исправление...';

    for (const errInfo of unresolved) {
        await fixErrorWithLLM(errInfo.idx);
        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));
    }

    fixAllBtn.disabled = false;
    fixAllBtn.textContent = '🤖 Исправить все через LLM';

    // Check if all done
    const remaining = pendingValidationErrors.filter(e => !e.resolved && !e.skipped);
    if (remaining.length === 0) {
        setTimeout(() => {
            alert('✅ Все ошибки обработаны');
            closeValidationModal();
        }, 500);
    }
}

// Helper to check if event is genesis/system
function isGenesisEvent(event) {
    return event.actor === 'System' || event.actor === 'system' || event.actor === 'genesis' ||
           (typeof isGenesisId === 'function' && isGenesisId(event.id));
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEventsModal();
        closeValidationModal();
    }
});

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        if (e.target.id === 'validation-modal') {
            closeValidationModal();
        } else {
            closeEventsModal();
        }
    }
});

// Handle graph consistency errors - attempt LLM fix
window.addEventListener('graphConsistencyError', async (e) => {
    const { eventId, eventData, errors } = e.detail;

    console.log('Graph consistency error detected:', errors);

    // Show notification
    const errorMsg = errors.map(err => err.message).join('; ');

    // Try to fix with LLM if API key is available
    if (CONFIG.llm.openrouter.apiKey || CONFIG.llm.claude.apiKey) {
        console.log('Attempting LLM fix for graph consistency...');

        try {
            const fixResult = await Memory.fixGraphConsistency(eventData, { valid: false, errors, fixes: {} });

            if (fixResult && fixResult !== eventData) {
                // LLM provided a fix - show notification
                console.log('LLM fix applied:', fixResult);

                // If LLM suggested creating an Individual, do it
                if (fixResult.createIndividual) {
                    Memory._createMissingIndividual(fixResult.createIndividual);
                }

                // Notify user
                showToast(`Исправлено: ${errorMsg}`, 'success');
            }
        } catch (err) {
            console.error('LLM fix failed:', err);
            showToast(`Ошибка графа: ${errorMsg}`, 'warning');
        }
    } else {
        // No API key - just warn
        showToast(`Ошибка консистентности: ${errorMsg}`, 'warning');
    }
});

// Handle validation errors
window.addEventListener('validationError', (e) => {
    const { eventData, errors } = e.detail;
    const errorMsg = errors.map(err => err.message).join('; ');
    console.warn('Validation error:', errorMsg);
    // Could show toast or modal here
});

// Simple toast notification
function showToast(message, type = 'info') {
    // Check if toast container exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#4ade80' : type === 'warning' ? '#fbbf24' : '#60a5fa'};
        color: ${type === 'warning' ? '#000' : '#fff'};
        padding: 12px 20px;
        border-radius: 8px;
        margin-top: 8px;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
