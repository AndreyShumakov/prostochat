/**
 * Prostochat Sync Module
 * Handles synchronization between frontend and backend
 *
 * Implements:
 * - Vector Clocks for causality tracking
 * - Cause dependency validation
 * - Conflict resolution (LWW, HB, Actor-based)
 * - Event validation
 */

/**
 * Vector Clock implementation for distributed sync
 * Tracks logical time per actor for causality
 */
class EventVector {
    constructor(data = {}) {
        this.clocks = data.clocks || {};  // {actorId: logicalTime}
        this.timestamp = data.timestamp || Date.now();
    }

    /**
     * Increment clock for actor
     */
    increment(actorId) {
        this.clocks[actorId] = (this.clocks[actorId] || 0) + 1;
        this.timestamp = Date.now();
        return this;
    }

    /**
     * Merge with another vector (take max of each component)
     */
    merge(other) {
        if (!other || !other.clocks) return this;

        const allActors = new Set([
            ...Object.keys(this.clocks),
            ...Object.keys(other.clocks)
        ]);

        allActors.forEach(actor => {
            this.clocks[actor] = Math.max(
                this.clocks[actor] || 0,
                other.clocks[actor] || 0
            );
        });

        this.timestamp = Math.max(this.timestamp, other.timestamp || 0);
        return this;
    }

    /**
     * Check if this vector happens-before another
     * A < B iff all(A[i] <= B[i]) and exists(A[i] < B[i])
     */
    happensBefore(other) {
        if (!other || !other.clocks) return false;

        const allActors = new Set([
            ...Object.keys(this.clocks),
            ...Object.keys(other.clocks)
        ]);

        let allLessOrEqual = true;
        let someStrictlyLess = false;

        for (const actor of allActors) {
            const thisVal = this.clocks[actor] || 0;
            const otherVal = other.clocks[actor] || 0;

            if (thisVal > otherVal) {
                allLessOrEqual = false;
                break;
            }
            if (thisVal < otherVal) {
                someStrictlyLess = true;
            }
        }

        return allLessOrEqual && someStrictlyLess;
    }

    /**
     * Check if vectors are concurrent (neither happens-before)
     */
    isConcurrent(other) {
        return !this.happensBefore(other) && !other.happensBefore(this);
    }

    /**
     * Get clock value for actor
     */
    get(actorId) {
        return this.clocks[actorId] || 0;
    }

    /**
     * Serialize for storage/transmission
     */
    toJSON() {
        return {
            clocks: { ...this.clocks },
            timestamp: this.timestamp
        };
    }

    /**
     * Create from stored data
     */
    static fromJSON(data) {
        return new EventVector(data);
    }

    /**
     * Create copy
     */
    clone() {
        return new EventVector({
            clocks: { ...this.clocks },
            timestamp: this.timestamp
        });
    }
}

const Sync = {
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    syncInterval: null,
    vectorClock: null,  // EventVector for this client
    conflictStrategy: 'lww',  // 'lww' | 'hb' | 'actor'
    actorPriority: ['system', 'genesis', 'admin', 'manager', 'user', 'llm'],

    /**
     * Initialize sync module
     */
    init() {
        this.lastSync = Memory.loadFromStorage(CONFIG.storage.lastSync);
        this.initVectorClock();
        this.checkConnection();

        // Start periodic sync
        this.syncInterval = setInterval(() => {
            this.syncEvents();
        }, CONFIG.sync.interval);

        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    },

    /**
     * Initialize or restore vector clock
     */
    initVectorClock() {
        const stored = Memory.loadFromStorage('prostochat_vector_clock');
        if (stored) {
            this.vectorClock = EventVector.fromJSON(stored);
        } else {
            this.vectorClock = new EventVector();
        }
    },

    /**
     * Save vector clock to storage
     */
    saveVectorClock() {
        Memory.saveToStorage('prostochat_vector_clock', this.vectorClock.toJSON());
    },

    /**
     * Increment vector clock for actor
     */
    tickClock(actorId) {
        if (!this.vectorClock) {
            this.vectorClock = new EventVector();
        }
        this.vectorClock.increment(actorId);
        this.saveVectorClock();
        return this.vectorClock.clone();
    },

    /**
     * Check if cause dependency exists in local events
     * Returns { valid: boolean, missing: string|null }
     */
    checkDependencies(event) {
        // Handle both single cause and array of causes (BSL spec)
        let causes = event.cause;

        if (!causes) {
            return { valid: true, missing: null };
        }

        // Normalize to array
        if (!Array.isArray(causes)) {
            causes = [causes];
        }

        // Check each cause
        const missing = [];
        for (const cause of causes) {
            // Genesis IDs are always valid
            if (typeof isGenesisId === 'function' && isGenesisId(cause)) {
                continue;
            }

            // Check if cause event exists
            const exists = Memory.events.some(e => e.id === cause);
            if (!exists) {
                missing.push(cause);
            }
        }

        return {
            valid: missing.length === 0,
            missing: missing.length > 0 ? missing[0] : null  // Return first missing for queue
        };
    },

    /**
     * Validate incoming event
     * Checks: structure, dependencies, causality
     */
    validateEvent(event) {
        const errors = [];

        // Required fields
        if (!event.id) errors.push('Missing event id');
        if (!event.type) errors.push('Missing event type');
        if (!event.actor) errors.push('Missing actor');

        // ID format (should be string or valid format)
        if (event.id && typeof event.id !== 'string' && typeof event.id !== 'number') {
            errors.push('Invalid id format');
        }

        // Check for duplicates
        const existing = Memory.events.find(e => e.id === event.id);
        if (existing) {
            // Same event already exists - not an error, just skip
            return { valid: false, errors: ['duplicate'], isDuplicate: true };
        }

        // Check cause dependency
        const depCheck = this.checkDependencies(event);
        if (!depCheck.valid) {
            errors.push(`Missing cause dependency: ${depCheck.missing}`);
        }

        // Validate date format
        if (event.date && isNaN(new Date(event.date).getTime())) {
            errors.push('Invalid date format');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            isDuplicate: false
        };
    },

    /**
     * Resolve conflict between two events with same (base, type)
     * Returns the winning event
     */
    resolveConflict(eventA, eventB) {
        if (!eventA) return eventB;
        if (!eventB) return eventA;

        switch (this.conflictStrategy) {
            case 'hb':
                return this.resolveByHappensBefore(eventA, eventB);
            case 'actor':
                return this.resolveByActorPriority(eventA, eventB);
            case 'lww':
            default:
                return this.resolveByLWW(eventA, eventB);
        }
    },

    /**
     * Last-Writer-Wins resolution
     * Uses timestamp, then actor priority as tiebreaker
     */
    resolveByLWW(eventA, eventB) {
        const timeA = new Date(eventA.date || 0).getTime();
        const timeB = new Date(eventB.date || 0).getTime();

        if (timeA !== timeB) {
            return timeA > timeB ? eventA : eventB;
        }

        // Tiebreaker: actor priority
        return this.resolveByActorPriority(eventA, eventB);
    },

    /**
     * Happens-Before resolution using vector clocks
     */
    resolveByHappensBefore(eventA, eventB) {
        const vectorA = eventA.vector ? EventVector.fromJSON(eventA.vector) : null;
        const vectorB = eventB.vector ? EventVector.fromJSON(eventB.vector) : null;

        if (vectorA && vectorB) {
            if (vectorA.happensBefore(vectorB)) return eventB;
            if (vectorB.happensBefore(vectorA)) return eventA;
            // Concurrent - fall back to LWW
        }

        return this.resolveByLWW(eventA, eventB);
    },

    /**
     * Actor priority resolution
     * Lower index in actorPriority wins
     */
    resolveByActorPriority(eventA, eventB) {
        const priorityA = this.actorPriority.indexOf(eventA.actor);
        const priorityB = this.actorPriority.indexOf(eventB.actor);

        // Known actors have priority over unknown
        const effPriorityA = priorityA === -1 ? 999 : priorityA;
        const effPriorityB = priorityB === -1 ? 999 : priorityB;

        if (effPriorityA !== effPriorityB) {
            return effPriorityA < effPriorityB ? eventA : eventB;
        }

        // Final tiebreaker: lexicographic ID comparison
        return String(eventA.id) < String(eventB.id) ? eventA : eventB;
    },

    /**
     * Merge incoming events with conflict resolution
     * Returns count of added events
     */
    mergeEvents(incomingEvents) {
        if (!incomingEvents || incomingEvents.length === 0) {
            return 0;
        }

        const existingById = new Map(Memory.events.map(e => [e.id, e]));
        const existingByKey = new Map();

        // Build index by (base, type) for conflict detection
        Memory.events.forEach(e => {
            const key = `${e.base || ''}::${e.type}`;
            if (!existingByKey.has(key)) {
                existingByKey.set(key, []);
            }
            existingByKey.get(key).push(e);
        });

        let addedCount = 0;
        const eventsToAdd = [];

        for (const evt of incomingEvents) {
            // Validate event
            const validation = this.validateEvent(evt);

            if (validation.isDuplicate) {
                continue;  // Skip duplicates silently
            }

            if (!validation.valid) {
                // Check if only cause dependency is missing
                const hasMissingDep = validation.errors.some(e => e.includes('Missing cause dependency'));
                if (hasMissingDep && validation.errors.length === 1) {
                    // Add to pending queue for later processing
                    const depCheck = this.checkDependencies(evt);
                    this.addToPending(evt, depCheck.missing);
                    console.debug('Event queued pending dependency:', evt.id);
                } else {
                    console.warn('Invalid event rejected:', evt.id, validation.errors);
                }
                continue;
            }

            // Check for conflicts (same base+type)
            const key = `${evt.base || ''}::${evt.type}`;
            const conflicting = existingByKey.get(key) || [];

            if (conflicting.length > 0) {
                // Find latest conflicting event
                const latestConflict = conflicting.reduce((a, b) =>
                    new Date(a.date || 0) > new Date(b.date || 0) ? a : b
                );

                // Resolve conflict
                const winner = this.resolveConflict(latestConflict, evt);

                if (winner === evt) {
                    // New event wins - append (we don't delete old events, just add new)
                    evt.synced = true;
                    eventsToAdd.push(evt);
                    addedCount++;
                }
                // If existing wins, we don't add the new event
            } else {
                // No conflict - add event
                evt.synced = true;
                eventsToAdd.push(evt);
                addedCount++;
            }

            // Update vector clock if present
            if (evt.vector) {
                this.vectorClock.merge(EventVector.fromJSON(evt.vector));
            }
        }

        // Add all validated events
        if (eventsToAdd.length > 0) {
            Memory.events.push(...eventsToAdd);
            Memory.saveToStorage(CONFIG.storage.events, Memory.getLocalEvents());
            this.saveVectorClock();

            // Try to process any pending events that may now have dependencies satisfied
            const pendingProcessed = this.processPendingEvents();
            addedCount += pendingProcessed;
        }

        return addedCount;
    },

    /**
     * Check backend connection (silent, no errors shown to user)
     */
    async checkConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${CONFIG.apiUrl}/health`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                this.setOnline(true);
                return true;
            }
        } catch (e) {
            // Silent fail - backend not available is normal for offline-first
        }

        this.setOnline(false);
        return false;
    },

    /**
     * Set online status
     */
    setOnline(online) {
        const wasOffline = !this.isOnline;
        this.isOnline = online;

        this.updateUI();

        // Sync when coming back online
        if (online && wasOffline) {
            setTimeout(() => this.syncEvents(), 1000);
        }
    },

    /**
     * Handle coming online
     */
    handleOnline() {
        console.log('Network online');
        this.checkConnection();
    },

    /**
     * Handle going offline
     */
    handleOffline() {
        console.log('Network offline');
        this.setOnline(false);
    },

    /**
     * Sync events with backend
     * Uses vector clocks for incremental sync and conflict resolution
     */
    async syncEvents() {
        if (!this.isOnline || this.isSyncing) return;

        const unsynced = Memory.getUnsyncedEvents();
        if (unsynced.length === 0) {
            await this.fetchNewEvents();
            return;
        }

        this.isSyncing = true;
        this.updateUI('syncing');

        try {
            // Attach vector clock to outgoing events
            const eventsToSend = unsynced.map(evt => ({
                ...evt,
                vector: this.vectorClock.toJSON()
            }));

            const response = await fetch(`${CONFIG.apiUrl}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    events: eventsToSend,
                    lastSync: this.lastSync,
                    vectorClock: this.vectorClock.toJSON()
                })
            });

            if (response.ok) {
                const result = await response.json();

                // Mark events as synced
                Memory.markSynced(unsynced.map(e => e.id));

                // Merge server vector clock if present
                if (result.vectorClock) {
                    this.vectorClock.merge(EventVector.fromJSON(result.vectorClock));
                    this.saveVectorClock();
                }

                // Use mergeEvents for proper validation and conflict resolution
                if (result.newEvents && result.newEvents.length > 0) {
                    // Filter out genesis events before merge
                    const nonGenesis = result.newEvents.filter(e => !isGenesisEvent(e));
                    const addedCount = this.mergeEvents(nonGenesis);

                    if (addedCount > 0) {
                        console.log(`Added ${addedCount} new events from server`);
                    }
                }

                this.lastSync = new Date().toISOString();
                Memory.saveToStorage(CONFIG.storage.lastSync, this.lastSync);

                console.log(`Synced ${unsynced.length} events, received ${result.newEvents?.length || 0}`);
            }
        } catch (e) {
            // Silent fail - don't show network errors to user
            console.debug('Sync failed (offline mode)');
            this.setOnline(false);
        } finally {
            this.isSyncing = false;
            this.updateUI();
        }
    },

    /**
     * Fetch new events from backend
     * Uses vector clock for incremental fetch and mergeEvents for validation
     */
    async fetchNewEvents() {
        if (!this.isOnline) return;

        try {
            // Build URL with vector clock for delta sync
            let url = `${CONFIG.apiUrl}/api/events`;
            const params = new URLSearchParams();

            if (this.lastSync) {
                params.append('since', this.lastSync);
            }

            // Include vector clock hash for smarter sync
            if (this.vectorClock && Object.keys(this.vectorClock.clocks).length > 0) {
                params.append('vectorClock', JSON.stringify(this.vectorClock.toJSON()));
            }

            if (params.toString()) {
                url += '?' + params.toString();
            }

            const response = await fetch(url);
            if (response.ok) {
                const events = await response.json();

                // Filter out genesis events
                const nonGenesis = events.filter(e => !isGenesisEvent(e));

                // Use mergeEvents for validation and conflict resolution
                const addedCount = this.mergeEvents(nonGenesis);

                if (addedCount > 0) {
                    console.log(`Fetched ${addedCount} new events from backend`);

                    // Refresh UI
                    if (typeof renderEvents === 'function') renderEvents();
                    if (typeof renderWidgets === 'function') renderWidgets();
                }

                this.lastSync = new Date().toISOString();
                Memory.saveToStorage(CONFIG.storage.lastSync, this.lastSync);
            }
        } catch (e) {
            console.error('Failed to fetch events:', e);
        }
    },

    // Pending events queue (events waiting for cause dependency)
    pendingEvents: [],

    /**
     * Add event to pending queue (missing cause)
     */
    addToPending(event, missingCause) {
        this.pendingEvents.push({
            event: event,
            missingCause: missingCause,  // Single cause ID
            addedAt: Date.now()
        });

        // Clean old pending events (> 1 hour)
        const oneHourAgo = Date.now() - 3600000;
        this.pendingEvents = this.pendingEvents.filter(p => p.addedAt > oneHourAgo);
    },

    /**
     * Try to process pending events after new events arrive
     */
    processPendingEvents() {
        if (this.pendingEvents.length === 0) return 0;

        const existingIds = new Set(Memory.events.map(e => e.id));
        const stillPending = [];
        let processed = 0;

        for (const pending of this.pendingEvents) {
            // Check if cause dependency now exists
            if (existingIds.has(pending.missingCause)) {
                // Dependency satisfied - try to add
                const validation = this.validateEvent(pending.event);
                if (validation.valid) {
                    pending.event.synced = true;
                    Memory.events.push(pending.event);
                    existingIds.add(pending.event.id);
                    processed++;
                }
            } else {
                // Still missing cause
                stillPending.push(pending);
            }
        }

        this.pendingEvents = stillPending;

        if (processed > 0) {
            Memory.saveToStorage(CONFIG.storage.events, Memory.getLocalEvents());
            console.log(`Processed ${processed} pending events`);
        }

        return processed;
    },

    /**
     * Force sync now
     */
    async syncNow() {
        await this.checkConnection();
        if (this.isOnline) {
            await this.syncEvents();
            // After sync, try to process pending events
            this.processPendingEvents();
        }
    },

    /**
     * Update UI elements
     */
    updateUI(status) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            const dot = statusEl.querySelector('.status-dot');
            const text = statusEl.querySelector('.status-text');

            if (status === 'syncing') {
                dot.className = 'status-dot syncing';
                text.textContent = 'Syncing...';
            } else if (this.isOnline) {
                dot.className = 'status-dot online';
                text.textContent = 'Online';
            } else {
                dot.className = 'status-dot offline';
                text.textContent = 'Offline';
            }
        }

        // Update local count
        const localCountEl = document.getElementById('local-count');
        if (localCountEl) {
            localCountEl.textContent = Memory.getUnsyncedEvents().length;
        }
    },

    /**
     * Stop sync
     */
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
};

/**
 * Get sync statistics
 */
Sync.getStats = function() {
    return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        lastSync: this.lastSync,
        conflictStrategy: this.conflictStrategy,
        pendingCount: this.pendingEvents.length,
        vectorClock: this.vectorClock ? this.vectorClock.toJSON() : null,
        unsyncedCount: Memory.getUnsyncedEvents ? Memory.getUnsyncedEvents().length : 0
    };
};

/**
 * Set conflict resolution strategy
 * @param {string} strategy - 'lww' | 'hb' | 'actor'
 */
Sync.setConflictStrategy = function(strategy) {
    if (['lww', 'hb', 'actor'].includes(strategy)) {
        this.conflictStrategy = strategy;
        console.log(`Conflict strategy set to: ${strategy}`);
    }
};

// Global sync function for button
function syncNow() {
    Sync.syncNow();
}
