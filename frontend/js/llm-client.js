/**
 * Prostochat LLM Client
 * Handles communication with LLM providers (OpenRouter + Claude)
 */

const LLMClient = {
    /**
     * Send message to LLM
     */
    async sendMessage(userMessage) {
        const provider = CONFIG.llm.provider;

        if (provider === 'openrouter') {
            return this.sendToOpenRouter(userMessage);
        } else if (provider === 'claude') {
            return this.sendToClaude(userMessage);
        } else {
            throw new Error(`Unknown LLM provider: ${provider}`);
        }
    },

    /**
     * Send to OpenRouter API
     */
    async sendToOpenRouter(userMessage) {
        const apiKey = CONFIG.llm.openrouter.apiKey;
        if (!apiKey) {
            throw new Error('OpenRouter API key not set. Please configure in settings.');
        }

        const messages = this.buildMessages(userMessage);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Prostochat'
            },
            body: JSON.stringify({
                model: CONFIG.llm.openrouter.model,
                messages: messages
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `OpenRouter error: ${response.status}`);
        }

        const data = await response.json();
        return this.parseResponse(data.choices[0].message.content);
    },

    /**
     * Send to Claude API
     */
    async sendToClaude(userMessage) {
        const apiKey = CONFIG.llm.claude.apiKey;
        if (!apiKey) {
            throw new Error('Claude API key not set. Please configure in settings.');
        }

        const messages = this.buildMessages(userMessage);
        const systemPrompt = this.getSystemPrompt();

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                system: systemPrompt,
                messages: messages.filter(m => m.role !== 'system')
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Claude error: ${response.status}`);
        }

        const data = await response.json();
        return this.parseResponse(data.content[0].text);
    },

    /**
     * Build messages array with context
     */
    buildMessages(userMessage) {
        const messages = [];

        // System prompt
        messages.push({
            role: 'system',
            content: this.getSystemPrompt()
        });

        // Add memory context - search relevant data based on user query
        const memoryContext = this.buildMemoryContext(userMessage);
        if (memoryContext) {
            messages.push({
                role: 'system',
                content: `=== MEMORY CONTEXT (USE ONLY THIS DATA) ===\n${memoryContext}\n=== END OF MEMORY CONTEXT ===\n\nIMPORTANT: Base your answer ONLY on the data above. Do not use external knowledge.`
            });
        }

        // Add chat history (limited)
        const chatMessages = Memory.getMessages();
        chatMessages.slice(-6).forEach(msg => {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        });

        // Add current message
        messages.push({
            role: 'user',
            content: userMessage
        });

        return messages;
    },

    /**
     * Build memory context from events - structured by individuals
     * Enhanced with full RAG pipeline: canonicalize → extract → classify → categorize → query → rank
     */
    buildMemoryContext(userQuery = '') {
        const events = Memory.getAllEvents();
        const lines = [];

        // Get existing models and concepts
        const models = Memory.getExistingModels();
        const concepts = Memory.getExistingConcepts();

        // Execute full RAG pipeline if query provided
        let ragResult = null;
        let tierResults = null;
        if (userQuery) {
            try {
                ragResult = this.executeRAGPipeline(userQuery);

                // Retrieve from memory tiers [1,2,4]
                tierResults = Memory.retrieveFromTiers(userQuery, 15);
            } catch (e) {
                console.warn('RAG pipeline error:', e);
            }
        }

        // 0. Memory Tiers Context (highest priority) [1,2,4]
        if (tierResults && tierResults.combined.length > 0) {
            lines.push('=== ACTIVE MEMORY (from cognitive tiers) ===');

            // Working memory items (current context)
            if (tierResults.working.length > 0) {
                lines.push('Working Memory (current session):');
                tierResults.working.slice(0, 5).forEach(r => {
                    lines.push(`  [W] ${r.event.base}:${r.event.type} = ${this.truncate(r.event.value, 50)}`);
                });
            }

            // Episodic memory items (recent, decaying)
            if (tierResults.episodic.length > 0) {
                lines.push('Episodic Memory (recent events):');
                tierResults.episodic.slice(0, 5).forEach(r => {
                    const decay = r.episodicData ? ` [decay:${r.episodicData.decay.toFixed(2)}]` : '';
                    lines.push(`  [E] ${r.event.base}:${r.event.type} = ${this.truncate(r.event.value, 50)}${decay}`);
                });
            }

            // Semantic memory (consolidated facts)
            if (tierResults.semantic.length > 0) {
                lines.push('Semantic Memory (long-term facts):');
                tierResults.semantic.slice(0, 5).forEach(r => {
                    lines.push(`  [S] ${r.concept}.${r.fact.type} = ${this.truncate(r.fact.value, 50)}`);
                });
            }

            lines.push('');
        }

        // 1. Query Analysis (from RAG pipeline)
        if (ragResult) {
            lines.push('=== QUERY ANALYSIS ===');

            // Canonicalization
            if (ragResult.canonical.replacements.length > 0) {
                lines.push(`Synonym replacements: ${ragResult.canonical.replacements.map(r => `${r.from}→${r.to}`).join(', ')}`);
            }

            // Intent classification
            if (ragResult.intent.schema) {
                lines.push(`Detected schema: ${ragResult.intent.schema}`);
            }

            // Modifiers
            if (ragResult.components.modifiers.length > 0) {
                lines.push(`Query type: ${ragResult.components.modifiers.join(', ')}`);
            }

            // Response strategy
            lines.push(`Response strategy: ${ragResult.responseStrategy}`);

            // Schema instruction
            if (ragResult.intent.instruction && ragResult.intent.instruction.prompt) {
                lines.push(`Extraction guidance: ${ragResult.intent.instruction.prompt}`);
            }

            lines.push('');
        }

        // 2. Models available
        if (models.length > 0) {
            lines.push('=== AVAILABLE MODELS ===');
            lines.push(models.join(', '));
            lines.push('');
        }

        // 3. Concepts available
        if (concepts.length > 0) {
            lines.push('=== AVAILABLE CONCEPTS ===');
            lines.push(concepts.join(', '));
            lines.push('');
        }

        // 4. Primary Terms (from RAG pipeline)
        if (ragResult && ragResult.components.primaryTerms.length > 0) {
            lines.push('=== PRIMARY TERMS ===');
            ragResult.components.primaryTerms.forEach(t => {
                const def = t.state.definition || '';
                const syn = t.state.synonym ? ` (syn: ${t.state.synonym})` : '';
                lines.push(`  ${t.id}${syn}: ${def}`);
            });
            lines.push('');

            // Related terms
            if (ragResult.components.relatedTerms.length > 0) {
                lines.push('=== RELATED TERMS ===');
                ragResult.components.relatedTerms.forEach(t => {
                    lines.push(`  ${t.id} [${t.relation}]: ${t.state.definition || ''}`);
                });
                lines.push('');
            }
        } else if (userQuery) {
            // Fallback to simple term search
            const terms = this.getRelevantTerms(userQuery);
            if (terms.length > 0) {
                lines.push('=== RELEVANT TERMS ===');
                terms.forEach(t => {
                    const def = t.state.definition || '';
                    const syn = t.state.synonym ? ` (${t.state.synonym})` : '';
                    lines.push(`  ${t.id}${syn}: ${def}`);
                });
                lines.push('');
            }
        }

        // 5. Causal chains (for multi-hop reasoning)
        if (ragResult && ragResult.causalChains.length > 0) {
            lines.push('=== CAUSAL RELATIONS ===');
            ragResult.causalChains.forEach(c => {
                if (c.cause && c.effect) {
                    lines.push(`  ${c.cause} → ${c.effect}`);
                    if (c.mechanism) lines.push(`    Mechanism: ${c.mechanism}`);
                }
            });
            lines.push('');
        }

        // 6. Relevant Fragments (ranked from RAG pipeline)
        if (ragResult && ragResult.fragments.length > 0) {
            lines.push('=== RELEVANT FRAGMENTS (ranked) ===');
            ragResult.fragments.slice(0, 5).forEach((f, i) => {
                const content = f.content || f.definition_text || f.description || '';
                const schema = f.schema ? `[${f.schema}]` : '';
                if (content) {
                    lines.push(`  [${i + 1}] ${schema} ${content.substring(0, 200)}...`);
                }
            });
            lines.push('');
        }

        // 7. Find all individuals and their data
        const individuals = this.getIndividualsWithData(events);

        if (individuals.length === 0) {
            lines.push('=== DATA IN MEMORY ===');
            lines.push('No individuals found in memory.');
            return lines.join('\n');
        }

        // 8. Search relevant individuals if query provided
        let relevantIndividuals = userQuery
            ? this.searchRelevantIndividuals(individuals, userQuery)
            : individuals;

        // 9. Apply classifier filtering (personalization)
        const preferences = ragResult?.categories || this.getUserPreferences();
        relevantIndividuals = this.filterByClassifiers(relevantIndividuals, preferences);

        // 10. Format individuals data
        lines.push('=== DATA IN MEMORY ===');
        lines.push(`Total individuals: ${individuals.length}`);
        if (userQuery && relevantIndividuals.length < individuals.length) {
            lines.push(`Relevant to query: ${relevantIndividuals.length}`);
        }
        lines.push('');

        // Group by concept
        const byConceptMap = {};
        relevantIndividuals.forEach(ind => {
            const concept = ind.concept || 'Unknown';
            if (!byConceptMap[concept]) byConceptMap[concept] = [];
            byConceptMap[concept].push(ind);
        });

        Object.entries(byConceptMap).forEach(([concept, inds]) => {
            lines.push(`--- ${concept} (${inds.length}) ---`);
            inds.slice(0, 20).forEach(ind => {
                const props = Object.entries(ind.properties)
                    .filter(([k, v]) => k !== 'SetModel' && v)
                    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
                    .join(', ');
                lines.push(`  ${ind.id}: ${props || '(no properties)'}`);
            });
            if (inds.length > 20) {
                lines.push(`  ... and ${inds.length - 20} more`);
            }
            lines.push('');
        });

        return lines.join('\n');
    },

    /**
     * Get all individuals with their properties
     */
    getIndividualsWithData(events) {
        const individuals = [];
        const individualEvents = events.filter(e => e.type === 'Individual');

        individualEvents.forEach(indEvent => {
            const id = indEvent.value;
            const concept = indEvent.base;
            const state = Memory.getIndividualState(id);

            // Skip deleted
            if (state.Delete === '1' || state.Delete === 1) return;

            individuals.push({
                id,
                concept,
                model: state.SetModel,
                properties: state
            });
        });

        return individuals;
    },

    // ========================================
    // RAG PIPELINE IMPLEMENTATION
    // Based on: canonicalize → extract → classify → categorize → query → rank → respond
    // ========================================

    /**
     * Step 1: Canonicalize query - replace synonyms with canonical terms
     */
    canonicalizeQuery(query, terms) {
        let canonicalQuery = query.toLowerCase();
        const replacements = [];

        // Get all terms with synonyms
        terms.forEach(t => {
            if (t.state.synonym) {
                const synonyms = t.state.synonym.split(',').map(s => s.trim().toLowerCase());
                synonyms.forEach(syn => {
                    if (canonicalQuery.includes(syn)) {
                        canonicalQuery = canonicalQuery.replace(new RegExp(syn, 'gi'), t.id);
                        replacements.push({ from: syn, to: t.id });
                    }
                });
            }
        });

        return {
            canonical_text: canonicalQuery,
            original: query,
            replacements,
            confidence: replacements.length > 0 ? 0.8 : 1.0
        };
    },

    /**
     * Step 2: Extract query components - primary terms, related, modifiers
     */
    extractQueryComponents(canonicalQuery, terms) {
        const queryWords = canonicalQuery.split(/\s+/).filter(w => w.length > 2);

        // Primary terms - exact matches
        const primaryTerms = terms.filter(t =>
            queryWords.some(w => t.id.toLowerCase().includes(w) ||
                (t.state.definition && t.state.definition.toLowerCase().includes(w)))
        );

        // Related terms via broader/related relations
        const relatedTerms = [];
        primaryTerms.forEach(pt => {
            if (pt.state.broader) {
                const broader = terms.find(t => t.id === pt.state.broader);
                if (broader) relatedTerms.push({ ...broader, relation: 'broader' });
            }
            if (pt.state.related) {
                const related = terms.find(t => t.id === pt.state.related);
                if (related) relatedTerms.push({ ...related, relation: 'related' });
            }
        });

        // Extract modifiers (intent indicators)
        const modifiers = this.extractModifiers(canonicalQuery);

        return {
            primaryTerms,
            relatedTerms,
            modifiers,
            queryWords
        };
    },

    /**
     * Extract query modifiers (intent indicators)
     */
    extractModifiers(query) {
        const modifierPatterns = {
            comparison: /сравни|compare|разница|versus|vs/i,
            definition: /что такое|define|определи|what is/i,
            howto: /как сделать|how to|как работает/i,
            example: /пример|example|покажи/i,
            list: /список|list|перечисли|all/i,
            cause: /почему|причина|why|because/i
        };

        const found = [];
        for (const [type, pattern] of Object.entries(modifierPatterns)) {
            if (pattern.test(query)) {
                found.push(type);
            }
        }
        return found;
    },

    /**
     * Step 3: Detect question type and select appropriate schema
     * Based on: "What is X?" → Definition, "Compare A and B" → Comparison, etc.
     */
    detectQuestionSchema(query) {
        const queryLower = query.toLowerCase();

        const patterns = [
            { pattern: /что\s+(такое|это|значит)|what\s+is|define|определи/i, schema: 'Definition' },
            { pattern: /сравни|compare|разница|difference|vs\.|versus/i, schema: 'Comparison' },
            { pattern: /почему|причина|следствие|why|because|cause|effect/i, schema: 'CausalRelation' },
            { pattern: /пример|example|instance|покажи/i, schema: 'Example' },
            { pattern: /как\s+работает|how\s+does|процесс|process|алгоритм|algorithm/i, schema: 'TechnicalProcess' },
            { pattern: /архитектура|компонент|module|architecture|component/i, schema: 'ArchitecturalComponent' },
            { pattern: /использовать|use\s+case|сценарий|scenario/i, schema: 'UseCase' },
            { pattern: /принцип|principle|правило|rule/i, schema: 'Principle' },
            { pattern: /проблема|решение|problem|solution|fix/i, schema: 'ProblemSolution' },
            { pattern: /функция|feature|возможност|capability/i, schema: 'Functionality' },
            { pattern: /код|code|snippet|пример\s+кода/i, schema: 'CodeSnippet' }
        ];

        for (const { pattern, schema } of patterns) {
            if (pattern.test(queryLower)) {
                return schema;
            }
        }
        return null; // General query
    },

    /**
     * Get SchemaInstruction for detected schema
     */
    getSchemaInstruction(schemaName) {
        if (!schemaName) return null;

        const events = Memory.getAllEvents();

        // Find SchemaInstruction with target_schema matching
        const instructions = events.filter(e =>
            e.type === 'Individual' &&
            e.base === 'SchemaInstruction'
        );

        for (const inst of instructions) {
            const state = Memory.getIndividualState(inst.value);
            if (state.target_schema === schemaName ||
                state.target_schema === `Model ${schemaName}`) {
                return {
                    schema: schemaName,
                    prompt: state.llm_prompt_template,
                    fields: state.extraction_fields
                };
            }
        }
        return null;
    },

    /**
     * Get relevant Fragments and Terms for context enrichment
     */
    getRelevantFragments(query, limit = 10) {
        const events = Memory.getAllEvents();
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        const fragments = [];
        const fragmentEvents = events.filter(e =>
            e.type === 'Individual' && e.base === 'Fragment'
        );

        fragmentEvents.forEach(fe => {
            const state = Memory.getIndividualState(fe.value);
            let score = 0;

            // Score by content match
            const content = JSON.stringify(state).toLowerCase();
            queryWords.forEach(word => {
                if (content.includes(word)) score += 2;
            });

            if (score > 0) {
                fragments.push({ id: fe.value, state, score });
            }
        });

        return fragments
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(f => f.state);
    },

    /**
     * Get Terms relevant to query (for semantic enrichment)
     */
    getRelevantTerms(query, limit = 15) {
        const events = Memory.getAllEvents();
        const queryLower = query.toLowerCase();

        const terms = [];
        const termEvents = events.filter(e =>
            e.type === 'Individual' && e.base === 'Term'
        );

        termEvents.forEach(te => {
            const state = Memory.getIndividualState(te.value);
            let score = 0;

            // Match by ID
            if (te.value.toLowerCase().includes(queryLower)) score += 5;

            // Match by synonym
            if (state.synonym && state.synonym.toLowerCase().includes(queryLower)) score += 4;

            // Match by definition
            if (state.definition && state.definition.toLowerCase().includes(queryLower)) score += 3;

            // Weight by importance
            if (state.importance) score *= (parseInt(state.importance) || 1);

            if (score > 0) {
                terms.push({ id: te.value, state, score });
            }
        });

        return terms
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    },

    /**
     * Find CausalRelation chains for multi-hop reasoning
     */
    findCausalChains(query, maxDepth = 3) {
        const events = Memory.getAllEvents();
        const queryLower = query.toLowerCase();

        // Find CausalRelation fragments
        const causalFragments = events.filter(e =>
            e.type === 'Individual' &&
            (e.base === 'CausalRelation' || e.base === 'Fragment')
        ).map(e => {
            const state = Memory.getIndividualState(e.value);
            return { id: e.value, ...state };
        }).filter(f => f.cause || f.effect);

        // Find relevant starting points
        const chains = [];
        causalFragments.forEach(cf => {
            const content = JSON.stringify(cf).toLowerCase();
            if (content.includes(queryLower) ||
                queryLower.split(/\s+/).some(w => content.includes(w))) {
                chains.push(cf);
            }
        });

        return chains.slice(0, 5);
    },

    /**
     * Get user preferences from classifiers (Audience, Difficulty)
     */
    getUserPreferences() {
        // Could be stored in session or detected from conversation
        // For now, return defaults
        return {
            audience: 'Developers',    // Default audience
            difficulty: 'Intermediate', // Default difficulty
            detailing: 'Detailed'       // Default detail level
        };
    },

    /**
     * Filter content by classifier preferences
     */
    filterByClassifiers(items, preferences) {
        if (!preferences || items.length === 0) return items;

        return items.filter(item => {
            // Check if item has classifier metadata
            if (!item.audience && !item.difficulty) return true;

            // Match audience
            if (item.audience && item.audience !== preferences.audience) {
                return false;
            }

            // Match difficulty (allow same or lower)
            const difficultyOrder = ['Basic', 'Intermediate', 'Advanced', 'Expert'];
            if (item.difficulty) {
                const itemLevel = difficultyOrder.indexOf(item.difficulty);
                const prefLevel = difficultyOrder.indexOf(preferences.difficulty);
                if (itemLevel > prefLevel) return false;
            }

            return true;
        });
    },

    /**
     * Step 5: Generate BSL-style queries for fragment retrieval
     */
    generateBSLQueries(components, intent, categories) {
        const queries = [];

        // Primary query by terms
        if (components.primaryTerms.length > 0) {
            queries.push({
                type: 'primary',
                terms: components.primaryTerms.map(t => t.id),
                schema: intent.schema,
                weight: 1.0
            });
        }

        // Related terms query
        if (components.relatedTerms.length > 0) {
            queries.push({
                type: 'related',
                terms: components.relatedTerms.map(t => t.id),
                schema: intent.schema,
                weight: 0.7
            });
        }

        // Category-based query
        if (categories.component) {
            queries.push({
                type: 'category',
                categories: [categories.component, categories.audience].filter(Boolean),
                weight: 0.5
            });
        }

        return queries;
    },

    /**
     * Step 6: Enhanced relevance scoring with weights
     */
    calculateRelevanceScore(fragment, queryComponents, intent) {
        let score = 0.0;

        // Exact term matches (weight: 2.0)
        const exactMatches = queryComponents.primaryTerms.filter(term =>
            JSON.stringify(fragment).toLowerCase().includes(term.id.toLowerCase())
        ).length;
        score += exactMatches * 2.0;

        // Related term matches (weight: 1.0)
        const relatedMatches = queryComponents.relatedTerms.filter(term =>
            JSON.stringify(fragment).toLowerCase().includes(term.id.toLowerCase())
        ).length;
        score += relatedMatches * 1.0;

        // Schema match (weight: 1.5)
        if (intent.schema && fragment.schema === intent.schema) {
            score += 1.5;
        }

        // Confidence bonus
        if (fragment.confidence) {
            score += parseFloat(fragment.confidence) * 0.5;
        }

        // Importance weight from term
        queryComponents.primaryTerms.forEach(term => {
            if (term.state.importance) {
                score *= (1 + parseInt(term.state.importance) * 0.1);
            }
        });

        return score;
    },

    /**
     * Step 6b: Select diverse fragments (avoid duplicates)
     */
    selectDiverseFragments(rankedFragments, maxCount = 10, diversityThreshold = 0.7) {
        const selected = [];
        const seenContent = new Set();

        for (const item of rankedFragments) {
            if (selected.length >= maxCount) break;

            // Simple diversity check - avoid very similar content
            const contentHash = JSON.stringify(item.fragment).substring(0, 100);
            let isDuplicate = false;

            for (const seen of seenContent) {
                const similarity = this.calculateSimilarity(contentHash, seen);
                if (similarity > diversityThreshold) {
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                selected.push(item);
                seenContent.add(contentHash);
            }
        }

        return selected;
    },

    /**
     * Simple string similarity (Jaccard-like)
     */
    calculateSimilarity(str1, str2) {
        const set1 = new Set(str1.toLowerCase().split(/\s+/));
        const set2 = new Set(str2.toLowerCase().split(/\s+/));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    },

    /**
     * Step 7: Determine response strategy
     */
    determineResponseStrategy(schemas, intent) {
        const formalSchemas = new Set([
            'Definition', 'CodeSnippet', 'Comparison',
            'Example', 'ArchitecturalComponent', 'TechnicalProcess'
        ]);

        const analyticalSchemas = new Set([
            'ProblemSolution', 'AdvantageDisadvantage',
            'UseCase', 'ConceptualModel'
        ]);

        if (schemas.some(s => formalSchemas.has(s))) {
            return 'formal_fragments';  // Direct fragment presentation
        } else if (schemas.some(s => analyticalSchemas.has(s))) {
            return 'synthesized_rag';   // LLM synthesis
        } else {
            return 'hybrid';            // Combined approach
        }
    },

    /**
     * Full RAG Pipeline execution
     */
    executeRAGPipeline(userQuery) {
        const events = Memory.getAllEvents();

        // Step 1: Get all terms
        const allTerms = this.getRelevantTerms(userQuery, 100);

        // Step 2: Canonicalize
        const canonical = this.canonicalizeQuery(userQuery, allTerms);

        // Step 3: Extract components
        const components = this.extractQueryComponents(canonical.canonical_text, allTerms);

        // Step 4: Classify intent
        const schema = this.detectQuestionSchema(userQuery);
        const intent = {
            schema,
            modifiers: components.modifiers,
            instruction: this.getSchemaInstruction(schema)
        };

        // Step 5: Get categories
        const categories = this.getUserPreferences();

        // Step 6: Get and rank fragments
        const rawFragments = this.getRelevantFragments(userQuery, 30);
        const rankedFragments = rawFragments.map(f => ({
            fragment: f,
            score: this.calculateRelevanceScore(f, components, intent)
        })).sort((a, b) => b.score - a.score);

        // Step 7: Select diverse top fragments
        const selectedFragments = this.selectDiverseFragments(rankedFragments);

        // Step 8: Determine response strategy
        const responseStrategy = this.determineResponseStrategy(
            [intent.schema].filter(Boolean),
            intent
        );

        return {
            canonical,
            components,
            intent,
            categories,
            fragments: selectedFragments.map(s => s.fragment),
            responseStrategy,
            causalChains: this.findCausalChains(userQuery)
        };
    },

    /**
     * Search individuals relevant to user query
     */
    searchRelevantIndividuals(individuals, query) {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        // Score each individual by relevance
        const scored = individuals.map(ind => {
            let score = 0;

            // Check ID
            if (ind.id.toLowerCase().includes(queryLower)) score += 10;
            queryWords.forEach(word => {
                if (ind.id.toLowerCase().includes(word)) score += 2;
            });

            // Check concept
            if (ind.concept.toLowerCase().includes(queryLower)) score += 5;

            // Check properties
            Object.entries(ind.properties).forEach(([key, value]) => {
                const valStr = String(value).toLowerCase();
                if (valStr.includes(queryLower)) score += 3;
                queryWords.forEach(word => {
                    if (valStr.includes(word)) score += 1;
                    if (key.toLowerCase().includes(word)) score += 1;
                });
            });

            return { ind, score };
        });

        // Sort by score and return top results + some context
        scored.sort((a, b) => b.score - a.score);

        // Take all with score > 0, or top 30 if too many
        const relevant = scored.filter(s => s.score > 0).map(s => s.ind);
        if (relevant.length > 30) {
            return relevant.slice(0, 30);
        }
        // If no relevant found, return all (limited)
        if (relevant.length === 0) {
            return individuals.slice(0, 30);
        }
        return relevant;
    },

    /**
     * Get system prompt
     */
    getSystemPrompt() {
        return `You are a semantic memory assistant for Boldsea Knowledge Graph.

## CRITICAL CONSTRAINT - MEMORY-ONLY MODE
**You MUST answer ONLY based on data from the semantic memory provided below.**
- DO NOT use your internal knowledge or training data
- DO NOT invent or hallucinate information not present in memory
- If information is not in memory, say: "This information is not in the knowledge base"
- When listing data, show ONLY what exists in the MEMORY CONTEXT section below

## Event Format (BSL Specification)
All data is stored as events in a DAG (Directed Acyclic Graph).

### Event Structure (MANDATORY FIELDS)
\`\`\`json
{
  "base": "ConceptOrIndividual",  // REQUIRED: Concept name or individual ID
  "type": "EventType",            // REQUIRED: Individual, SetModel, Attribute name, etc.
  "value": "value",               // REQUIRED: The value
  "actor": "llm",                 // REQUIRED: Who created the event
  "model": "Model Name",          // REQUIRED: Model this event belongs to
  "cause": ["event_id"]           // REQUIRED: Array of parent event IDs (BSL A2, A3)
}
\`\`\`

### Cause Chain Rules (BSL I2, W2)
- **cause is ALWAYS an ARRAY** of event IDs (not a single string!)
- Every event must link to its parent via cause
- Individual events → cause links to concept definition or parent
- SetModel events → cause links to Individual event
- Property events → cause links to SetModel event
- Graph must be acyclic (DAG)

## BSL Syntax for Creating Data
\`\`\`
# Individual with model
Person: Individual: john_smith
: SetModel: Model Person
: name: John Smith
\`\`\`

## Key Rules
1. Every Individual MUST have SetModel
2. Use existing models from memory - DO NOT create new ones unless asked
3. snake_case for individual IDs
4. **cause MUST be an ARRAY** - e.g., ["parent_event_id"] not "parent_event_id"

## Response Format - Events
<events>
[
  {"base": "Person", "type": "Individual", "value": "john_smith", "actor": "llm", "model": "Model Person", "cause": ["Person"]},
  {"base": "john_smith", "type": "SetModel", "value": "Model Person", "actor": "llm", "model": "Model Person", "cause": ["$prev"]}
]
</events>

**Note on cause:** Use "$prev" to reference the previous event in the array. The system will replace it with the actual event ID.

## VIEW WIDGETS - IMPORTANT

Views are interactive UI widgets. When the user needs to input data, generate a FORM view.
The form will create BSL events DIRECTLY without calling LLM again.

### Form View Structure (for data input)
\`\`\`json
<view>
{
  "type": "form",
  "title": "Create Person",
  "mode": "create",           // REQUIRED: "create" or "edit"
  "concept": "Person",        // REQUIRED: the BSL concept
  "model": "Model Person",    // REQUIRED: the BSL model
  "target": null,             // For edit: individual ID. For create: null or generated
  "fields": [
    {"name": "name", "label": "Name", "type": "text", "required": true},
    {"name": "age", "label": "Age", "type": "number"},
    {"name": "email", "label": "Email", "type": "text"},
    {"name": "spouse", "label": "Spouse", "type": "text", "condition": "$.age >= 18"}
  ],
  "actions": [
    {"label": "Create", "action": "submit", "primary": true},
    {"label": "Cancel", "action": "close"}
  ]
}
</view>
\`\`\`

### Field Types
Available field types:
- \`text\` - single line text input (default)
- \`number\` - numeric input
- \`date\` - date picker
- \`textarea\` - multi-line text
- \`select\` - dropdown list (requires options or range)

### Select Options Formats
For \`type: "select"\`, use one of these formats:

1. **Static array of strings:**
   \`{"type": "select", "options": ["low", "medium", "high"]}\`

2. **Concept name** - loads all individuals of concept:
   \`{"type": "select", "options": "Employee"}\` or \`"options": "$Employee"\`

3. **Range for relations:**
   \`{"type": "select", "range": "Person"}\` - shows all Person individuals

4. **Array of objects:**
   \`{"type": "select", "options": [{"value": "id1", "label": "John"}, {"value": "id2", "label": "Jane"}]}\`

Example - employee selector:
\`\`\`json
{"name": "employee", "label": "Employee", "type": "select", "options": "Employee"}
\`\`\`

### Field Conditions
Fields can have a \`condition\` property - BSL expression that controls visibility:
- Field is shown only when condition evaluates to true
- Uses \`$.\` prefix for current individual properties
- Examples: \`$.age >= 18\`, \`$.status == "active"\`, \`$.firstName && $.lastName\`

**Expression syntax:**
- \`$.property\` - access property value
- \`$$.property\` - nullable access (won't error if undefined)
- Comparisons: \`==\`, \`!=\`, \`>\`, \`<\`, \`>=\`, \`<=\`
- Logical: \`&&\`, \`||\`, \`!\`
- \`$CurrentActor\` - current user

### Card View Structure (for single individual)
\`\`\`json
<view>
{
  "type": "card",
  "title": "Person: John Smith",
  "concept": "Person",
  "model": "Model Person",
  "target": "john_smith",     // The individual ID for actions
  "fields": [
    {"label": "Name", "value": "John Smith"},
    {"label": "Age", "value": 30}
  ],
  "actions": [
    {"label": "Edit", "action": "edit", "target": "john_smith"},
    {"label": "Delete", "action": "delete", "target": "john_smith"}
  ]
}
</view>
\`\`\`

### Entity List View (for viewing all individuals of a type)
Use \`viewEntity\` WITHOUT \`target\` to show a list of ALL individuals:
\`\`\`json
<view>
{
  "type": "card",
  "title": "Current Vacations",
  "viewEntity": "Vacation",           // Entity type to list - NO target!
  "model": "Model Vacation",
  "fields": [
    {"label": "Employee", "value": "$.employee"},
    {"label": "Start Date", "value": "$.startDate"},
    {"label": "End Date", "value": "$.endDate"},
    {"label": "Status", "value": "$.status"}
  ]
}
</view>
\`\`\`
IMPORTANT: When \`viewEntity\` is set without \`target\`:
- The UI will automatically find ALL individuals of that entity type
- For each individual, \`$.property\` expressions are resolved to actual values
- Click on a row opens the detail view with Edit/Delete actions

### Action with Direct Event Creation
Actions can create events directly without LLM:
\`\`\`json
{
  "label": "Approve",
  "action": "approve",
  "target": "task_123",
  "event": {"type": "status", "value": "approved"}
}
\`\`\`

## MULTI-STAGE PROCESSES - IMPORTANT

For processes with multiple stages, return ALL stage views at once with Conditions.
The UI will automatically show the next stage when its condition is met.

### Example: Two-stage approval process
\`\`\`json
<view>
{
  "type": "form",
  "title": "Stage 1: Basic Info",
  "mode": "create",
  "concept": "Request",
  "model": "Model Request",
  "stage": "basic_info",
  "fields": [
    {"name": "title", "label": "Title", "required": true},
    {"name": "description", "label": "Description", "type": "textarea"}
  ],
  "actions": [{"label": "Next", "action": "submit", "primary": true}]
}
</view>
<view>
{
  "type": "form",
  "title": "Stage 2: Details",
  "mode": "edit",
  "concept": "Request",
  "model": "Model Request",
  "stage": "details",
  "condition": "$.title",
  "fields": [
    {"name": "priority", "label": "Priority", "type": "select", "options": ["low", "medium", "high"]},
    {"name": "deadline", "label": "Deadline", "type": "date"}
  ],
  "actions": [{"label": "Submit", "action": "submit", "primary": true}]
}
</view>
\`\`\`

Key points for multi-stage:
1. Return ALL views with appropriate \`condition\` properties
2. First stage: no condition (or always true)
3. Next stages: condition checks previous stage fields (e.g., "$.title" = title exists)
4. Use \`stage\` property to name stages
5. Use \`mode: "edit"\` for subsequent stages (same individual)

## When to Use Forms vs Events

1. **Use <events>** when YOU (the LLM) are extracting/creating data from the conversation
2. **Use <view type="form">** when the USER needs to input structured data
   - The form submits directly to the event graph, no LLM round-trip needed

## IMPORTANT: Reuse Existing Models

Before creating a new concept or model, ALWAYS check the existing models below.
If a similar model exists - USE IT instead of creating a new one.

### Existing Models in Memory:
${Memory.getExistingModels().join(', ') || 'None yet'}

### Existing Concepts in Memory:
${Memory.getExistingConcepts().join(', ') || 'None yet'}

**Rules for model reuse:**
1. If user mentions "person", "человек", "пользователь" → use "Model Person" if exists
2. If user mentions "task", "задача" → use "Model Task" if exists
3. If similar model exists with different name → use the existing one
4. Only create NEW model if nothing similar exists

## Default Concepts (with Models)
Person (Model Person), Task (Model Task), Organization (Model Organization),
Document, Fragment, View, Term, Category, Classifier

Respond naturally. Include <events> for LLM-created data, <view> for UI elements.`;
    },

    /**
     * Parse LLM response for events and views
     */
    parseResponse(content) {
        const result = {
            text: content,
            events: [],
            views: []  // Support multiple views
        };

        // Extract all events blocks
        const eventsRegex = /<events>([\s\S]*?)<\/events>/g;
        let eventsMatch;
        while ((eventsMatch = eventsRegex.exec(content)) !== null) {
            try {
                const parsed = JSON.parse(eventsMatch[1]);
                if (Array.isArray(parsed)) {
                    result.events.push(...parsed);
                }
            } catch (e) {
                console.warn('Failed to parse events:', e);
            }
        }
        result.text = result.text.replace(/<events>[\s\S]*?<\/events>/g, '').trim();

        // Extract all view blocks
        const viewRegex = /<view>([\s\S]*?)<\/view>/g;
        let viewMatch;
        while ((viewMatch = viewRegex.exec(content)) !== null) {
            try {
                const parsed = JSON.parse(viewMatch[1]);
                result.views.push(parsed);
            } catch (e) {
                console.warn('Failed to parse view:', e);
            }
        }
        result.text = result.text.replace(/<view>[\s\S]*?<\/view>/g, '').trim();

        // Backward compatibility: also expose first view as result.view
        result.view = result.views[0] || null;

        return result;
    },

    /**
     * Preprocess LLM events - resolve $prev references and normalize cause to arrays
     * Per BSL spec (A2, A3): cause must be an array of event IDs
     */
    preprocessLLMEvents(events, llmActor) {
        const processedEvents = [];
        let prevEventId = null;

        events.forEach((event, index) => {
            const processed = { ...event };

            // Update actor
            if (processed.actor === 'llm') {
                processed.actor = llmActor;
            }

            // Normalize cause to array (BSL A2, A3)
            if (processed.cause) {
                if (typeof processed.cause === 'string') {
                    processed.cause = [processed.cause];
                } else if (!Array.isArray(processed.cause)) {
                    processed.cause = [];
                }
            } else {
                processed.cause = [];
            }

            // Resolve $prev references
            processed.cause = processed.cause.map(causeId => {
                if (causeId === '$prev' || causeId === '$PREV') {
                    if (prevEventId) {
                        return prevEventId;
                    } else {
                        // Fallback: link to appropriate genesis based on type
                        return this.getDefaultCause(processed);
                    }
                }
                return causeId;
            });

            // If still no cause, infer from event type
            if (processed.cause.length === 0) {
                processed.cause = [this.getDefaultCause(processed)];
            }

            // Generate ID if not provided (for $prev resolution in next iteration)
            if (!processed.id) {
                processed.id = 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
            }

            prevEventId = processed.id;
            processedEvents.push(processed);
        });

        return processedEvents;
    },

    /**
     * Get default cause for LLM event based on its type
     */
    getDefaultCause(event) {
        const { base, type, value } = event;

        // Individual events link to their concept
        if (type === 'Individual') {
            return base; // Concept name
        }

        // SetModel events link to the individual
        if (type === 'SetModel') {
            // base is the individual name, try to find Individual event
            const individualEvent = Memory.events.find(e =>
                e.type === 'Individual' && e.value === base
            );
            return individualEvent ? individualEvent.id : 'Individual';
        }

        // Property events link to SetModel of the individual
        const setModelEvent = Memory.events.find(e =>
            e.base === base && e.type === 'SetModel'
        );
        if (setModelEvent) {
            return setModelEvent.id;
        }

        // Fallback to finding Individual event
        const individualEvent = Memory.events.find(e =>
            e.type === 'Individual' && e.value === base
        );
        if (individualEvent) {
            return individualEvent.id;
        }

        // Ultimate fallback
        return 'Event';
    },

    /**
     * Get current LLM actor name (model identifier)
     */
    getActorName() {
        const provider = CONFIG.llm.provider;
        if (provider === 'openrouter') {
            // Extract model name from full path (e.g., "anthropic/claude-3.5-sonnet" -> "claude-3.5-sonnet")
            const model = CONFIG.llm.openrouter.model || 'openrouter';
            return model.includes('/') ? model.split('/').pop() : model;
        } else if (provider === 'claude') {
            return 'claude-api';
        }
        return 'llm';
    },

    /**
     * Process LLM response - add events and views
     * Includes BSL validation and cause resolution
     */
    processResponse(response) {
        // Add events to memory with proper LLM actor
        if (response.events && response.events.length > 0) {
            const llmActor = this.getActorName();
            const validationErrors = [];
            const addedEvents = [];

            // Process events with $prev resolution and validation
            const processedEvents = this.preprocessLLMEvents(response.events, llmActor);

            processedEvents.forEach((eventData, index) => {
                // Validate event before adding
                const validation = Memory.validateEvent(eventData);

                if (!validation.valid) {
                    validationErrors.push({
                        event: eventData,
                        errors: validation.errors
                    });
                    console.warn(`LLM event validation failed:`, eventData, validation.errors);
                }

                // Add event (Memory.addEvent handles cause normalization)
                const added = Memory.addEvent(eventData);
                if (added) {
                    addedEvents.push(added);
                }
            });

            console.log(`Added ${addedEvents.length}/${response.events.length} events from ${llmActor}`);

            if (validationErrors.length > 0) {
                console.warn(`${validationErrors.length} events had validation errors (added anyway)`);
            }

            // Update events UI
            if (typeof renderEvents === 'function') renderEvents();
            if (typeof updateStats === 'function') updateStats();
        }

        // Add all view widgets - handle multi-stage
        if (response.views && response.views.length > 0) {
            let shownCount = 0;
            let registeredCount = 0;

            response.views.forEach(view => {
                // If view has a condition, register it as a stage view (will appear later)
                if (view.condition && view.stage) {
                    const modelName = view.model || `Model ${view.concept}`;
                    if (typeof registerStageView === 'function') {
                        registerStageView(modelName, view.stage, view);
                        registeredCount++;
                    }
                } else {
                    // Show immediately (first stage or no condition)
                    if (typeof addWidget === 'function') {
                        addWidget(view);
                        shownCount++;
                    }
                }
            });

            console.log(`Views: ${shownCount} shown, ${registeredCount} registered for later stages`);
        } else if (response.view) {
            // Backward compatibility
            if (typeof addWidget === 'function') addWidget(response.view);
        }

        return response.text;
    },

    /**
     * Truncate string to max length
     */
    truncate(str, maxLength) {
        if (!str) return '';
        const s = String(str);
        return s.length > maxLength ? s.substring(0, maxLength) + '...' : s;
    }
};

/**
 * Set LLM provider
 */
function setProvider(provider) {
    CONFIG.llm.provider = provider;
    saveLLMConfig();

    const select = document.getElementById('llm-provider');
    if (select) select.value = provider;
}
