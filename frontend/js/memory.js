/**
 * Prostochat Memory Module
 * Event storage with localStorage persistence
 *
 * Memory Tiers (based on cognitive science [1,2,4]):
 * - Working Memory: Current session, limited capacity (7±2 items)
 * - Episodic Memory: Recent events with temporal decay
 * - Semantic Memory: Long-term consolidated facts
 */

const Memory = {
    events: [],
    chats: [],
    currentChatId: null,
    currentActor: 'user',  // Current actor/role for creating events
    initialized: false,
    subscriptions: [], // Pending subscriptions waiting for conditions

    // ========================================
    // MEMORY TIERS [1,2,4]
    // ========================================

    /**
     * Working Memory: Active context for current task
     * - Limited capacity (Miller's Law: 7±2)
     * - Cleared on session end
     * - Highest retrieval priority
     */
    workingMemory: {
        items: [],
        capacity: 9,  // 7+2 max items
        sessionStart: null
    },

    /**
     * Episodic Memory: Recent events with temporal context
     * - Decays over time (forgetting curve)
     * - Contains event references with importance scores
     * - Consolidates to semantic memory periodically
     */
    episodicMemory: {
        items: [],           // [{eventId, importance, accessCount, lastAccess, decay}]
        maxItems: 1000,
        decayRate: 0.1,      // Decay per hour
        consolidationThreshold: 0.3  // Below this → candidate for consolidation
    },

    /**
     * Semantic Memory: Long-term knowledge store
     * - Consolidated facts and patterns
     * - No decay, persistent
     * - Indexed by concepts and relations
     */
    semanticMemory: {
        concepts: {},        // {conceptName: {facts: [], relations: []}}
        patterns: [],        // Extracted patterns from episodic
        summaries: []        // Consolidated summaries
    },

    /**
     * Memory configuration
     */
    memoryConfig: {
        autoConsolidate: true,
        consolidationInterval: 3600000,  // 1 hour in ms
        importanceThreshold: 0.5,
        decayEnabled: true
    },

    /**
     * Initialize memory with genesis and saved events
     */
    init() {
        if (this.initialized) return;

        // Load genesis events
        this.events = getGenesisEvents();

        // Load saved events from localStorage
        const savedEvents = this.loadFromStorage(CONFIG.storage.events);
        if (savedEvents && Array.isArray(savedEvents)) {
            // Filter out duplicates by ID
            const genesisIds = new Set(this.events.map(e => e.id));
            const newEvents = savedEvents.filter(e => !genesisIds.has(e.id));
            this.events = [...this.events, ...newEvents];
        }

        // Migrate: normalize cause to array for all events (BSL A2, A3)
        let causesMigrated = 0;
        this.events.forEach(event => {
            if (!Array.isArray(event.cause)) {
                event.cause = event.cause ? [event.cause] : [];
                causesMigrated++;
            }
        });
        if (causesMigrated > 0) {
            console.log(`Migrated ${causesMigrated} events: cause normalized to array (BSL A2, A3)`);
        }

        // Validate and repair genesis events
        const genesisValidation = this.validateAndRepairGenesis();
        if (genesisValidation.repaired > 0) {
            console.log(`Genesis repaired: added ${genesisValidation.repaired} missing events`);
        }

        // Load chats
        this.chats = this.loadFromStorage(CONFIG.storage.chats) || [];
        this.currentChatId = this.loadFromStorage(CONFIG.storage.currentChat);

        // Create default chat if none exists
        if (this.chats.length === 0) {
            this.createChat('Default Chat');
        } else if (!this.currentChatId) {
            this.currentChatId = this.chats[0].id;
        }

        // Load current actor from storage
        const savedActor = this.loadFromStorage('prostochat_actor');
        if (savedActor) {
            this.currentActor = savedActor;
        }

        // Initialize memory tiers
        this.initMemoryTiers();

        this.initialized = true;
        console.log(`Memory initialized: ${this.events.length} events, ${this.chats.length} chats`);
        console.log(`Genesis: ${genesisValidation.found}/${genesisValidation.total} events valid`);
        console.log(`Memory tiers: working=${this.workingMemory.items.length}, episodic=${this.episodicMemory.items.length}`);

        // Check if we need to load system events from backend
        this.loadSystemEventsIfNeeded();

        // Start consolidation timer if enabled
        if (this.memoryConfig.autoConsolidate) {
            this.startConsolidationTimer();
        }
    },

    /**
     * Initialize memory tiers from storage
     */
    initMemoryTiers() {
        // Load episodic memory from storage
        const savedEpisodic = this.loadFromStorage('prostochat_episodic');
        if (savedEpisodic) {
            this.episodicMemory.items = savedEpisodic;
        }

        // Load semantic memory from storage
        const savedSemantic = this.loadFromStorage('prostochat_semantic');
        if (savedSemantic) {
            this.semanticMemory = { ...this.semanticMemory, ...savedSemantic };
        }

        // Initialize working memory for new session
        this.workingMemory.items = [];
        this.workingMemory.sessionStart = new Date().toISOString();

        // Apply decay to episodic memory
        if (this.memoryConfig.decayEnabled) {
            this.applyEpisodicDecay();
        }
    },

    /**
     * Start automatic consolidation timer
     */
    startConsolidationTimer() {
        setInterval(() => {
            this.consolidateMemory();
        }, this.memoryConfig.consolidationInterval);
    },

    /**
     * Load system events (bootstrap, thesaurus) from backend if not present
     * Called on first start when localStorage is empty
     */
    async loadSystemEventsIfNeeded() {
        // Check if we already have bootstrap/thesaurus events
        const hasBootstrap = this.events.some(e => e.id && e.id.startsWith('bootstrap_'));
        const hasThesaurus = this.events.some(e => e.id && e.id.startsWith('thesaurus_'));

        if (hasBootstrap && hasThesaurus) {
            console.log('System events already loaded');
            return;
        }

        console.log('Loading system events from backend...');

        try {
            const response = await fetch(`${CONFIG.apiUrl}/api/events`);
            if (!response.ok) {
                console.warn('Failed to fetch system events:', response.status);
                return;
            }

            const serverEvents = await response.json();
            const existingIds = new Set(this.events.map(e => e.id));
            let addedCount = 0;

            // Add only system events that we don't have
            serverEvents.forEach(evt => {
                if (!existingIds.has(evt.id) && isSystemId(evt.id)) {
                    evt.synced = true;
                    this.events.push(evt);
                    existingIds.add(evt.id);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                // Save to localStorage
                this.saveToStorage(CONFIG.storage.events, this.getLocalEvents());
                console.log(`Loaded ${addedCount} system events from backend`);

                // Update UI
                if (typeof renderEvents === 'function') renderEvents();
                if (typeof updateStats === 'function') updateStats();
                if (typeof renderEventsModal === 'function') renderEventsModal();
            }
        } catch (e) {
            console.warn('Failed to load system events:', e.message);
        }
    },

    /**
     * Validate and repair genesis events
     * @returns {Object} Validation report
     */
    validateAndRepairGenesis() {
        const validation = validateGenesis(this.events);

        if (!validation.valid) {
            console.warn('Genesis validation failed, repairing...');
            const repair = repairGenesis(this.events);

            // Save repaired events to storage
            this.saveToStorage(CONFIG.storage.events, this.getLocalEvents());

            return {
                total: validation.total,
                found: validation.found,
                repaired: repair.added.length,
                valid: true
            };
        }

        return {
            total: validation.total,
            found: validation.found,
            repaired: 0,
            valid: true
        };
    },

    /**
     * Get genesis validation report
     */
    getGenesisStatus() {
        return getGenesisReport(this.events);
    },

    /**
     * Rebuild world - recalculate Model and Cause for all events
     * This is a repair/migration function
     * cause is an ARRAY of event IDs per BSL spec (A2, A3)
     */
    rebuildWorld() {
        console.log('=== REBUILDING WORLD ===');
        const startTime = Date.now();
        let modelsFixed = 0;
        let causesFixed = 0;
        let chainsValidated = 0;

        // Sort events by date to process in order
        const sortedEvents = [...this.events].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        // First pass: rebuild models
        console.log('Pass 1: Rebuilding models...');
        sortedEvents.forEach(event => {
            const oldModel = event.model;
            const newModel = this.inferModelForEvent(event);

            if (newModel !== oldModel) {
                event.model = newModel;
                modelsFixed++;
            }
        });

        // Second pass: rebuild causes (as arrays per BSL spec)
        console.log('Pass 2: Rebuilding causes...');

        // Process events in chronological order
        const processedEvents = [];
        sortedEvents.forEach(event => {
            const oldCause = event.cause;
            const newCause = this.rebuildCauseForEvent(event, processedEvents);

            // Normalize both to arrays for comparison
            const oldArr = Array.isArray(oldCause) ? oldCause : (oldCause ? [oldCause] : []);
            const newArr = Array.isArray(newCause) ? newCause : (newCause ? [newCause] : []);

            if (JSON.stringify(oldArr) !== JSON.stringify(newArr)) {
                event.cause = newArr;
                causesFixed++;
            }

            processedEvents.push(event);
        });

        // Third pass: validate all chains lead to genesis
        console.log('Pass 3: Validating chains to genesis...');
        let brokenChains = [];
        this.events.forEach(event => {
            if (!isGenesisId(event.id)) {
                const validation = this.validateCauseChain(event.id);
                if (!validation.valid) {
                    brokenChains.push({ id: event.id, error: validation.error });
                } else {
                    chainsValidated++;
                }
            }
        });

        if (brokenChains.length > 0) {
            console.warn(`Found ${brokenChains.length} broken chains, fixing...`);
            brokenChains.forEach(({ id, error }) => {
                const event = this.events.find(e => e.id === id);
                if (event) {
                    // Try to find proper semantic cause based on event type
                    const { base, type } = event;
                    let fixedCause = null;

                    // Find appropriate genesis/root event for this type
                    if (type === 'Individual') {
                        // Link to Concept
                        const conceptEvent = this.events.find(e =>
                            e.base === 'Concept' && e.type === 'Instance' && e.value === base
                        );
                        fixedCause = conceptEvent ? [conceptEvent.id] : ['Concept'];
                    } else if (type === 'Model') {
                        const conceptEvent = this.events.find(e =>
                            e.base === 'Concept' && e.type === 'Instance' && e.value === base
                        );
                        fixedCause = conceptEvent ? [conceptEvent.id] : ['Model'];
                    } else if (type === 'Instance') {
                        fixedCause = ['Instance'];
                    } else if (type === 'SetModel') {
                        const individualEvent = this.events.find(e =>
                            e.type === 'Individual' && e.value === base
                        );
                        fixedCause = individualEvent ? [individualEvent.id] : ['Individual'];
                    } else {
                        // Property event - link to SetModel or Individual
                        const setModelEvent = [...this.events].reverse().find(e =>
                            e.base === base && e.type === 'SetModel'
                        );
                        if (setModelEvent) {
                            fixedCause = [setModelEvent.id];
                        } else {
                            const individualEvent = this.events.find(e =>
                                e.type === 'Individual' && e.value === base
                            );
                            fixedCause = individualEvent ? [individualEvent.id] : ['Event'];
                        }
                    }

                    event.cause = fixedCause || ['Event'];
                    causesFixed++;
                    console.log(`Fixed broken chain for ${id}: ${JSON.stringify(event.cause)}`);
                }
            });
        }

        // Save to storage
        this.saveToStorage(CONFIG.storage.events, this.getLocalEvents());

        const duration = Date.now() - startTime;
        const report = {
            totalEvents: this.events.length,
            modelsFixed,
            causesFixed,
            chainsValidated,
            brokenChains: brokenChains.length,
            duration: `${duration}ms`
        };

        console.log('=== REBUILD COMPLETE ===');
        console.log(`Total events: ${report.totalEvents}`);
        console.log(`Models fixed: ${modelsFixed}`);
        console.log(`Causes fixed: ${causesFixed}`);
        console.log(`Chains validated: ${chainsValidated}`);
        console.log(`Duration: ${duration}ms`);

        return report;
    },

    /**
     * Rebuild cause array for event during world rebuild
     * Uses processedEvents as history
     * Returns array of cause IDs per BSL spec (A2, A3, W3)
     *
     * Per BSL spec, cause contains:
     * - refs_explicit: semantic causes (concept, individual, setmodel)
     * - refs_auto_chain: previous event by same actor for same (model, base) - W3
     * - refs_base: context creation events
     */
    rebuildCauseForEvent(event, processedEvents) {
        // Genesis events keep their original cause
        if (isGenesisEvent(event)) {
            const cause = event.cause;
            return Array.isArray(cause) ? cause : (cause ? [cause] : []);
        }

        const { base, type, value, actor, model } = event;
        const causes = new Set(); // Use Set to avoid duplicates

        // === refs_explicit: semantic causes ===

        // 1. For Individual events - link to Concept Instance
        if (type === 'Individual') {
            const conceptEvent = processedEvents.find(e =>
                e.base === 'Concept' && e.type === 'Instance' && e.value === base
            );
            if (conceptEvent) {
                causes.add(conceptEvent.id);
            } else {
                causes.add('Concept');
            }
        }

        // 2. For Model events - link to Concept Instance
        else if (type === 'Model') {
            const conceptEvent = processedEvents.find(e =>
                e.base === 'Concept' && e.type === 'Instance' && e.value === base
            );
            if (conceptEvent) {
                causes.add(conceptEvent.id);
            } else {
                causes.add('Model');
            }
        }

        // 3. For Instance events - link to genesis Instance
        else if (type === 'Instance') {
            causes.add('Instance');
        }

        // 4. For SetModel events - link to Individual
        else if (type === 'SetModel') {
            const individualEvent = processedEvents.find(e =>
                e.type === 'Individual' && e.value === base
            );
            if (individualEvent) {
                causes.add(individualEvent.id);
            } else {
                causes.add('Individual');
            }
        }

        // 5. For property events - link to SetModel or Individual (refs_base)
        else {
            const setModelEvent = [...processedEvents].reverse().find(e =>
                e.base === base && e.type === 'SetModel'
            );
            if (setModelEvent) {
                causes.add(setModelEvent.id);
            } else {
                const individualEvent = processedEvents.find(e =>
                    e.type === 'Individual' && e.value === base
                );
                if (individualEvent) {
                    causes.add(individualEvent.id);
                }
            }
        }

        // === refs_auto_chain: W3 (Actor-serial per key) ===
        // Per BSL spec: for partition per actor per key (where k=(model,base))
        // events of actor a by key k form a chain by hb
        // This ensures uniqueness of max in LWW (A7)
        if (actor && model && base) {
            const prevByActorKey = processedEvents.filter(e =>
                e.actor === actor &&
                e.model === model &&
                e.base === base &&
                e.id !== event.id
            );
            if (prevByActorKey.length > 0) {
                // Get the last (most recent) event by this actor for this key
                const lastPrev = prevByActorKey[prevByActorKey.length - 1];
                causes.add(lastPrev.id);
            }
        }

        // Fallback if no causes found
        if (causes.size === 0) {
            causes.add('Event');
        }

        return Array.from(causes);
    },

    /**
     * Infer model for any event type
     * EVERY event must have a model - no nulls allowed
     */
    inferModelForEvent(event) {
        const { base, type, value } = event;

        // Genesis events already have model defined
        if (isGenesisEvent(event)) {
            return event.model || 'Event';
        }

        // Instance events (Concept: Instance: X) - use Meta
        if (type === 'Instance') {
            return 'Meta';
        }

        // Individual events - link to concept model
        if (type === 'Individual') {
            // Model is "Model {Concept}"
            return `Model ${base}`;
        }

        // Model events (X: Model: Model X) - use Meta
        if (type === 'Model') {
            return 'Meta';
        }

        // SetModel event - model is the value itself
        if (type === 'SetModel') {
            return value;
        }

        // Attribute/Relation definitions in models
        if (type === 'Attribute' || type === 'Relation') {
            // Check if base is a model name
            const parentModel = this.events.find(e =>
                e.type === 'Model' && e.value === base
            );
            if (parentModel) {
                return parentModel.value;
            }
        }

        // For property events on individuals - infer from SetModel
        const modelFromBase = this.inferModelForBase(base);
        if (modelFromBase) {
            return modelFromBase;
        }

        // Fallback: use base as model context
        return base || 'Unknown';
    },


    /**
     * Generate unique event ID
     */
    generateId() {
        return 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Add event to memory
     * Automatically fills cause and model based on BSL semantics
     * Skips if event with same ID already exists
     *
     * cause is an ARRAY of event IDs per BSL spec (A2, A3)
     * Chain through causes must lead to genesis
     */
    addEvent(eventData) {
        // Check for duplicate by ID
        if (eventData.id && this.events.some(e => e.id === eventData.id)) {
            console.debug(`Skipping duplicate event: ${eventData.id}`);
            return this.events.find(e => e.id === eventData.id);
        }

        // Auto-determine model if not provided
        let model = eventData.model;
        if (!model && eventData.base && eventData.type !== 'Individual' && eventData.type !== 'Model' && eventData.type !== 'Instance') {
            model = this.inferModelForBase(eventData.base);
        }

        // Ensure model is never null
        if (!model) {
            model = this.inferModelForEvent({
                base: eventData.base,
                type: eventData.type,
                value: eventData.value,
                actor: eventData.actor || 'user'
            });
        }

        const eventId = eventData.id || this.generateId();
        const actor = eventData.actor || this.currentActor || 'user';
        const base = eventData.base;
        const type = eventData.type;
        const value = eventData.value;

        // Validate required fields
        if (!base || !type) {
            console.error('Invalid event - missing base or type:', eventData);
            return null;
        }

        // Determine cause array using priority:
        // 1. Explicit cause (from eventData)
        // 2. Base reference (link to individual/concept - semantic cause)
        // 3. Fallback to genesis
        let cause = this._determineCause(eventData, actor, model, base, type, value);

        // Ensure cause is always an array per BSL spec (A2, A3)
        if (!Array.isArray(cause)) {
            cause = cause ? [cause] : ['Event'];
        }
        if (cause.length === 0) {
            cause = ['Event'];  // Ultimate fallback
            console.warn(`Event ${eventId} has no cause, linking to root Event`);
        }

        // Check acyclicity before adding (I2, W2)
        // Per BSL spec: cause graph must be a DAG (no cycles)
        const acyclicityCheck = this.checkAcyclicity(eventId, cause);
        if (!acyclicityCheck.valid) {
            console.error('Acyclicity violation (I2, W2):', acyclicityCheck.error);
            // Fix by removing cyclic causes and falling back to Event
            cause = cause.filter(c => {
                const check = this.checkAcyclicity(eventId, [c]);
                return check.valid;
            });
            if (cause.length === 0) {
                cause = ['Event'];
                console.warn(`Event ${eventId} cause reset to Event due to cycle`);
            }
        }

        // Validate against model restrictions (BSL spec)
        const validation = this.validateEvent({
            base: base,
            type: type,
            value: value,
            actor: actor,
            model: model
        });

        if (!validation.valid) {
            console.warn('Validation errors:', validation.errors);
            // Dispatch validation event for UI to handle
            window.dispatchEvent(new CustomEvent('validationError', {
                detail: { eventData: { base, type, value, actor }, errors: validation.errors }
            }));
            // Continue with event creation but log the errors
            // In strict mode, could return null here
        }

        const event = {
            id: eventId,
            base: base,
            type: type,
            value: value,
            actor: actor,
            model: model,
            date: eventData.date || new Date().toISOString(),
            cause: cause,  // Array of cause IDs per BSL spec
            synced: false
        };

        // Increment vector clock for this actor (sync causality tracking)
        if (typeof Sync !== 'undefined' && Sync.tickClock) {
            const vectorSnapshot = Sync.tickClock(actor);
            if (vectorSnapshot) {
                event.vector = vectorSnapshot.toJSON();
            }
        }

        this.events.push(event);
        this.saveToStorage(CONFIG.storage.events, this.getLocalEvents());

        // Add to memory tiers (non-genesis events only)
        if (!this._isGenesisEvent(event) && event.actor !== 'system') {
            this.addToWorkingMemory(event.id);
        }

        // Check if any pending subscriptions should be triggered
        this.checkPendingSubscriptions(event);

        return event;
    },

    // ========================================
    // CAUSE DETERMINATION (Array per BSL spec A2, A3, W3)
    // ========================================

    /**
     * Determine cause array for event
     * Returns array of cause IDs per BSL spec (A2, A3)
     * Implements auto_chain rule (W3): automatically adds previous event with same key
     *
     * Priority:
     * 1. Explicit cause/trigger (from eventData) - semantic dependencies
     * 2. Auto_chain (W3): last event with same (actor, base, type) key
     * 3. Last event with same base (base history chain)
     * 4. Last event by same actor (actor chain) - ordering
     * 5. Semantic cause based on event type (for first events)
     * 6. Genesis fallback
     */
    _determineCause(eventData, actor, model, base, type, value) {
        const causes = [];

        // 1. Explicit cause/trigger takes priority (Condition/SetValue dependencies)
        if (eventData.cause) {
            if (Array.isArray(eventData.cause) && eventData.cause.length > 0) {
                causes.push(...eventData.cause);
            } else if (typeof eventData.cause === 'string' && eventData.cause) {
                causes.push(eventData.cause);
            }
        }

        // 2. Auto_chain rule (W3): automatically add previous event with same key
        // Per BSL spec: key = (model, base) per actor
        // This ensures uniqueness of max in LWW (A7) and ExistsMax queries
        if (model && base && actor) {
            const lastEventWithKey = [...this.events]
                .reverse()
                .find(e =>
                    e.actor === actor &&
                    e.model === model &&
                    e.base === base &&
                    e.id !== eventData.id
                );

            if (lastEventWithKey && !causes.includes(lastEventWithKey.id)) {
                causes.push(lastEventWithKey.id);
            }
        }

        // If we have causes from explicit or auto_chain, return them
        if (causes.length > 0) {
            return causes;
        }

        // 3. Base History - last event with same base (most common)
        const lastEventWithBase = [...this.events]
            .reverse()
            .find(e => e.base === base && e.id !== eventData.id);

        if (lastEventWithBase) {
            return [lastEventWithBase.id];
        }

        // 4. Actor Chain - last event by same actor (for ordering)
        if (actor && actor !== 'System' && actor !== 'system' && actor !== 'genesis') {
            const lastActorEvent = [...this.events]
                .reverse()
                .find(e => e.actor === actor && e.id !== eventData.id);

            if (lastActorEvent) {
                return [lastActorEvent.id];
            }
        }

        // 5. Semantic cause for first event of this base
        return this._getSemanticCause(base, type, value);
    },

    /**
     * Get semantic cause based on BSL event relationships
     * Returns array of cause IDs per BSL spec (A2, A3)
     *
     * Causality chain:
     * - Instance → genesis "Instance"
     * - Individual → Concept Instance event
     * - Model → Concept Instance event
     * - SetModel → Individual event
     * - Property → SetModel event (or Individual if no SetModel)
     * - Attribute/Relation in model → Model event
     */
    _getSemanticCause(base, type, value) {
        // Instance events (Concept: Instance: X) → genesis Instance
        if (type === 'Instance') {
            return ['Instance'];
        }

        // Individual events (Concept: Individual: Name) → Concept Instance
        if (type === 'Individual') {
            const conceptEvent = this.events.find(e =>
                e.base === 'Concept' && e.type === 'Instance' && e.value === base
            );
            return conceptEvent ? [conceptEvent.id] : ['Concept'];
        }

        // Model events (Concept: Model: Model Concept) → Concept Instance
        if (type === 'Model') {
            const conceptEvent = this.events.find(e =>
                e.base === 'Concept' && e.type === 'Instance' && e.value === base
            );
            return conceptEvent ? [conceptEvent.id] : ['Model'];
        }

        // SetModel events (IndividualName: SetModel: Model X) → Individual
        if (type === 'SetModel') {
            const individualEvent = this.events.find(e =>
                e.type === 'Individual' && e.value === base
            );
            return individualEvent ? [individualEvent.id] : ['Individual'];
        }

        // Attribute/Relation definitions in model context
        if (type === 'Attribute' || type === 'Relation') {
            // Check if base is a model event ID
            const modelEvent = this.events.find(e =>
                e.type === 'Model' && e.id === base
            );
            if (modelEvent) {
                return [modelEvent.id];
            }
            // Or base is model name
            const modelByName = this.events.find(e =>
                e.type === 'Model' && e.value === base
            );
            if (modelByName) {
                return [modelByName.id];
            }
        }

        // Property events on individuals → SetModel (or Individual)
        // This is the most common case for runtime events
        const setModelEvent = [...this.events]
            .reverse()
            .find(e => e.base === base && e.type === 'SetModel');

        if (setModelEvent) {
            return [setModelEvent.id];
        }

        // Fallback: link to Individual
        const individualEvent = this.events.find(e =>
            e.type === 'Individual' && e.value === base
        );
        if (individualEvent) {
            return [individualEvent.id];
        }

        // Ultimate fallback
        return ['Event'];
    },

    /**
     * Check if event is genesis event
     */
    _isGenesisEvent(event) {
        return event.actor === 'genesis' ||
               (event.id && typeof event.id === 'string' &&
                (event.id.length <= 20 && !event.id.startsWith('#')));
    },

    /**
     * Legacy: Infer cause for event (backwards compatibility)
     * Returns array of cause IDs per BSL spec
     */
    inferCauseForEvent(eventData) {
        const causes = this._determineCause(
            eventData,
            eventData.actor || 'user',
            eventData.model,
            eventData.base,
            eventData.type,
            eventData.value
        );
        return Array.isArray(causes) ? causes : (causes ? [causes] : ['Event']);
    },

    /**
     * Compute transitive closure of cause (happens-before)
     * Returns all event IDs in the cause chain to genesis
     * Handles cause as array per BSL spec (A2, A3)
     */
    computeHb(eventId) {
        const chain = [];
        const event = this.events.find(e => e.id === eventId);
        if (!event || !event.cause) return [];

        const visited = new Set();
        const queue = Array.isArray(event.cause) ? [...event.cause] : [event.cause];

        // BFS through cause graph to genesis
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (!currentId || visited.has(currentId)) continue;

            visited.add(currentId);
            chain.push(currentId);

            const causeEvent = this.events.find(e => e.id === currentId);
            if (causeEvent && causeEvent.cause) {
                const causes = Array.isArray(causeEvent.cause) ? causeEvent.cause : [causeEvent.cause];
                causes.forEach(c => {
                    if (c && !visited.has(c)) queue.push(c);
                });
            }
        }

        return chain;
    },

    /**
     * Check if e1 happens-before e2
     * hb(e1, e2) = e1 ∈ tc(cause(e2))
     */
    happensBefore(e1Id, e2Id) {
        const hbSet = this.computeHb(e2Id);
        return hbSet.includes(e1Id);
    },

    /**
     * Check acyclicity before adding event (I2, W2)
     * Verifies that adding new cause references won't create a cycle
     * Returns { valid: true } or { valid: false, error: string }
     *
     * Per BSL spec (I2, W2): cause graph must be a DAG (Directed Acyclic Graph)
     */
    checkAcyclicity(newEventId, causeArray) {
        if (!causeArray || causeArray.length === 0) {
            return { valid: true };
        }

        const visited = new Set([newEventId]);
        const queue = [...causeArray];

        // BFS through cause graph - if we ever find newEventId, there's a cycle
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (!currentId) continue;

            // Self-reference is a cycle
            if (currentId === newEventId) {
                return {
                    valid: false,
                    error: `Cycle detected: event ${newEventId} would reference itself through cause chain`
                };
            }

            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Get causes of current event
            const event = this.events.find(e => e.id === currentId);
            if (event && event.cause) {
                const causes = Array.isArray(event.cause) ? event.cause : [event.cause];
                causes.forEach(causeId => {
                    if (causeId && !visited.has(causeId)) {
                        queue.push(causeId);
                    }
                });
            }
        }

        return { valid: true };
    },

    /**
     * Validate that event chains to genesis
     * Handles cause as array per BSL spec (A2, A3)
     * Uses BFS to find path to any genesis event
     */
    validateCauseChain(eventId, maxDepth = 100) {
        const path = [eventId];
        const visited = new Set([eventId]);
        const queue = [{ id: eventId, depth: 0 }];

        while (queue.length > 0) {
            const { id: currentId, depth } = queue.shift();

            if (depth > maxDepth) {
                return { valid: false, path: [...visited], error: 'Max depth exceeded - possible cycle' };
            }

            // Check if we reached genesis
            if (isGenesisId(currentId)) {
                return { valid: true, path: [...visited], genesisReached: currentId };
            }

            const event = this.events.find(e => e.id === currentId);
            if (!event) {
                // If event not found but we're at genesis ID, that's valid
                if (depth === 0) {
                    return { valid: false, path, error: `Event not found: ${currentId}` };
                }
                continue;
            }

            if (!event.cause || (Array.isArray(event.cause) && event.cause.length === 0)) {
                return { valid: false, path: [...visited], error: `No cause for event: ${currentId}` };
            }

            // Process all causes (array format)
            const causes = Array.isArray(event.cause) ? event.cause : [event.cause];
            for (const causeId of causes) {
                if (!causeId) continue;

                // Check for cycles
                if (visited.has(causeId)) {
                    return { valid: false, path: [...visited], error: `Cycle detected at: ${causeId}` };
                }

                visited.add(causeId);
                queue.push({ id: causeId, depth: depth + 1 });
            }
        }

        return { valid: false, path: [...visited], error: 'No path to genesis found' };
    },

    /**
     * Infer model for a base (individual)
     */
    inferModelForBase(base) {
        // Look for SetModel event for this base
        const setModelEvent = this.events.find(e => e.base === base && e.type === 'SetModel');
        if (setModelEvent) {
            return setModelEvent.value;
        }

        // Look for Individual event to get concept
        const individualEvent = this.events.find(e => e.type === 'Individual' && e.value === base);
        if (individualEvent) {
            return `Model ${individualEvent.base}`;
        }

        return null;
    },

    // ========================================
    // GRAPH WALKER - Dynamic ontology discovery
    // ========================================

    /**
     * Get all event types defined in genesis
     * These are events where base='Event' and type='Instance'
     * Returns type names dynamically from the graph
     */
    getEventTypes() {
        return this.events
            .filter(e => e.base === 'Event' && e.type === 'Instance')
            .map(e => e.value);
    },

    /**
     * Get all instances of a given type
     * @param typeName - e.g., 'Concept', 'Model', 'Individual', 'Attribute'
     * @returns Array of events with type === typeName
     */
    getInstancesOfType(typeName) {
        return this.events.filter(e => e.type === typeName);
    },

    /**
     * Get events that have this event as their cause (children in graph)
     * Handles cause as array per BSL spec (A2, A3)
     * @param eventId - ID of parent event
     * @returns Array of child events
     */
    getEventChildren(eventId) {
        return this.events.filter(e => {
            if (!e.cause) return false;
            const causes = Array.isArray(e.cause) ? e.cause : [e.cause];
            return causes.includes(eventId);
        });
    },

    /**
     * Get cause chain (ancestors) up to genesis
     * Handles cause as array per BSL spec (A2, A3)
     * Returns all ancestor IDs (BFS through cause graph)
     * @param eventId - Starting event ID
     * @returns Array of ancestor event IDs
     */
    getEventAncestors(eventId) {
        const chain = [];
        const visited = new Set([eventId]);
        const event = this.events.find(e => e.id === eventId);

        if (!event || !event.cause) return chain;

        const queue = Array.isArray(event.cause) ? [...event.cause] : [event.cause];

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (!currentId || visited.has(currentId)) continue;

            visited.add(currentId);
            chain.push(currentId);

            const causeEvent = this.events.find(e => e.id === currentId);
            if (causeEvent && causeEvent.cause) {
                const causes = Array.isArray(causeEvent.cause) ? causeEvent.cause : [causeEvent.cause];
                causes.forEach(c => {
                    if (c && !visited.has(c)) queue.push(c);
                });
            }
        }
        return chain;
    },

    /**
     * Check if event is instance of type (directly or through base chain)
     * @param eventId - Event to check
     * @param typeName - Type name to check against
     * @returns boolean
     */
    isEventOfType(eventId, typeName) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return false;
        if (event.type === typeName) return true;
        if (event.value === typeName) return true;

        // Check through base chain
        const baseEvent = this.events.find(e => e.id === event.base || e.value === event.base);
        if (baseEvent && baseEvent.value === typeName) return true;

        return false;
    },

    /**
     * Query events by graph traversal
     * Handles cause as array per BSL spec (A2, A3)
     * @param query - { type?, base?, value?, cause?, actor? }
     * @returns Array of matching events
     */
    queryGraph(query) {
        return this.events.filter(e => {
            if (query.type && e.type !== query.type) return false;
            if (query.base && e.base !== query.base) return false;
            if (query.value && e.value !== query.value) return false;
            if (query.cause) {
                const causes = Array.isArray(e.cause) ? e.cause : [e.cause];
                if (!causes.includes(query.cause)) return false;
            }
            if (query.actor && e.actor !== query.actor) return false;
            return true;
        });
    },

    /**
     * Find events by path in graph
     * Handles cause as array per BSL spec (A2, A3)
     * @param path - e.g., ['Concept', 'Individual'] to find all individuals of concepts
     * @returns Array of events at the end of the path
     */
    queryByPath(path) {
        if (path.length === 0) return this.events;

        let current = this.events.filter(e =>
            e.id === path[0] || e.value === path[0]
        );

        for (let i = 1; i < path.length; i++) {
            const step = path[i];
            const parentIds = new Set(current.map(e => e.id));
            current = this.events.filter(e => {
                const causes = Array.isArray(e.cause) ? e.cause : [e.cause];
                const hasParent = causes.some(c => parentIds.has(c));
                return hasParent && (e.type === step || e.value === step);
            });
        }

        return current;
    },

    /**
     * Get ontology structure from graph
     * Returns dynamic description of the world
     * @returns Object with type names as keys and instance info as values
     */
    getOntology() {
        const types = this.getEventTypes();
        const ontology = {};

        types.forEach(typeName => {
            const instances = this.getInstancesOfType(typeName);
            ontology[typeName] = {
                count: instances.length,
                instances: instances.map(e => ({
                    id: e.id,
                    value: e.value,
                    base: e.base
                }))
            };
        });

        return ontology;
    },

    /**
     * Get all existing models in memory (uses graph)
     * Models are events with type='Model' (from graph)
     */
    getExistingModels() {
        const models = new Set();

        // Use graph query to find Model events
        this.getInstancesOfType('Model').forEach(e => {
            models.add(e.value);
        });

        // Also include SetModel values (for applied models)
        this.queryGraph({ type: 'SetModel' }).forEach(e => {
            models.add(e.value);
        });

        return Array.from(models);
    },

    /**
     * Get all existing concepts in memory (uses graph)
     * Concepts are defined in graph as Instance events with base='Concept'
     */
    getExistingConcepts() {
        const concepts = new Set();

        // Find concepts through graph - Instance events under Concept
        this.queryGraph({ type: 'Instance', base: 'Concept' }).forEach(e => {
            concepts.add(e.value);
        });

        // Also add bases of Individual events (each Individual belongs to a concept)
        this.getInstancesOfType('Individual').forEach(e => {
            concepts.add(e.base);
        });

        return Array.from(concepts);
    },

    /**
     * Create event (alias for addEvent)
     * Preferred API for creating new events
     */
    createEvent(eventData) {
        return this.addEvent(eventData);
    },

    /**
     * Add multiple events (skips duplicates)
     * Returns all results (including existing events if duplicate)
     */
    addEvents(eventsData) {
        const existingIds = new Set(this.events.map(e => e.id));
        const results = [];

        eventsData.forEach(e => {
            const isNew = !e.id || !existingIds.has(e.id);
            const result = this.addEvent(e);
            if (result) {
                results.push(result);
                if (isNew && result.id) {
                    existingIds.add(result.id);
                }
            }
        });

        return results;
    },

    /**
     * Get all events (including genesis)
     */
    getAllEvents() {
        return [...this.events];
    },

    /**
     * Get only local (non-genesis) events
     */
    getLocalEvents() {
        return this.events.filter(e => !isGenesisEvent(e));
    },

    /**
     * Get unsynced events (exclude system events - genesis, bootstrap, thesaurus)
     */
    getUnsyncedEvents() {
        return this.events.filter(e => !isSystemEvent(e) && !e.synced);
    },

    /**
     * Mark events as synced
     */
    markSynced(eventIds) {
        eventIds.forEach(id => {
            const event = this.events.find(e => e.id === id);
            if (event) event.synced = true;
        });
        this.saveToStorage(CONFIG.storage.events, this.getLocalEvents());
    },

    /**
     * Get events by base
     */
    getEventsByBase(base) {
        return this.events.filter(e => e.base === base);
    },

    /**
     * Get events by type
     */
    getEventsByType(type) {
        return this.events.filter(e => e.type === type);
    },

    /**
     * Get events by actor
     */
    getEventsByActor(actor) {
        return this.events.filter(e => e.actor === actor);
    },

    // ========================================
    // MEMORY TIERS OPERATIONS [1,2,4]
    // ========================================

    /**
     * Add event to working memory
     * Implements Miller's Law capacity limit (7±2)
     */
    addToWorkingMemory(eventId) {
        // Remove if already exists
        this.workingMemory.items = this.workingMemory.items.filter(id => id !== eventId);

        // Add to front (most recent)
        this.workingMemory.items.unshift(eventId);

        // Enforce capacity limit - overflow goes to episodic
        while (this.workingMemory.items.length > this.workingMemory.capacity) {
            const overflow = this.workingMemory.items.pop();
            this.addToEpisodicMemory(overflow);
        }
    },

    /**
     * Add event to episodic memory with importance scoring
     */
    addToEpisodicMemory(eventId, explicitImportance = null) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        // Check if already exists
        const existing = this.episodicMemory.items.find(item => item.eventId === eventId);
        if (existing) {
            existing.accessCount++;
            existing.lastAccess = Date.now();
            existing.importance = this.recalculateImportance(existing, event);
            return;
        }

        // Calculate initial importance
        const importance = explicitImportance ?? this.calculateImportance(event);

        const episodicItem = {
            eventId,
            importance,
            accessCount: 1,
            lastAccess: Date.now(),
            createdAt: Date.now(),
            decay: 1.0  // Starts at full strength
        };

        this.episodicMemory.items.unshift(episodicItem);

        // Enforce max items - consolidate oldest/least important
        if (this.episodicMemory.items.length > this.episodicMemory.maxItems) {
            this.consolidateOverflow();
        }

        // Save to storage
        this.saveToStorage('prostochat_episodic', this.episodicMemory.items);
    },

    /**
     * Calculate importance score for event [3,4]
     * Factors: type, causal depth, actor, recency, content richness
     */
    calculateImportance(event) {
        let score = 0.5;  // Base score

        // Type importance
        const typeWeights = {
            'Individual': 0.8,
            'Model': 0.9,
            'SetModel': 0.7,
            'Concept': 0.95,
            'Instance': 0.6
        };
        score += (typeWeights[event.type] || 0.5) * 0.2;

        // Actor importance (user events more important than system)
        if (event.actor === 'user' || event.actor === 'manager') {
            score += 0.15;
        } else if (event.actor === 'llm') {
            score += 0.1;
        }

        // Causal depth (events with more causes are more connected)
        const causeCount = Array.isArray(event.cause) ? event.cause.length : (event.cause ? 1 : 0);
        score += Math.min(causeCount * 0.05, 0.15);

        // Content richness (longer values = more information)
        const valueLength = event.value ? String(event.value).length : 0;
        score += Math.min(valueLength / 500, 0.1);

        // Recency boost
        const ageHours = (Date.now() - new Date(event.date).getTime()) / 3600000;
        score += Math.max(0, 0.1 - ageHours * 0.001);

        return Math.min(Math.max(score, 0), 1);  // Clamp to [0,1]
    },

    /**
     * Recalculate importance based on access patterns
     */
    recalculateImportance(episodicItem, event) {
        const baseImportance = this.calculateImportance(event);

        // Boost for frequent access (Hebbian learning)
        const accessBoost = Math.min(episodicItem.accessCount * 0.02, 0.2);

        // Decay factor
        const decayPenalty = (1 - episodicItem.decay) * 0.3;

        return Math.min(baseImportance + accessBoost - decayPenalty, 1);
    },

    /**
     * Apply temporal decay to episodic memory (Ebbinghaus forgetting curve)
     */
    applyEpisodicDecay() {
        const now = Date.now();

        this.episodicMemory.items.forEach(item => {
            const hoursSinceAccess = (now - item.lastAccess) / 3600000;
            // Exponential decay: R = e^(-t/S) where S is stability
            const stability = item.accessCount * 10;  // More access = more stable
            item.decay = Math.exp(-hoursSinceAccess / stability);
        });

        // Remove items with very low decay (effectively forgotten)
        const forgotten = this.episodicMemory.items.filter(item => item.decay < 0.05);
        if (forgotten.length > 0) {
            console.log(`Forgetting ${forgotten.length} episodic items`);
            this.episodicMemory.items = this.episodicMemory.items.filter(item => item.decay >= 0.05);
            this.saveToStorage('prostochat_episodic', this.episodicMemory.items);
        }
    },

    /**
     * Consolidate memory: episodic → semantic
     * Extracts patterns and facts from episodic events
     */
    consolidateMemory() {
        console.log('Running memory consolidation...');

        // Find items below consolidation threshold
        const candidates = this.episodicMemory.items.filter(item =>
            item.decay < this.episodicMemory.consolidationThreshold &&
            item.importance >= this.memoryConfig.importanceThreshold
        );

        if (candidates.length === 0) {
            console.log('No items to consolidate');
            return;
        }

        // Group by concept
        const byConcept = {};
        candidates.forEach(item => {
            const event = this.events.find(e => e.id === item.eventId);
            if (!event) return;

            const concept = event.base;
            if (!byConcept[concept]) {
                byConcept[concept] = [];
            }
            byConcept[concept].push({ item, event });
        });

        // Consolidate each concept group
        Object.entries(byConcept).forEach(([concept, items]) => {
            this.consolidateConcept(concept, items);
        });

        // Remove consolidated items from episodic
        const consolidatedIds = new Set(candidates.map(c => c.eventId));
        this.episodicMemory.items = this.episodicMemory.items.filter(
            item => !consolidatedIds.has(item.eventId)
        );

        // Save updates
        this.saveToStorage('prostochat_episodic', this.episodicMemory.items);
        this.saveToStorage('prostochat_semantic', this.semanticMemory);

        console.log(`Consolidated ${candidates.length} items to semantic memory`);
    },

    /**
     * Consolidate items for a specific concept
     */
    consolidateConcept(conceptName, items) {
        if (!this.semanticMemory.concepts[conceptName]) {
            this.semanticMemory.concepts[conceptName] = {
                facts: [],
                relations: [],
                eventCount: 0,
                lastConsolidated: null
            };
        }

        const conceptMemory = this.semanticMemory.concepts[conceptName];

        items.forEach(({ item, event }) => {
            // Extract fact
            const fact = {
                type: event.type,
                value: event.value,
                importance: item.importance,
                sourceEventId: event.id,
                consolidatedAt: Date.now()
            };

            // Check for duplicates
            const existing = conceptMemory.facts.find(f =>
                f.type === fact.type && f.value === fact.value
            );

            if (existing) {
                // Strengthen existing fact
                existing.importance = Math.min(existing.importance + 0.1, 1);
            } else {
                conceptMemory.facts.push(fact);
            }

            conceptMemory.eventCount++;
        });

        conceptMemory.lastConsolidated = Date.now();
    },

    /**
     * Handle overflow when episodic memory is full
     */
    consolidateOverflow() {
        // Sort by combined score (low importance + high decay = first to go)
        this.episodicMemory.items.sort((a, b) => {
            const scoreA = a.importance * a.decay;
            const scoreB = b.importance * b.decay;
            return scoreA - scoreB;
        });

        // Remove bottom 10%
        const removeCount = Math.ceil(this.episodicMemory.items.length * 0.1);
        const toRemove = this.episodicMemory.items.slice(0, removeCount);

        // Try to consolidate important ones
        toRemove.forEach(item => {
            if (item.importance >= this.memoryConfig.importanceThreshold) {
                const event = this.events.find(e => e.id === item.eventId);
                if (event) {
                    this.consolidateConcept(event.base, [{ item, event }]);
                }
            }
        });

        this.episodicMemory.items = this.episodicMemory.items.slice(removeCount);
    },

    /**
     * Retrieve from memory tiers with priority:
     * 1. Working memory (fastest, most relevant)
     * 2. Episodic memory (recent, contextualized)
     * 3. Semantic memory (long-term facts)
     */
    retrieveFromTiers(query, limit = 20) {
        const results = {
            working: [],
            episodic: [],
            semantic: [],
            combined: []
        };

        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        // 1. Search working memory (all items, high priority)
        this.workingMemory.items.forEach(eventId => {
            const event = this.events.find(e => e.id === eventId);
            if (event) {
                results.working.push({
                    event,
                    tier: 'working',
                    priority: 1.0
                });
            }
        });

        // 2. Search episodic memory
        this.episodicMemory.items.forEach(item => {
            const event = this.events.find(e => e.id === item.eventId);
            if (!event) return;

            const content = JSON.stringify(event).toLowerCase();
            const matches = queryWords.filter(w => content.includes(w)).length;

            if (matches > 0) {
                results.episodic.push({
                    event,
                    tier: 'episodic',
                    priority: (item.importance * item.decay * matches) / queryWords.length,
                    episodicData: item
                });
            }
        });

        // 3. Search semantic memory
        Object.entries(this.semanticMemory.concepts).forEach(([concept, data]) => {
            if (concept.toLowerCase().includes(queryLower) ||
                queryWords.some(w => concept.toLowerCase().includes(w))) {

                data.facts.forEach(fact => {
                    results.semantic.push({
                        fact,
                        concept,
                        tier: 'semantic',
                        priority: fact.importance * 0.8
                    });
                });
            }
        });

        // Combine and rank
        results.combined = [
            ...results.working.map(r => ({ ...r, score: r.priority * 1.5 })),
            ...results.episodic.map(r => ({ ...r, score: r.priority * 1.2 })),
            ...results.semantic.map(r => ({ ...r, score: r.priority * 1.0 }))
        ].sort((a, b) => b.score - a.score).slice(0, limit);

        return results;
    },

    /**
     * Record access to event (strengthens memory)
     */
    accessEvent(eventId) {
        // Check if in working memory
        const workingIndex = this.workingMemory.items.indexOf(eventId);
        if (workingIndex !== -1) {
            // Move to front (LRU)
            this.workingMemory.items.splice(workingIndex, 1);
            this.workingMemory.items.unshift(eventId);
            return;
        }

        // Check if in episodic memory
        const episodicItem = this.episodicMemory.items.find(item => item.eventId === eventId);
        if (episodicItem) {
            episodicItem.accessCount++;
            episodicItem.lastAccess = Date.now();
            episodicItem.decay = 1.0;  // Reset decay on access

            // Promote to working memory if accessed frequently
            if (episodicItem.accessCount >= 3) {
                this.addToWorkingMemory(eventId);
            }
            return;
        }

        // Not in tiers - add to working memory
        this.addToWorkingMemory(eventId);
    },

    /**
     * Get memory stats for debugging
     */
    getMemoryTierStats() {
        return {
            working: {
                count: this.workingMemory.items.length,
                capacity: this.workingMemory.capacity,
                sessionStart: this.workingMemory.sessionStart
            },
            episodic: {
                count: this.episodicMemory.items.length,
                maxItems: this.episodicMemory.maxItems,
                avgImportance: this.episodicMemory.items.length > 0
                    ? this.episodicMemory.items.reduce((sum, i) => sum + i.importance, 0) / this.episodicMemory.items.length
                    : 0,
                avgDecay: this.episodicMemory.items.length > 0
                    ? this.episodicMemory.items.reduce((sum, i) => sum + i.decay, 0) / this.episodicMemory.items.length
                    : 0
            },
            semantic: {
                conceptCount: Object.keys(this.semanticMemory.concepts).length,
                totalFacts: Object.values(this.semanticMemory.concepts)
                    .reduce((sum, c) => sum + c.facts.length, 0),
                summaryCount: this.semanticMemory.summaries.length
            }
        };
    },

    // ========================================
    // ACTOR/ROLE MANAGEMENT
    // ========================================

    /**
     * Get current actor
     */
    getCurrentActor() {
        return this.currentActor;
    },

    /**
     * Set current actor and save to storage
     */
    setCurrentActor(actor) {
        this.currentActor = actor;
        this.saveToStorage('prostochat_actor', actor);
        console.log('Actor changed to:', actor);

        // Dispatch event for UI update
        window.dispatchEvent(new CustomEvent('actorChanged', { detail: { actor } }));
    },

    /**
     * Get available roles from events (Role: Individual: X)
     */
    getAvailableRoles() {
        const roleEvents = this.events.filter(e =>
            e.base === 'Role' && e.type === 'Individual'
        );
        return roleEvents.map(e => ({
            id: e.value,
            name: e.value,
            icon: this.getRoleIcon(e.value)
        }));
    },

    /**
     * Get available actors from events (Actor: Individual: X)
     */
    getAvailableActors() {
        const actorEvents = this.events.filter(e =>
            e.base === 'Actor' && e.type === 'Individual'
        );

        // Add common user actors
        const actors = [
            { id: 'user', name: 'User', icon: '👤' },
            { id: 'manager', name: 'Manager', icon: '👔' },
            { id: 'admin', name: 'Admin', icon: '🔧' }
        ];

        // Add actors from events (system, engine, guest, etc.)
        actorEvents.forEach(e => {
            if (!actors.find(a => a.id === e.value)) {
                actors.push({
                    id: e.value,
                    name: e.value.charAt(0).toUpperCase() + e.value.slice(1),
                    icon: this.getActorIcon(e.value)
                });
            }
        });

        return actors;
    },

    /**
     * Get icon for role
     */
    getRoleIcon(role) {
        const icons = {
            'Admin': '🔧',
            'Owner': '👑',
            'Manager': '👔',
            'User': '👤',
            'Guest': '👻'
        };
        return icons[role] || '👤';
    },

    /**
     * Get icon for actor
     */
    getActorIcon(actor) {
        const icons = {
            'system': '⚙️',
            'engine': '🔌',
            'guest': '👻',
            'user': '👤',
            'admin': '🔧',
            'manager': '👔',
            'llm': '🤖'
        };
        return icons[actor] || '👤';
    },

    /**
     * Get latest value for base:type pair
     */
    getLatestValue(base, type) {
        const events = this.events
            .filter(e => e.base === base && e.type === type)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        return events.length > 0 ? events[0].value : null;
    },

    /**
     * Get all individuals of a concept
     */
    getIndividuals(concept) {
        return this.events
            .filter(e => e.base === concept && e.type === 'Individual')
            .map(e => e.value);
    },

    /**
     * Build current state for an individual
     */
    getIndividualState(individualName) {
        const events = this.getEventsByBase(individualName);
        const state = { id: individualName };

        events.forEach(e => {
            if (e.type !== 'Individual') {
                state[e.type] = e.value;
            }
        });

        return state;
    },

    // === Chat Management ===

    /**
     * Create new chat
     */
    createChat(title = 'New Chat') {
        const chat = {
            id: 'chat_' + Date.now(),
            title: title,
            created: new Date().toISOString(),
            messages: []
        };

        this.chats.push(chat);
        this.currentChatId = chat.id;
        this.saveChats();

        return chat;
    },

    /**
     * Get current chat
     */
    getCurrentChat() {
        return this.chats.find(c => c.id === this.currentChatId);
    },

    /**
     * Switch to chat
     */
    switchToChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            this.currentChatId = chatId;
            this.saveToStorage(CONFIG.storage.currentChat, chatId);
            return chat;
        }
        return null;
    },

    /**
     * Add message to current chat
     */
    addMessage(role, content, metadata = {}) {
        const chat = this.getCurrentChat();
        if (!chat) return null;

        const message = {
            id: 'msg_' + Date.now(),
            role: role, // 'user' or 'llm'
            content: content,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        chat.messages.push(message);
        this.saveChats();

        return message;
    },

    /**
     * Get messages for current chat
     */
    getMessages() {
        const chat = this.getCurrentChat();
        return chat ? chat.messages : [];
    },

    /**
     * Delete chat
     */
    deleteChat(chatId) {
        const index = this.chats.findIndex(c => c.id === chatId);
        if (index > -1) {
            this.chats.splice(index, 1);
            if (this.currentChatId === chatId) {
                this.currentChatId = this.chats.length > 0 ? this.chats[0].id : null;
            }
            this.saveChats();
        }
    },

    /**
     * Save chats to storage
     */
    saveChats() {
        this.saveToStorage(CONFIG.storage.chats, this.chats);
        this.saveToStorage(CONFIG.storage.currentChat, this.currentChatId);
    },

    // === Storage Helpers ===

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn(`Failed to load ${key}:`, e);
            return null;
        }
    },

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn(`Failed to save ${key}:`, e);
        }
    },

    // === Statistics ===

    getStats() {
        const localEvents = this.getLocalEvents();
        const individuals = new Set(
            this.events
                .filter(e => e.type === 'Individual')
                .map(e => e.value)
        );

        return {
            total: this.events.length,
            local: localEvents.length,
            unsynced: this.getUnsyncedEvents().length,
            individuals: individuals.size,
            concepts: this.events.filter(e => e.type === 'Concept' && !isGenesisEvent(e)).length,
            chats: this.chats.length
        };
    },

    /**
     * Print event graph to console for debugging
     * Shows cause chains and structure
     */
    printGraph(options = {}) {
        const {
            limit = 50,           // Max events to show
            showGenesis = false,  // Include genesis events
            filterBase = null,    // Filter by base
            filterActor = null    // Filter by actor
        } = options;

        console.log('\n========== EVENT GRAPH ==========\n');

        let events = this.events;

        // Apply filters
        if (!showGenesis) {
            events = events.filter(e => !isGenesisEvent(e));
        }
        if (filterBase) {
            events = events.filter(e => e.base === filterBase);
        }
        if (filterActor) {
            events = events.filter(e => e.actor === filterActor);
        }

        // Limit
        events = events.slice(-limit);

        console.log(`Showing ${events.length} events:\n`);

        // Print each event with its cause chain
        events.forEach((e, i) => {
            const causeEvent = this.events.find(c => c.id === e.cause);
            const causeInfo = causeEvent
                ? `${causeEvent.base}:${causeEvent.type}:${causeEvent.value}`.substring(0, 30)
                : e.cause;

            console.log(
                `${i + 1}. [${e.id.substring(0, 8)}] ` +
                `${e.base}:${e.type}:${e.value}`.substring(0, 40) +
                `\n   cause: ${causeInfo} | actor: ${e.actor}`
            );
        });

        // Print cause tree for last few events
        console.log('\n---------- CAUSE CHAINS ----------\n');

        const recentEvents = events.slice(-5);
        recentEvents.forEach(e => {
            const chain = this.getEventAncestors(e.id);
            const chainStr = chain.slice(0, 5).map(id => {
                const ev = this.events.find(x => x.id === id);
                return ev ? `${ev.type}:${ev.value}`.substring(0, 15) : id.substring(0, 8);
            }).join(' → ');

            console.log(`${e.type}:${e.value} → ${chainStr}${chain.length > 5 ? '...' : ''}`);
        });

        // Stats by base
        console.log('\n---------- EVENTS BY BASE ----------\n');

        const byBase = {};
        events.forEach(e => {
            byBase[e.base] = (byBase[e.base] || 0) + 1;
        });

        Object.entries(byBase)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([base, count]) => {
                console.log(`  ${base}: ${count}`);
            });

        console.log('\n==================================\n');

        return { events: events.length, byBase };
    },

    /**
     * Clear user events (keep system events: genesis + bootstrap + thesaurus)
     */
    clearUserEvents() {
        // Keep only system events (genesis, bootstrap, thesaurus)
        this.events = this.events.filter(e => isSystemEvent(e));
        this.chats = [];
        this.currentChatId = null;
        this.subscriptions = [];
        localStorage.removeItem(CONFIG.storage.events);
        localStorage.removeItem(CONFIG.storage.chats);
        localStorage.removeItem(CONFIG.storage.currentChat);
        this.createChat('Default Chat');
    },

    /**
     * Get count of user events (non-system)
     */
    getUserEventsCount() {
        return this.events.filter(e => !isSystemEvent(e)).length;
    },

    /**
     * Get count of system events (genesis + bootstrap + thesaurus)
     */
    getSystemEventsCount() {
        return this.events.filter(e => isSystemEvent(e)).length;
    },

    // === Subscription Mechanism ===
    // For deferred event creation when Condition is not yet met

    /**
     * Add a subscription - will create event when condition is met
     * @param {Object} subscription - {condition, eventToCreate, actor}
     *   condition: {base, type, value} - event to wait for
     *   eventToCreate: {base, type, value, model} - event to create when condition met
     */
    addSubscription(subscription) {
        const sub = {
            id: 'sub_' + Date.now().toString(36),
            condition: subscription.condition,
            eventToCreate: subscription.eventToCreate,
            actor: subscription.actor || 'system',
            created: new Date().toISOString(),
            status: 'pending'
        };

        this.subscriptions.push(sub);
        console.log('Added subscription:', sub);

        // Check if condition is already met
        this.checkSubscription(sub);

        return sub;
    },

    /**
     * Check if a subscription's condition is met
     */
    checkSubscription(subscription) {
        const { condition } = subscription;

        // Find matching event
        const matchingEvent = this.events.find(e =>
            (!condition.base || e.base === condition.base) &&
            (!condition.type || e.type === condition.type) &&
            (!condition.value || e.value === condition.value)
        );

        if (matchingEvent) {
            // Condition met - create the target event
            this.triggerSubscription(subscription, matchingEvent);
            return true;
        }

        return false;
    },

    /**
     * Trigger a subscription - create the deferred event
     * Uses array for cause per BSL spec (A2, A3)
     */
    triggerSubscription(subscription, triggerEvent) {
        if (subscription.status === 'triggered') return;

        const eventData = {
            ...subscription.eventToCreate,
            actor: subscription.actor,
            cause: [triggerEvent.id] // Array cause - link to the event that triggered this
        };

        const createdEvent = this.addEvent(eventData);

        subscription.status = 'triggered';
        subscription.triggeredBy = triggerEvent.id;
        subscription.triggeredAt = new Date().toISOString();
        subscription.createdEventId = createdEvent.id;

        console.log('Subscription triggered:', subscription.id, '-> created event:', createdEvent.id);
    },

    /**
     * Check all pending subscriptions after a new event is added
     */
    checkPendingSubscriptions(newEvent) {
        const pending = this.subscriptions.filter(s => s.status === 'pending');

        pending.forEach(sub => {
            const { condition } = sub;

            // Check if new event matches the condition
            const matches =
                (!condition.base || newEvent.base === condition.base) &&
                (!condition.type || newEvent.type === condition.type) &&
                (!condition.value || newEvent.value === condition.value);

            if (matches) {
                this.triggerSubscription(sub, newEvent);
            }
        });
    },

    /**
     * Get all subscriptions
     */
    getSubscriptions() {
        return [...this.subscriptions];
    },

    /**
     * Get pending subscriptions
     */
    getPendingSubscriptions() {
        return this.subscriptions.filter(s => s.status === 'pending');
    },

    // ========================================
    // BSL QUERY EXECUTION
    // ========================================

    /**
     * Execute BSL query
     * Supports:
     *   $($EQ.$Base("Person"), $EQ.sex("man")) - find matching individuals
     *   $($EQ.$Model("Model Person")) - find by model
     *   result.property - access property
     *   result[0], result[-1] - indexing (first/last)
     *   result.$Actor, result.$Date - event metadata
     *
     * @param {string} query - BSL query string
     * @param {Object} context - Additional context for expression evaluation
     * @returns {any} Query result
     */
    executeQuery(query, context = {}) {
        if (!query || typeof query !== 'string') {
            return { error: 'Invalid query' };
        }

        try {
            // Check for property access on query result
            const propertyMatch = query.match(/^\$\([^)]+\)\.(.+)$/);
            if (propertyMatch) {
                const baseQuery = query.substring(0, query.lastIndexOf('.'));
                const property = propertyMatch[1];
                const baseResult = this._executeQueryCore(baseQuery);
                return this._accessProperty(baseResult, property);
            }

            // Check for indexing on query result
            const indexMatch = query.match(/^\$\([^)]+\)\[(-?\d+)\]$/);
            if (indexMatch) {
                const baseQuery = query.replace(/\[-?\d+\]$/, '');
                const index = parseInt(indexMatch[1]);
                const baseResult = this._executeQueryCore(baseQuery);
                return this._accessIndex(baseResult, index);
            }

            return this._executeQueryCore(query);
        } catch (e) {
            console.error('Query execution error:', e);
            return { error: e.message };
        }
    },

    /**
     * Execute core query logic
     */
    _executeQueryCore(query) {
        // Parse $(...) query
        const match = query.match(/^\$\(([^)]+)\)$/);
        if (!match) {
            // Not a query, might be a simple expression
            return this._evaluateSimpleExpr(query);
        }

        const conditions = match[1];
        return this._findMatchingIndividuals(conditions);
    },

    /**
     * Find individuals matching query conditions
     */
    _findMatchingIndividuals(conditions) {
        // Parse conditions: $EQ.$Base("Person"), $EQ.sex("man")
        const conditionList = this._parseConditions(conditions);

        // Start with all Individual events
        let candidates = this.events
            .filter(e => e.type === 'Individual')
            .map(e => e.value)
            .filter(name => !this.isDeleted(name)); // Exclude deleted

        // Apply each condition
        conditionList.forEach(cond => {
            candidates = candidates.filter(individual => {
                return this._checkCondition(individual, cond);
            });
        });

        // Return matching individuals with their current state
        return candidates.map(individual => ({
            id: individual,
            ...this.getIndividualState(individual)
        }));
    },

    /**
     * Parse query conditions into structured format
     */
    _parseConditions(conditionsStr) {
        const conditions = [];

        // Match patterns like: $EQ.$Base("Person"), $EQ.property("value")
        const pattern = /\$(\w+)\.(\$?\w+)\(([^)]+)\)/g;
        let match;

        while ((match = pattern.exec(conditionsStr)) !== null) {
            const operator = match[1]; // EQ, NE, GT, LT, GE, LE
            const field = match[2];     // $Base, $Model, property name
            let value = match[3];       // "value" or number

            // Remove quotes from string values
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            } else if (!isNaN(value)) {
                value = Number(value);
            }

            conditions.push({ operator, field, value });
        }

        return conditions;
    },

    /**
     * Check if individual matches a condition
     */
    _checkCondition(individual, condition) {
        const { operator, field, value } = condition;

        let actualValue;

        // Handle special fields
        if (field === '$Base') {
            // $Base checks the concept the individual belongs to
            const individualEvent = this.events.find(e =>
                e.type === 'Individual' && e.value === individual
            );
            actualValue = individualEvent ? individualEvent.base : null;
        } else if (field === '$Model') {
            // $Model checks the SetModel value
            const setModelEvent = this.events.find(e =>
                e.base === individual && e.type === 'SetModel'
            );
            actualValue = setModelEvent ? setModelEvent.value : null;
        } else if (field === '$Actor') {
            // $Actor checks the actor of Individual event
            const individualEvent = this.events.find(e =>
                e.type === 'Individual' && e.value === individual
            );
            actualValue = individualEvent ? individualEvent.actor : null;
        } else {
            // Regular property
            actualValue = this.getLatestValue(individual, field);
        }

        // Apply operator
        switch (operator) {
            case 'EQ':
                return actualValue == value;
            case 'NE':
                return actualValue != value;
            case 'GT':
                return actualValue > value;
            case 'LT':
                return actualValue < value;
            case 'GE':
                return actualValue >= value;
            case 'LE':
                return actualValue <= value;
            case 'CONTAINS':
                return String(actualValue).includes(String(value));
            case 'STARTS':
                return String(actualValue).startsWith(String(value));
            case 'ENDS':
                return String(actualValue).endsWith(String(value));
            default:
                return actualValue == value;
        }
    },

    /**
     * Access property on query result
     */
    _accessProperty(result, property) {
        if (!Array.isArray(result)) {
            return result ? result[property] : null;
        }

        // Check for event metadata access
        if (property.startsWith('$')) {
            const metaField = property.substring(1); // Remove $
            return result.map(item => {
                const event = this.events.find(e =>
                    e.base === item.id && e.type !== 'Individual'
                );
                if (metaField === 'Actor') return event?.actor;
                if (metaField === 'Date') return event?.date;
                if (metaField === 'Id') return event?.id;
                if (metaField === 'Cause') return event?.cause;
                return null;
            });
        }

        // Access property on each result
        return result.map(item => item[property]);
    },

    /**
     * Access index on query result
     * Supports positive [0] and negative [-1] indexing
     */
    _accessIndex(result, index) {
        if (!Array.isArray(result)) {
            return result;
        }

        if (result.length === 0) {
            return null;
        }

        // Handle negative index (from end)
        if (index < 0) {
            index = result.length + index;
        }

        if (index >= 0 && index < result.length) {
            return result[index];
        }

        return null;
    },

    /**
     * Evaluate simple expression (not a query)
     */
    _evaluateSimpleExpr(expr) {
        // Handle $CurrentActor
        if (expr === '$CurrentActor') {
            return this.currentActor;
        }

        // Handle $Now
        if (expr === '$Now' || expr === '$Now()') {
            return new Date().toISOString();
        }

        // Return as-is
        return expr;
    },

    /**
     * Query helper: find individuals by base (concept)
     */
    queryByBase(concept) {
        return this.executeQuery(`$($EQ.$Base("${concept}"))`);
    },

    /**
     * Query helper: find individuals by model
     */
    queryByModel(modelName) {
        return this.executeQuery(`$($EQ.$Model("${modelName}"))`);
    },

    /**
     * Query helper: find individuals with property value
     */
    queryByProperty(propertyName, value) {
        return this.executeQuery(`$($EQ.${propertyName}("${value}"))`);
    },

    // === Expression Evaluator for Condition/SetValue ===

    /**
     * Evaluate BSL expression in context of an individual
     * Supports: $.property, $$.property, comparisons, logical ops
     * @param {string} expr - Expression like "$.age >= 18" or "$.firstName && $.lastName"
     * @param {string} individualId - ID of the individual for context
     * @param {Object} extraContext - Additional context variables
     * @returns {any} Result of expression evaluation
     */
    evaluateExpression(expr, individualId, extraContext = {}) {
        if (!expr) return null;

        try {
            // Get current state of individual
            const state = this.getIndividualState(individualId);

            // Build context object
            const context = {
                $: state,                          // Current individual
                $$: this.createNullableProxy(state), // Nullable access
                $CurrentActor: extraContext.actor || 'user',
                $CurrentIndividual: individualId,
                $Now: () => new Date().toISOString(),
                $Value: extraContext.value,        // For ValueCondition
                ...extraContext
            };

            // Convert BSL expression to JavaScript
            const jsExpr = this.convertBslToJs(expr);

            // Create safe evaluation function
            const evalFunc = new Function(
                '$', '$$', '$CurrentActor', '$CurrentIndividual', '$Now', '$Value',
                `return (${jsExpr});`
            );

            return evalFunc(
                context.$,
                context.$$,
                context.$CurrentActor,
                context.$CurrentIndividual,
                context.$Now,
                context.$Value
            );
        } catch (e) {
            console.warn('Expression evaluation error:', expr, e);
            return null;
        }
    },

    /**
     * Create nullable proxy for $$ access (returns undefined instead of error)
     */
    createNullableProxy(obj) {
        return new Proxy(obj || {}, {
            get(target, prop) {
                return target[prop] !== undefined ? target[prop] : undefined;
            }
        });
    },

    /**
     * Convert BSL expression syntax to JavaScript
     * $.property -> $.property (already valid JS with context)
     * $EQ.property("value") -> property === "value"
     */
    convertBslToJs(expr) {
        let js = expr;

        // Handle $EQ.property("value") -> $.property === "value"
        js = js.replace(/\$EQ\.(\w+)\(([^)]+)\)/g, '($.$1 === $2)');

        // Handle $NE.property("value") -> $.property !== "value"
        js = js.replace(/\$NE\.(\w+)\(([^)]+)\)/g, '($.$1 !== $2)');

        // Handle $GT.property(value) -> $.property > value
        js = js.replace(/\$GT\.(\w+)\(([^)]+)\)/g, '($.$1 > $2)');

        // Handle $LT.property(value) -> $.property < value
        js = js.replace(/\$LT\.(\w+)\(([^)]+)\)/g, '($.$1 < $2)');

        // Handle $GE.property(value) -> $.property >= value
        js = js.replace(/\$GE\.(\w+)\(([^)]+)\)/g, '($.$1 >= $2)');

        // Handle $LE.property(value) -> $.property <= value
        js = js.replace(/\$LE\.(\w+)\(([^)]+)\)/g, '($.$1 <= $2)');

        // Handle $OR(...) -> (... || ...)
        js = js.replace(/\$OR\(([^,]+),\s*([^)]+)\)/g, '($1 || $2)');

        // Handle $AND(...) -> (... && ...)
        js = js.replace(/\$AND\(([^,]+),\s*([^)]+)\)/g, '($1 && $2)');

        return js;
    },

    /**
     * Check if a Condition is met for an individual
     */
    checkCondition(conditionExpr, individualId, extraContext = {}) {
        const result = this.evaluateExpression(conditionExpr, individualId, extraContext);
        return Boolean(result);
    },

    // === Guards (Condition + SetValue/SetDo) ===

    guards: [], // Active guards from models

    /**
     * Extract guards from all models in memory
     * Guard = { model, attribute, condition, action, actionType }
     */
    extractGuards() {
        this.guards = [];

        // Find all Model events
        const modelEvents = this.events.filter(e => e.type === 'Model');

        modelEvents.forEach(modelEvent => {
            // Get nested events for this model
            const nestedEvents = this.events.filter(e => e.base === modelEvent.id);

            // Find Attribute/Relation events
            const attributes = nestedEvents.filter(e =>
                e.type === 'Attribute' || e.type === 'Relation'
            );

            attributes.forEach(attr => {
                // Get restrictions for this attribute
                const attrNested = this.events.filter(e => e.base === attr.id);

                const conditionEvt = attrNested.find(e => e.type === 'Condition');
                const setValueEvt = attrNested.find(e => e.type === 'SetValue');
                const setDoEvt = attrNested.find(e => e.type === 'SetDo');
                const defaultEvt = attrNested.find(e => e.type === 'Default');

                // Create guard if we have Condition + Action
                if (conditionEvt && (setValueEvt || setDoEvt)) {
                    this.guards.push({
                        id: `guard_${attr.id}`,
                        model: modelEvent.value,
                        concept: modelEvent.base,
                        attribute: attr.value,
                        condition: conditionEvt.value,
                        action: setValueEvt?.value || setDoEvt?.value,
                        actionType: setValueEvt ? 'SetValue' : 'SetDo',
                        default: defaultEvt?.value
                    });
                }
            });
        });

        console.log(`Extracted ${this.guards.length} guards from models`);
        return this.guards;
    },

    /**
     * Find active guards for an individual
     * Active = Condition evaluates to true
     */
    findActiveGuards(individualId) {
        if (this.guards.length === 0) {
            this.extractGuards();
        }

        // Get individual's model
        const setModelEvent = this.events.find(e =>
            e.base === individualId && e.type === 'SetModel'
        );
        const modelName = setModelEvent?.value;

        if (!modelName) return [];

        // Filter guards by model and check conditions
        return this.guards
            .filter(guard => guard.model === modelName)
            .filter(guard => {
                return this.checkCondition(guard.condition, individualId);
            });
    },

    /**
     * Execute one step of dataflow for an individual
     * Returns generated events
     */
    executeDataflowStep(individualId) {
        const activeGuards = this.findActiveGuards(individualId);
        const generatedEvents = [];

        activeGuards.forEach(guard => {
            if (guard.actionType === 'SetValue') {
                // Check if value already exists
                const existing = this.events.find(e =>
                    e.base === individualId && e.type === guard.attribute
                );

                if (!existing) {
                    // Evaluate SetValue expression
                    const value = this.evaluateExpression(guard.action, individualId);

                    if (value !== null && value !== undefined) {
                        const event = this.addEvent({
                            base: individualId,
                            type: guard.attribute,
                            value: value,
                            actor: 'system',
                            model: guard.model
                        });
                        generatedEvents.push(event);
                    }
                }
            } else if (guard.actionType === 'SetDo') {
                // Parse and execute SetDo action
                const action = this.parseSetDo(guard.action, individualId);
                if (action) {
                    const events = this.executeSetDo(action, guard);
                    generatedEvents.push(...events);
                }
            }
        });

        return generatedEvents;
    },

    /**
     * Parse SetDo expression
     * Supports: CreateIndividual(Concept, Name), SetProperty(Individual, Property, Value)
     */
    parseSetDo(expr, individualId) {
        if (expr.startsWith('CreateIndividual(')) {
            const match = expr.match(/CreateIndividual\(\s*(\w+)\s*,\s*(.+?)\s*\)/);
            if (match) {
                const name = this.evaluateExpression(match[2], individualId);
                return { action: 'CreateIndividual', concept: match[1], name };
            }
        }

        if (expr.startsWith('SetProperty(')) {
            const match = expr.match(/SetProperty\(\s*(.+?)\s*,\s*(\w+)\s*,\s*(.+?)\s*\)/);
            if (match) {
                const individual = this.evaluateExpression(match[1], individualId);
                const value = this.evaluateExpression(match[3], individualId);
                return { action: 'SetProperty', individual, property: match[2], value };
            }
        }

        return null;
    },

    /**
     * Execute SetDo action
     */
    executeSetDo(action, guard) {
        const events = [];

        if (action.action === 'CreateIndividual') {
            // Create new individual
            events.push(this.addEvent({
                base: action.concept,
                type: 'Individual',
                value: action.name,
                actor: 'system'
            }));

            // Set model for new individual
            const modelName = `Model ${action.concept}`;
            events.push(this.addEvent({
                base: action.name,
                type: 'SetModel',
                value: modelName,
                actor: 'system',
                model: modelName
            }));
        }

        if (action.action === 'SetProperty') {
            events.push(this.addEvent({
                base: action.individual,
                type: action.property,
                value: action.value,
                actor: 'system',
                model: guard.model
            }));
        }

        return events;
    },

    /**
     * Execute dataflow to fixpoint for an individual
     * @param {string} individualId
     * @param {number} maxIterations - Safety limit
     * @returns {Object} { iterations, events }
     */
    executeToFixpoint(individualId, maxIterations = 10) {
        let iteration = 0;
        const allEvents = [];

        while (iteration < maxIterations) {
            const newEvents = this.executeDataflowStep(individualId);

            if (newEvents.length === 0) {
                // Fixpoint reached
                break;
            }

            allEvents.push(...newEvents);
            iteration++;
        }

        console.log(`Dataflow fixpoint: ${iteration} iterations, ${allEvents.length} events`);
        return { iterations: iteration, events: allEvents };
    },

    // ========================================
    // RESTRICTIONS VALIDATION (BSL Spec)
    // ========================================

    /**
     * Validation error codes matching BSL spec
     */
    errorCodes: {
        required: 'VALUE_005',
        datatype: 'VALUE_001',
        range: 'VALUE_001',
        value_condition: 'VALUE_002',
        unique: 'VALUE_003',
        unique_identifier: 'VALUE_003',
        multiple: 'VALUE_004',
        immutable: 'SEMANTIC_005',
        permission: 'SEMANTIC_008'
    },

    /**
     * Validate event against model restrictions
     * Returns { valid: true } or { valid: false, errors: [...] }
     *
     * Per BSL spec validates:
     * - Required: обязательность заполнения
     * - Multiple: множественность значений
     * - DataType: тип данных (Numeric, Boolean, Text, DateTime, EnumType)
     * - Range: диапазон значений для Relation
     * - ValueCondition: валидация значения выражением
     * - Unique: уникальность среди индивидов концепта
     * - UniqueIdentifier: глобальная уникальность
     * - Immutable: запрет изменения
     * - Permission: права доступа актора
     */
    validateEvent(eventData) {
        const base = eventData.base;
        const type = eventData.type;
        const value = eventData.value;
        const actor = eventData.actor || 'user';

        // Skip validation for system/genesis events
        if (actor === 'System' || actor === 'genesis') {
            return { valid: true, errors: [] };
        }

        // Skip validation for system types
        const systemTypes = ['Instance', 'Model', 'Individual', 'SetModel', 'Attribute', 'Relation', 'Role'];
        if (systemTypes.includes(type)) {
            return { valid: true, errors: [] };
        }

        // Get model for this individual
        const setModelEvent = this.events.find(e =>
            e.base === base && e.type === 'SetModel'
        );

        if (!setModelEvent) {
            return { valid: true, errors: [] }; // No model = no validation
        }

        const modelName = setModelEvent.value;
        const restrictions = this.getFieldRestrictions(modelName, type);

        if (Object.keys(restrictions).length === 0) {
            return { valid: true, errors: [] }; // No restrictions for this field
        }

        const errors = [];

        // Validate Required
        if (restrictions.required && this._isRequiredValue(restrictions.required)) {
            if (this._isEmpty(value)) {
                errors.push({
                    type: 'Value Error',
                    code: this.errorCodes.required,
                    message: `Field '${type}' is required`,
                    field: type
                });
            }
        }

        // Validate DataType
        if (restrictions.datatype && !this._isEmpty(value)) {
            const datatypeError = this._validateDataType(restrictions.datatype, value, type);
            if (datatypeError) {
                errors.push(datatypeError);
            }
        }

        // Validate Range (for Relations)
        if (restrictions.range && !this._isEmpty(value)) {
            const rangeError = this._validateRange(restrictions.range, value, type);
            if (rangeError) {
                errors.push(rangeError);
            }
        }

        // Validate ValueCondition
        if (restrictions.valuecondition && !this._isEmpty(value)) {
            const conditionError = this._validateValueCondition(
                restrictions.valuecondition, value, base, type
            );
            if (conditionError) {
                errors.push(conditionError);
            }
        }

        // Validate Unique (within concept)
        if (restrictions.unique && this._isRequiredValue(restrictions.unique) && !this._isEmpty(value)) {
            const uniqueError = this._validateUnique(value, base, type);
            if (uniqueError) {
                errors.push(uniqueError);
            }
        }

        // Validate UniqueIdentifier (global)
        if (restrictions.uniqueidentifier && this._isRequiredValue(restrictions.uniqueidentifier) && !this._isEmpty(value)) {
            const uniqueIdError = this._validateUniqueIdentifier(value, type);
            if (uniqueIdError) {
                errors.push(uniqueIdError);
            }
        }

        // Validate Multiple
        if (restrictions.multiple !== undefined && !this._isRequiredValue(restrictions.multiple)) {
            const multipleError = this._validateMultiple(value, base, type);
            if (multipleError) {
                errors.push(multipleError);
            }
        }

        // Validate Immutable
        if (restrictions.immutable && this._isRequiredValue(restrictions.immutable)) {
            const immutableError = this._validateImmutable(value, base, type);
            if (immutableError) {
                errors.push(immutableError);
            }
        }

        // Validate Permission
        if (restrictions.permission) {
            const permissionError = this._validatePermission(restrictions.permission, actor, type);
            if (permissionError) {
                errors.push(permissionError);
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Check if value represents "required" (1, true, "1", "true")
     */
    _isRequiredValue(val) {
        return val === 1 || val === '1' || val === true || val === 'true';
    },

    /**
     * Check if value is empty
     */
    _isEmpty(value) {
        return value === null || value === undefined || value === '' ||
               (Array.isArray(value) && value.length === 0);
    },

    /**
     * Validate DataType restriction
     */
    _validateDataType(datatype, value, field) {
        switch (datatype) {
            case 'Numeric':
                if (typeof value !== 'number' && !/^-?\d+(\.\d+)?$/.test(String(value))) {
                    return {
                        type: 'Type Error',
                        code: this.errorCodes.datatype,
                        message: `Field '${field}': expected numeric value`,
                        field: field
                    };
                }
                break;

            case 'Boolean':
                if (![true, false, 'true', 'false', '1', '0', 1, 0].includes(value)) {
                    return {
                        type: 'Type Error',
                        code: this.errorCodes.datatype,
                        message: `Field '${field}': expected boolean value`,
                        field: field
                    };
                }
                break;

            case 'DateTime':
                const dateStr = String(value);
                const dateTest = new Date(dateStr);
                if (isNaN(dateTest.getTime())) {
                    return {
                        type: 'Type Error',
                        code: this.errorCodes.datatype,
                        message: `Field '${field}': expected ISO8601 date/time`,
                        field: field
                    };
                }
                break;

            case 'Text':
            case 'BasicType':
                // Text/BasicType accepts any string
                break;

            case 'EnumType':
                // EnumType requires checking AttributeValue - handled separately
                break;
        }
        return null;
    },

    /**
     * Validate Range restriction (for Relations)
     */
    _validateRange(range, value, field) {
        // Check if value is an individual of the specified concept
        const individual = this.events.find(e =>
            e.type === 'Individual' &&
            e.base === range &&
            e.value === String(value)
        );

        if (!individual) {
            return {
                type: 'Type Error',
                code: this.errorCodes.range,
                message: `Field '${field}': value must be an individual of '${range}'`,
                field: field
            };
        }
        return null;
    },

    /**
     * Validate ValueCondition restriction
     */
    _validateValueCondition(condition, value, base, field) {
        try {
            const result = this.evaluateExpression(condition, base, { value: value, $Value: value });
            if (result !== true && result !== 1 && result !== 'true' && result !== '1') {
                return {
                    type: 'Value Error',
                    code: this.errorCodes.value_condition,
                    message: `Field '${field}': value does not satisfy condition '${condition}'`,
                    field: field
                };
            }
        } catch (e) {
            // Skip validation on expression error
            console.warn('ValueCondition evaluation error:', e);
        }
        return null;
    },

    /**
     * Validate Unique restriction (within concept)
     */
    _validateUnique(value, base, field) {
        // Get concept for this individual
        const individualEvent = this.events.find(e =>
            e.type === 'Individual' && e.value === base
        );
        if (!individualEvent) return null;

        const concept = individualEvent.base;

        // Find all individuals of this concept with same field value
        const duplicates = this.events.filter(e => {
            if (e.type !== field || e.value !== String(value) || e.base === base) return false;

            // Check if this event belongs to same concept
            const ind = this.events.find(i =>
                i.type === 'Individual' && i.value === e.base
            );
            return ind && ind.base === concept;
        });

        if (duplicates.length > 0) {
            return {
                type: 'Value Error',
                code: this.errorCodes.unique,
                message: `Field '${field}': value '${value}' is not unique within concept`,
                field: field
            };
        }
        return null;
    },

    /**
     * Validate UniqueIdentifier restriction (global)
     */
    _validateUniqueIdentifier(value, field) {
        const duplicates = this.events.filter(e =>
            e.type === field && e.value === String(value)
        );

        if (duplicates.length > 0) {
            return {
                type: 'Value Error',
                code: this.errorCodes.unique_identifier,
                message: `Field '${field}': value '${value}' is not globally unique`,
                field: field
            };
        }
        return null;
    },

    /**
     * Validate Multiple restriction (single value only)
     */
    _validateMultiple(value, base, field) {
        const existing = this.events.filter(e =>
            e.base === base && e.type === field
        );

        if (existing.length > 0) {
            return {
                type: 'Value Error',
                code: this.errorCodes.multiple,
                message: `Field '${field}': multiple values not allowed`,
                field: field
            };
        }
        return null;
    },

    /**
     * Validate Immutable restriction
     */
    _validateImmutable(value, base, field) {
        const existing = this.events.find(e =>
            e.base === base && e.type === field
        );

        if (existing) {
            return {
                type: 'Semantic Error',
                code: this.errorCodes.immutable,
                message: `Field '${field}': cannot modify immutable field`,
                field: field
            };
        }
        return null;
    },

    /**
     * Validate Permission restriction
     */
    _validatePermission(permission, actor, field) {
        const allowedActors = permission.split(',').map(a => a.trim());

        // Check if actor has permission or is admin
        const actorRoles = this.getActorRoles(actor);
        if (allowedActors.includes(actor) || actorRoles.includes('admin')) {
            return null;
        }

        return {
            type: 'Semantic Error',
            code: this.errorCodes.permission,
            message: `Field '${field}': actor '${actor}' does not have permission`,
            field: field
        };
    },

    /**
     * Get roles for an actor
     */
    getActorRoles(actor) {
        return this.events
            .filter(e => e.type === 'Role' && e.base === actor)
            .map(e => e.value);
    },

    // ========================================
    // DELETE HANDLING (BSL compensating events)
    // ========================================

    /**
     * Mark an individual as deleted (soft delete via compensating event)
     * Creates a Delete: Individual: <name> event
     *
     * Per BSL spec: delete is a compensating event, not physical deletion
     * @param {string} individual - Individual name to delete
     * @param {string} actor - Actor performing the deletion
     * @returns {Object} Created delete event
     */
    markDeleted(individual, actor = 'user') {
        if (!individual) {
            console.error('markDeleted: individual is required');
            return null;
        }

        // Check if already deleted
        if (this.isDeleted(individual)) {
            console.warn(`Individual '${individual}' is already deleted`);
            return null;
        }

        // Create compensating Delete event
        const deleteEvent = this.addEvent({
            base: 'Delete',
            type: 'Individual',
            value: individual,
            actor: actor,
            model: 'Delete'
        });

        console.log(`Marked '${individual}' as deleted`);
        return deleteEvent;
    },

    /**
     * Restore a deleted individual (compensating event)
     * Creates a Restore: Individual: <name> event
     *
     * @param {string} individual - Individual name to restore
     * @param {string} actor - Actor performing the restoration
     * @returns {Object} Created restore event
     */
    restoreDeleted(individual, actor = 'user') {
        if (!individual) {
            console.error('restoreDeleted: individual is required');
            return null;
        }

        // Check if not deleted
        if (!this.isDeleted(individual)) {
            console.warn(`Individual '${individual}' is not deleted`);
            return null;
        }

        // Create compensating Restore event
        const restoreEvent = this.addEvent({
            base: 'Restore',
            type: 'Individual',
            value: individual,
            actor: actor,
            model: 'Restore'
        });

        console.log(`Restored '${individual}' from deletion`);
        return restoreEvent;
    },

    /**
     * Check if an individual is currently deleted
     * An individual is deleted if there are more Delete events than Restore events
     *
     * @param {string} individual - Individual name to check
     * @returns {boolean} True if deleted
     */
    isDeleted(individual) {
        if (!individual) return false;

        // Count Delete events for this individual
        const deleteCount = this.events.filter(e =>
            e.base === 'Delete' &&
            e.type === 'Individual' &&
            e.value === individual
        ).length;

        // Count Restore events for this individual
        const restoreCount = this.events.filter(e =>
            e.base === 'Restore' &&
            e.type === 'Individual' &&
            e.value === individual
        ).length;

        // Deleted if more deletes than restores
        return deleteCount > restoreCount;
    },

    /**
     * Get all deleted individuals
     * @returns {Array<string>} List of deleted individual names
     */
    getDeletedIndividuals() {
        // Get all individuals that have been deleted
        const deleteEvents = this.events.filter(e =>
            e.base === 'Delete' && e.type === 'Individual'
        );

        const deletedNames = new Set(deleteEvents.map(e => e.value));

        // Filter out those that have been restored
        return Array.from(deletedNames).filter(name => this.isDeleted(name));
    },

    /**
     * Get individuals of a concept, excluding deleted ones
     * @param {string} concept - Concept name
     * @returns {Array<string>} List of non-deleted individual names
     */
    getActiveIndividuals(concept) {
        return this.events
            .filter(e => e.base === concept && e.type === 'Individual')
            .map(e => e.value)
            .filter(name => !this.isDeleted(name));
    },

    /**
     * Get events for an individual, excluding if deleted
     * @param {string} individual - Individual name
     * @param {boolean} includeDeleted - Include even if deleted
     * @returns {Array} Events for the individual
     */
    getActiveEvents(individual, includeDeleted = false) {
        if (!includeDeleted && this.isDeleted(individual)) {
            return [];
        }
        return this.getEventsByBase(individual);
    },

    /**
     * Get model restrictions for a field
     * Returns: { condition, required, default, permission, valueCondition }
     */
    getFieldRestrictions(modelName, fieldName) {
        // Find model event
        const modelEvent = this.events.find(e =>
            e.type === 'Model' && e.value === modelName
        );
        if (!modelEvent) return {};

        // Find attribute/relation in model
        const attrEvent = this.events.find(e =>
            e.base === modelEvent.id &&
            (e.type === 'Attribute' || e.type === 'Relation') &&
            e.value === fieldName
        );
        if (!attrEvent) return {};

        // Get restrictions
        const restrictions = this.events.filter(e => e.base === attrEvent.id);
        const result = {};

        restrictions.forEach(r => {
            result[r.type.toLowerCase()] = r.value;
        });

        return result;
    },

    /**
     * Check if a field is accessible for an individual (Condition check)
     */
    isFieldAccessible(individualId, fieldName) {
        const setModelEvent = this.events.find(e =>
            e.base === individualId && e.type === 'SetModel'
        );
        if (!setModelEvent) return true; // No model = no restrictions

        const restrictions = this.getFieldRestrictions(setModelEvent.value, fieldName);

        if (restrictions.condition) {
            return this.checkCondition(restrictions.condition, individualId);
        }

        return true; // No condition = accessible
    },

    /**
     * Get accessible fields for an individual based on Conditions
     */
    getAccessibleFields(individualId) {
        const setModelEvent = this.events.find(e =>
            e.base === individualId && e.type === 'SetModel'
        );
        if (!setModelEvent) return [];

        const modelName = setModelEvent.value;
        const modelEvent = this.events.find(e =>
            e.type === 'Model' && e.value === modelName
        );
        if (!modelEvent) return [];

        // Get all attributes/relations
        const fields = this.events.filter(e =>
            e.base === modelEvent.id &&
            (e.type === 'Attribute' || e.type === 'Relation')
        );

        return fields
            .map(f => ({
                name: f.value,
                type: f.type,
                accessible: this.isFieldAccessible(individualId, f.value),
                restrictions: this.getFieldRestrictions(modelName, f.value)
            }))
            .filter(f => f.accessible);
    }
};
