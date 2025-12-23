/**
 * Prostochat UI Renderer
 * Renders View widgets from LLM responses and events
 */

const UIRenderer = {
    widgets: [],

    /**
     * Initialize renderer
     */
    init() {
        this.widgets = [];
        this.render();
    },

    /**
     * Add widget
     */
    addWidget(viewData) {
        const widget = {
            id: 'widget_' + Date.now(),
            ...viewData,
            created: new Date().toISOString()
        };

        this.widgets.unshift(widget);
        this.render();

        return widget;
    },

    /**
     * Remove widget
     */
    removeWidget(widgetId) {
        this.widgets = this.widgets.filter(w => w.id !== widgetId);
        this.render();
    },

    /**
     * Clear all widgets
     */
    clearWidgets() {
        this.widgets = [];
        this.render();
    },

    /**
     * Render all widgets
     * Always shows applications section at the top
     */
    render() {
        const container = document.getElementById('widgets');
        if (!container) return;

        // Always show applications section first
        const appsSection = this.renderApplicationsSection();

        // Then show active widgets
        const widgetsHtml = this.widgets.map(w => this.renderWidget(w)).join('');

        container.innerHTML = appsSection + widgetsHtml;
    },

    /**
     * Render applications section (always visible)
     */
    renderApplicationsSection() {
        const apps = this.getAvailableApplications();

        // Separate user apps from defaults
        const userApps = apps.filter(a => !a.isDefault);
        const defaultApps = apps.filter(a => a.isDefault);

        // Build app buttons
        const renderAppBtn = (app) => `
            <div class="app-card ${app.isDefault ? 'app-card-default' : ''}"
                 onclick="UIRenderer.launchApplication('${this.escape(app.id)}')"
                 title="${this.escape(app.description || app.name)}">
                <span class="app-card-icon">${app.icon || '📱'}</span>
                <span class="app-card-name">${this.escape(app.name)}</span>
                ${!app.isDefault ? `
                    <button class="app-card-delete" onclick="event.stopPropagation(); UIRenderer.deleteApplication('${this.escape(app.id)}')" title="Delete">×</button>
                ` : ''}
            </div>
        `;

        const userAppsHtml = userApps.map(renderAppBtn).join('');
        const defaultAppsHtml = defaultApps.map(renderAppBtn).join('');

        return `
            <div class="apps-section">
                <div class="apps-section-header">
                    <span>Applications</span>
                    <div class="header-buttons">
                        <button class="btn-icon" onclick="UIRenderer.openBSLEditor()" title="BSL Editor">📝</button>
                        <button class="btn-icon" onclick="UIRenderer.showCreateAppForm()" title="Create new application">+</button>
                    </div>
                </div>
                ${userApps.length > 0 ? `
                    <div class="apps-grid">${userAppsHtml}</div>
                ` : ''}
                ${userApps.length > 0 && defaultApps.length > 0 ? `
                    <div class="apps-divider"></div>
                ` : ''}
                ${defaultApps.length > 0 ? `
                    <div class="apps-grid apps-grid-defaults">${defaultAppsHtml}</div>
                ` : ''}
                ${userApps.length === 0 && defaultApps.length === 0 ? `
                    <div class="apps-empty">
                        <p>No applications yet</p>
                        <button class="btn-small" onclick="UIRenderer.showCreateAppForm()">+ Create App</button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Show form to create new application
     */
    showCreateAppForm() {
        // Get available models to link (using graph query)
        const availableModels = Memory.getInstancesOfType('Model')
            .filter(e => !e.value.startsWith('Model_'))
            .map(e => ({ value: e.value, label: e.value.replace(/^Model\s+/, '') }));

        this.addWidget({
            type: 'form',
            title: 'Create Application',
            mode: 'create',
            concept: 'Application',
            model: 'Model_Application',
            fields: [
                { name: 'Title', label: 'Title', required: true, type: 'text' },
                { name: 'Icon', label: 'Icon', type: 'text', defaultValue: '📱' },
                { name: 'Description', label: 'Description', type: 'textarea' },
                {
                    name: 'Models',
                    label: 'Link Model',
                    type: 'select',
                    options: availableModels
                }
            ]
        });
    },

    /**
     * Render applications launcher (shown when no widgets)
     */
    renderApplicationsLauncher() {
        const apps = this.getAvailableApplications();

        if (apps.length === 0) {
            return `
                <div class="no-widgets">
                    <p>No widgets yet</p>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">
                        Widgets will appear here when you create structured data in the chat
                    </p>
                </div>
            `;
        }

        const appButtons = apps.map(app => `
            <div class="app-btn-wrapper">
                <button class="app-btn" onclick="UIRenderer.launchApplication('${this.escape(app.id)}')" title="${this.escape(app.description || '')}">
                    <span class="app-icon">${app.icon || '📱'}</span>
                    <span class="app-name">${this.escape(app.name)}</span>
                </button>
                ${app.isDefault ? '' : `<button class="app-delete-btn" onclick="event.stopPropagation(); UIRenderer.deleteApplication('${this.escape(app.id)}')" title="Delete application">×</button>`}
            </div>
        `).join('');

        return `
            <div class="applications-panel">
                <div class="apps-header">Applications</div>
                <div class="apps-grid">
                    ${appButtons}
                </div>
            </div>
        `;
    },

    /**
     * Get available applications from events
     * Filters out deleted applications (those with Delete event)
     */
    getAvailableApplications() {
        const apps = [];

        // Find Application individuals (using graph query)
        const appEvents = Memory.queryGraph({
            type: 'Individual',
            base: 'Application'
        });

        appEvents.forEach(appEvent => {
            const appId = appEvent.value;
            const appState = Memory.getIndividualState(appId);

            // Check if application is deleted (has Delete event with value "1" or true)
            const isDeleted = appState.Delete === '1' || appState.Delete === 1 || appState.Delete === true;
            if (isDeleted) {
                return; // Skip deleted applications
            }

            // Get Models for this application
            const models = this.getAppModels(appId, appState);

            // Build description with Models info
            let description = appState.Description || '';
            if (models.length > 0) {
                const modelsInfo = models.map(m => m.replace(/^Model\s+/, '')).join(', ');
                description = description ? `${description} | ${modelsInfo}` : modelsInfo;
            }

            apps.push({
                id: appId,
                name: appState.Title || appState.SetLabel || appEvent.value,
                description: description,
                icon: appState.Icon || '📱',
                model: appState.SetModel || 'Model_Application',
                models: models,
                isDefault: false
            });
        });

        // Add default apps if none exist
        if (apps.length === 0) {
            apps.push(
                { id: 'new_task', name: 'New Task', icon: '✅', description: 'Create a new task', isDefault: true },
                { id: 'new_person', name: 'New Person', icon: '👤', description: 'Create a new person', isDefault: true },
                { id: 'new_note', name: 'New Note', icon: '📝', description: 'Create a new note', isDefault: true }
            );
        }

        return apps;
    },

    /**
     * Delete application by creating a Delete event
     * Does not remove events, just marks the application as deleted
     */
    deleteApplication(appId) {
        if (!confirm(`Delete application "${appId}"?`)) {
            return;
        }

        // Get individual state to find model and cause
        const appState = Memory.getIndividualState(appId);
        const model = appState.SetModel || 'Model_Application';

        // Find SetModel event as cause (property events link to SetModel)
        const setModelEvent = Memory.events.find(e =>
            e.base === appId && e.type === 'SetModel'
        );
        const cause = setModelEvent?.id || null;

        // Create Delete event for the application
        Memory.addEvent({
            base: appId,
            type: 'Delete',
            value: '1',
            actor: 'user',
            model: model,
            cause: cause
        });

        // Update UI
        this.render();
        if (typeof renderEvents === 'function') renderEvents();
        if (typeof updateStats === 'function') updateStats();

        console.log(`Application deleted: ${appId}`);
    },

    /**
     * Launch Application
     * Logic:
     * - 0 models → show configuration form
     * - 1 model  → open create form directly
     * - >1 models → show model selection
     */
    launchApplication(appId) {
        console.log('=== Launching application ===');
        console.log('  appId:', appId);

        // Handle default app actions (new_task, new_person, etc.)
        if (appId.startsWith('new_')) {
            const concept = appId.replace('new_', '');
            const modelName = `Model ${concept.charAt(0).toUpperCase() + concept.slice(1)}`;
            console.log('  Default app, creating form for:', modelName);
            this.launchModelForm(appId, modelName);
            return;
        }

        // Get application state
        const appState = Memory.getIndividualState(appId);
        console.log('  appState:', appState);

        // Get Models from application
        const models = this.getAppModels(appId, appState);
        console.log('  Models found:', models);

        if (models.length === 0) {
            // No linked models - show config form to setup the application
            console.log('  No linked Models, showing config form');
            this.showAppConfigForm(appId, appState);
        } else if (models.length === 1) {
            // ONE model - open form for creating new individual
            console.log('  One model, launching form:', models[0]);
            this.launchAppForm(appId, appState, models[0]);
        } else {
            // MULTIPLE models - show model selection, then launch form
            console.log('  Multiple models, showing selection');
            this.showModelSelectionForm(appId, appState, models);
        }
    },

    /**
     * Launch form for creating new individual (like LLM does)
     */
    launchAppForm(appId, appState, modelName) {
        const formConfig = this.buildFormFromModel(modelName, appId);

        if (formConfig) {
            // Set form title from app
            formConfig.title = appState.Title || `New ${formConfig.concept}`;
            formConfig.sourceApp = appId;
            formConfig.icon = appState.Icon || '📱';
            this.addWidget(formConfig);
        } else {
            console.log('  Could not build form for:', modelName);
            this.showAppConfigForm(appId, appState);
        }
    },

    /**
     * Show model selection when app has multiple models
     */
    showModelSelectionForm(appId, appState, models) {
        const modelButtons = models.map(modelName => {
            const conceptName = modelName.replace(/^Model[_\s]+/, '');
            const icon = this.getConceptIcon(conceptName);
            // Store appState in data attribute to avoid JSON escaping issues
            return `
                <button class="model-btn" data-app-id="${this.escape(appId)}" data-model="${this.escape(modelName)}" onclick="UIRenderer.launchAppFormFromButton(this)">
                    <span class="model-icon">${icon}</span>
                    <span>${this.escape(conceptName)}</span>
                </button>
            `;
        }).join('');

        this.addWidget({
            type: 'form',
            title: appState.Title || appId,
            icon: appState.Icon || '📱',
            mode: 'select',
            concept: 'Application',
            fields: [],
            customHtml: `
                <div class="model-selection">
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">Select type to create:</p>
                    <div class="model-buttons" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">${modelButtons}</div>
                </div>
            `
        });
    },

    /**
     * Launch form from model selection button
     */
    launchAppFormFromButton(button) {
        const appId = button.dataset.appId;
        const modelName = button.dataset.model;
        const appState = Memory.getIndividualState(appId);
        this.launchAppForm(appId, appState, modelName);
    },

    /**
     * Open full workspace for application with multiple models
     */
    openWorkspace(appId, appState, models) {
        // Convert model names to model info objects
        const modelList = models.map(modelName => {
            const conceptName = modelName.replace(/^Model[_\s]+/, '');
            return {
                name: modelName,
                label: conceptName,
                icon: this.getConceptIcon(conceptName)
            };
        });

        this.addWidget({
            type: 'workspace',
            appId: appId,
            title: appState.Title || appId,
            icon: appState.Icon || '📱',
            models: modelList,
            state: {
                currentModel: modelList[0]?.name || models[0],
                currentView: 'list',
                selectedIndividual: null
            }
        });
    },

    /**
     * Get Models list from Application state
     * Models relation can be single or multiple (Multiple:1)
     *
     * According to BSL spec:
     * Application: Individual: hr_app
     * : Models: Model Person
     * : Models: Model Task
     *
     * Creates events: {base: "hr_app", type: "Models", value: "Model Person"}
     *                 {base: "hr_app", type: "Models", value: "Model Task"}
     */
    getAppModels(appId, appState) {
        const models = [];

        console.log('=== getAppModels ===');
        console.log('  appId:', appId);
        console.log('  appState:', appState);

        // Strategy 1: Find "Models" events (plural) for this application using graph
        const modelsEvents = Memory.queryGraph({ base: appId, type: 'Models' });
        console.log('  "Models" events:', modelsEvents.length);
        modelsEvents.forEach(e => {
            if (e.value && !models.includes(e.value)) {
                models.push(e.value);
            }
        });

        // Strategy 2: Find "Model" events (singular) for this application
        if (models.length === 0) {
            const modelEvents = Memory.queryGraph({ base: appId, type: 'Model' });
            console.log('  "Model" events:', modelEvents.length);
            modelEvents.forEach(e => {
                if (e.value && !models.includes(e.value)) {
                    models.push(e.value);
                }
            });
        }

        // Strategy 3: Check appState for various model-related fields
        if (models.length === 0) {
            // Check Models field
            if (appState.Models) {
                console.log('  Found appState.Models:', appState.Models);
                const m = Array.isArray(appState.Models) ? appState.Models : [appState.Models];
                m.forEach(v => { if (v && !models.includes(v)) models.push(v); });
            }
            // Check Model field (singular)
            if (appState.Model) {
                console.log('  Found appState.Model:', appState.Model);
                const m = Array.isArray(appState.Model) ? appState.Model : [appState.Model];
                m.forEach(v => { if (v && !models.includes(v)) models.push(v); });
            }
            // Check LinkedModel field
            if (appState.LinkedModel) {
                console.log('  Found appState.LinkedModel:', appState.LinkedModel);
                const m = Array.isArray(appState.LinkedModel) ? appState.LinkedModel : [appState.LinkedModel];
                m.forEach(v => { if (v && !models.includes(v)) models.push(v); });
            }
        }

        // Strategy 4: Look for any event that links to a Model using graph
        if (models.length === 0) {
            const allAppEvents = Memory.queryGraph({ base: appId });
            console.log('  All app events:', allAppEvents.map(e => `${e.type}:${e.value}`));

            allAppEvents.forEach(e => {
                // Check if value looks like a Model name
                if (e.value && typeof e.value === 'string' && e.value.startsWith('Model ')) {
                    if (!models.includes(e.value)) {
                        console.log('  Found model-like value:', e.type, '->', e.value);
                        models.push(e.value);
                    }
                }
            });
        }

        console.log('  Final models:', models);
        return models;
    },

    /**
     * Show model selection widget for apps with multiple models
     */
    showModelSelection(appId, appState, models) {
        const modelButtons = models.map(modelName => {
            // Extract concept name from model (e.g., "Model Task" -> "Task")
            const conceptName = modelName.replace(/^Model\s+/, '');
            return {
                label: conceptName,
                model: modelName,
                icon: this.getConceptIcon(conceptName)
            };
        });

        this.addWidget({
            type: 'model-selection',
            title: appState.Title || appId,
            sourceApp: appId,
            models: modelButtons
        });
    },

    /**
     * Get icon for concept (simple mapping)
     */
    getConceptIcon(conceptName) {
        const icons = {
            'Task': '✅', 'Person': '👤', 'Note': '📝',
            'Document': '📄', 'Organization': '🏢', 'Project': '📁'
        };
        return icons[conceptName] || '📋';
    },

    /**
     * Show Application configuration form
     * Shows currently linked models and allows adding new ones
     */
    showAppConfigForm(appId, appState) {
        // Get currently linked models for this app
        const currentModels = this.getAppModels(appId, appState);

        // Get all available models (using graph query, not system models)
        const availableModels = Memory.getInstancesOfType('Model')
            .filter(e => !e.value.startsWith('Model_'))
            .map(e => ({ value: e.value, label: e.value }));

        // Build current models display
        const currentModelsHtml = currentModels.length > 0
            ? currentModels.map(m => `<span class="attr-tag">${m.replace(/^Model\s+/, '')}</span>`).join(' ')
            : '<span style="color: var(--text-muted);">No models linked</span>';

        this.addWidget({
            type: 'form',
            title: `Configure: ${appState.Title || appId}`,
            mode: 'edit',
            concept: 'Application',
            model: 'Model_Application',
            target: appId,
            currentModels: currentModels, // Pass for reference
            fields: [
                { name: 'Title', label: 'Title', required: true, type: 'text', defaultValue: appState.Title || '' },
                { name: 'Icon', label: 'Icon', type: 'text', defaultValue: appState.Icon || '📱' },
                { name: 'Description', label: 'Description', type: 'textarea', defaultValue: appState.Description || '' },
                {
                    name: '_currentModels',
                    label: 'Current Models',
                    type: 'html',
                    html: currentModelsHtml
                },
                {
                    name: 'Models',
                    label: 'Add Model',
                    type: 'select',
                    options: availableModels.filter(m => !currentModels.includes(m.value)),
                    defaultValue: ''
                }
            ]
        });
    },

    /**
     * Build form configuration from Model definition (algorithmic, no LLM)
     */
    buildFormFromModel(modelName, appId) {
        console.log('=== buildFormFromModel ===');
        console.log('  modelName:', modelName);

        // Find the Model event using graph query
        const modelEvents = Memory.queryGraph({
            type: 'Model',
            value: modelName
        });
        const modelEvent = modelEvents[0];

        if (!modelEvent) {
            console.log('  Model not found:', modelName);
            // List available models for debugging using graph
            const models = Memory.getInstancesOfType('Model').map(e => e.value);
            console.log('  Available models:', models.slice(0, 20));
            return null;
        }

        console.log('  Found model event:', modelEvent);
        const conceptName = modelEvent.base;
        console.log('  Concept name:', conceptName);

        // Get all Attribute/Relation events nested under this model
        // In BSL, model fields have base=model.id (structural nesting)
        const childEvents = Memory.getEventsByBase(modelEvent.id);
        const modelFields = childEvents.filter(e =>
            e.type === 'Attribute' || e.type === 'Relation'
        );

        console.log('  Model fields found:', modelFields.length);
        if (modelFields.length > 0) {
            console.log('  Fields:', modelFields.map(f => `${f.type}:${f.value}`));
        }

        if (modelFields.length === 0) {
            console.log('  No fields found for model:', modelName);
            // Debug: show all events with this model as base
            console.log('  Events with base=modelId:', childEvents.length, childEvents.map(e => `${e.type}:${e.value}`));
            return null;
        }

        // Build form fields from model definition
        const fields = modelFields.map(fieldEvent => {
            const fieldName = fieldEvent.value;
            const fieldType = fieldEvent.type; // Attribute or Relation

            // Get restrictions for this field (base = fieldEvent.id in BSL)
            const restrictions = Memory.getEventsByBase(fieldEvent.id);

            // Build field config from restrictions
            const field = {
                name: fieldName,
                label: this.formatLabel(fieldName),
                fieldType: fieldType
            };

            // Apply restrictions
            restrictions.forEach(r => {
                switch (r.type) {
                    case 'Required':
                        field.required = r.value === '1' || r.value === 1 || r.value === true;
                        break;
                    case 'DataType':
                        field.dataType = r.value;
                        field.type = this.mapDataTypeToInputType(r.value);
                        break;
                    case 'Range':
                        field.range = r.value;
                        if (fieldType === 'Relation') {
                            field.type = 'select';
                            field.options = this.getIndividualsOfConcept(r.value);
                        }
                        break;
                    case 'SetRange':
                        field.setRange = r.value;
                        field.type = 'select';
                        field.options = this.parseSetRange(r.value);
                        break;
                    case 'Multiple':
                        field.multiple = r.value === '1' || r.value === 1 || r.value === true;
                        break;
                    case 'Default':
                        field.defaultValue = r.value;
                        break;
                    case 'SetLabel':
                        field.label = r.value;
                        break;
                    case 'Condition':
                        field.condition = r.value;
                        break;
                    case 'ValueCondition':
                        field.validation = r.value;
                        break;
                }
            });

            // Set default type if not specified
            if (!field.type) {
                field.type = 'text';
            }

            return field;
        });

        return {
            type: 'form',
            title: `${conceptName}`,
            mode: 'create',
            concept: conceptName,
            model: modelName,
            target: appId,
            fields: fields
        };
    },

    /**
     * Map BSL DataType to HTML input type
     */
    mapDataTypeToInputType(dataType) {
        const mapping = {
            'BasicType': 'text',
            'TextType': 'textarea',
            'Numeric': 'number',
            'Integer': 'number',
            'Float': 'number',
            'Boolean': 'checkbox',
            'Date': 'date',
            'DateTime': 'datetime-local',
            'Duration': 'text',
            'Time': 'time',
            'Email': 'email',
            'Phone': 'tel',
            'URL': 'url',
            'Text': 'textarea',
            'LongText': 'textarea',
            'MarkdownType': 'textarea',
            'Password': 'password',
            'EnumType': 'select'
        };
        return mapping[dataType] || 'text';
    },

    /**
     * Parse SetRange value (e.g., "low, medium, high" or JSON array)
     */
    parseSetRange(value) {
        if (!value) return [];

        // Try JSON array
        if (value.startsWith('[')) {
            try {
                return JSON.parse(value).map(v => ({ value: v, label: v }));
            } catch (e) {}
        }

        // Comma-separated values
        return value.split(',').map(v => ({
            value: v.trim(),
            label: v.trim()
        }));
    },

    /**
     * Format field name as label (e.g., "first_name" -> "First Name")
     */
    formatLabel(name) {
        return name
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, s => s.toUpperCase())
            .trim();
    },

    /**
     * Infer concept name from application ID
     */
    inferConceptFromAppId(appId) {
        // Handle patterns like "new_task" -> "Task", "create_person" -> "Person"
        const prefixes = ['new_', 'create_', 'add_', 'edit_'];
        for (const prefix of prefixes) {
            if (appId.startsWith(prefix)) {
                const name = appId.substring(prefix.length);
                return name.charAt(0).toUpperCase() + name.slice(1);
            }
        }
        // Return capitalized appId as concept
        return appId.charAt(0).toUpperCase() + appId.slice(1);
    },

    /**
     * Render single widget based on type
     */
    renderWidget(widget) {
        const type = widget.type || 'card';

        // If widget has viewEntity but no target - render as entity list
        if (widget.viewEntity && !widget.target) {
            return this.renderEntityListView(widget);
        }

        switch (type) {
            case 'card':
                return this.renderCard(widget);
            case 'list':
                return this.renderList(widget);
            case 'form':
                return this.renderForm(widget);
            case 'table':
                return this.renderTable(widget);
            case 'applications':
                return this.renderApplicationsWidget(widget);
            case 'model-selection':
                return this.renderModelSelection(widget);
            case 'workspace':
                return this.renderWorkspace(widget);
            case 'list-view':
                return this.renderListView(widget);
            default:
                return this.renderCard(widget);
        }
    },

    /**
     * Render list of individuals for a viewEntity
     * Used when LLM creates a view with $.expressions but no specific target
     */
    renderEntityListView(widget) {
        const entityName = widget.viewEntity;
        const fields = widget.fields || [];

        // Find all individuals of this entity type
        const individuals = this.getIndividualsOfConcept(entityName);

        if (individuals.length === 0) {
            return `
                <div class="widget" data-widget-id="${widget.id}">
                    ${this.renderWidgetHeader(widget)}
                    <div class="empty-list">
                        <p style="color: var(--text-muted);">No ${entityName} found</p>
                    </div>
                </div>
            `;
        }

        // Render each individual as a row with resolved field values
        const rows = individuals.map(ind => {
            const indId = ind.value || ind;  // Handle both {value, label} objects and strings
            const rowFields = fields.map(f => {
                const resolvedValue = this.resolveFieldValue(f.value, indId);
                return `<span class="entity-cell">${this.escape(resolvedValue || '-')}</span>`;
            }).join('');

            return `
                <div class="entity-row" data-individual="${this.escape(indId)}" onclick="UIRenderer.showIndividualDetail('${widget.id}', '${this.escape(indId)}')">
                    ${rowFields}
                </div>
            `;
        }).join('');

        // Header row with labels
        const headerCells = fields.map(f =>
            `<span class="entity-header-cell">${this.escape(f.label || f.name || '')}</span>`
        ).join('');

        return `
            <div class="widget entity-list-widget" data-widget-id="${widget.id}">
                ${this.renderWidgetHeader(widget)}
                <div class="entity-list">
                    <div class="entity-header-row">${headerCells}</div>
                    ${rows}
                </div>
            </div>
        `;
    },

    /**
     * Show detail view for individual from entity list
     */
    showIndividualDetail(widgetId, individualId) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        const fields = widget.fields || [];
        const state = Memory.getIndividualState(individualId);

        // Create detail card with resolved values
        const detailFields = fields.map(f => ({
            label: f.label || f.name,
            value: this.resolveFieldValue(f.value, individualId)
        }));

        this.addWidget({
            type: 'card',
            title: `${widget.viewEntity}: ${individualId}`,
            target: individualId,
            concept: widget.viewEntity,
            model: widget.model,
            fields: detailFields,
            actions: [
                { label: 'Edit', action: 'edit', target: individualId },
                { label: 'Delete', action: 'delete', target: individualId }
            ]
        });
    },

    /**
     * Render model selection widget (for apps with multiple models)
     */
    renderModelSelection(widget) {
        const modelButtons = (widget.models || []).map(m => `
            <button class="model-btn" onclick="UIRenderer.launchModelForm('${widget.sourceApp}', '${this.escape(m.model)}')" title="${this.escape(m.model)}">
                <span class="model-icon">${m.icon || '📋'}</span>
                <span class="model-name">${this.escape(m.label)}</span>
            </button>
        `).join('');

        return `
            <div class="widget" data-widget-id="${widget.id}">
                ${this.renderWidgetHeader(widget)}
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">Select what to create:</p>
                <div class="models-grid" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${modelButtons}
                </div>
            </div>
        `;
    },

    /**
     * Launch form for specific model from model selection
     */
    launchModelForm(appId, modelName) {
        console.log('Launching model form:', appId, modelName);

        const appState = Memory.getIndividualState(appId);
        const formConfig = this.buildFormFromModel(modelName, null);

        if (formConfig) {
            formConfig.title = `New ${formConfig.concept}`;
            formConfig.sourceApp = appId;
            this.addWidget(formConfig);
        } else {
            console.error('Failed to build form for model:', modelName);
        }
    },

    /**
     * Render widget header with title and close button
     */
    renderWidgetHeader(widget) {
        return `
            <div class="widget-header">
                <div class="widget-title">${this.escape(widget.title || 'Widget')}</div>
                <button class="widget-close" onclick="UIRenderer.removeWidget('${widget.id}')" title="Close">×</button>
            </div>
        `;
    },

    /**
     * Render applications widget (shows available apps)
     */
    renderApplicationsWidget(widget) {
        const apps = this.getAvailableApplications();

        const appButtons = apps.map(app => `
            <div class="app-btn-wrapper">
                <button class="app-btn" onclick="UIRenderer.launchApplication('${this.escape(app.id)}')" title="${this.escape(app.description || '')}">
                    <span class="app-icon">${app.icon || '📱'}</span>
                    <span class="app-name">${this.escape(app.name)}</span>
                </button>
                ${app.isDefault ? '' : `<button class="app-delete-btn" onclick="event.stopPropagation(); UIRenderer.deleteApplication('${this.escape(app.id)}')" title="Delete application">×</button>`}
            </div>
        `).join('');

        return `
            <div class="widget" data-widget-id="${widget.id}">
                ${this.renderWidgetHeader(widget)}
                <div class="apps-grid">
                    ${appButtons}
                </div>
            </div>
        `;
    },

    /**
     * Resolve field value - evaluates expressions like $.name against target individual
     */
    resolveFieldValue(value, target) {
        if (!value || !target) {
            return value || '';
        }

        // If value contains $. expressions, evaluate them
        if (typeof value === 'string' && value.includes('$.')) {
            try {
                // Get individual state
                const state = Memory.getIndividualState(target);
                if (!state) {
                    return value;
                }

                // Simple expression: just $.property
                if (/^\$\.[\w_]+$/.test(value)) {
                    const prop = value.substring(2);
                    return state[prop] !== undefined ? state[prop] : '';
                }

                // Complex expression - use Memory.evaluateExpression
                const result = Memory.evaluateExpression(value, target);
                return result !== undefined && result !== null ? result : '';
            } catch (e) {
                console.warn('Failed to resolve field value:', value, e);
                return value;
            }
        }

        return value;
    },

    /**
     * Render card widget
     * Filters fields based on Condition accessibility
     */
    renderCard(widget) {
        // Get accessible fields based on Condition
        const accessibleFields = this.getAccessibleCardFields(widget);
        const target = widget.target;

        const fields = accessibleFields.map(f => {
            // Resolve value expressions against target individual
            const resolvedValue = this.resolveFieldValue(f.value, target);
            return `
            <div class="widget-field" data-field="${this.escape(f.name || f.label)}">
                <span class="widget-field-label">${this.escape(f.label)}</span>
                <span class="widget-field-value">${this.escape(resolvedValue)}</span>
            </div>
        `;
        }).join('');

        const actions = this.renderActions(widget);

        return `
            <div class="widget" data-widget-id="${widget.id}">
                ${this.renderWidgetHeader(widget)}
                ${fields}
                ${actions}
            </div>
        `;
    },

    /**
     * Get accessible card fields, filtering by Condition
     */
    getAccessibleCardFields(widget) {
        const fields = widget.fields || [];
        const target = widget.target;

        if (!target) {
            return fields;
        }

        return fields.filter(f => {
            const fieldName = f.name || f.label;

            // If field has explicit condition
            if (f.condition) {
                return Memory.checkCondition(f.condition, target);
            }

            // Check model-level condition
            return Memory.isFieldAccessible(target, fieldName);
        });
    },

    /**
     * Render list widget
     */
    renderList(widget) {
        const items = (widget.items || []).map((item, i) => `
            <div class="widget-field" style="cursor: pointer;" onclick="UIRenderer.handleItemClick('${widget.id}', ${i})">
                <span class="widget-field-value">${this.escape(typeof item === 'object' ? item.text : item)}</span>
                ${item.status ? `<span class="widget-field-label">${this.escape(item.status)}</span>` : ''}
            </div>
        `).join('');

        const actions = this.renderActions(widget);

        return `
            <div class="widget" data-widget-id="${widget.id}">
                ${this.renderWidgetHeader(widget)}
                ${items || '<p style="color: var(--text-muted);">No items</p>'}
                ${actions}
            </div>
        `;
    },

    /**
     * Render form widget
     * Filters fields based on Condition accessibility
     */
    renderForm(widget) {
        // Get accessible fields based on Condition
        const accessibleFields = this.getAccessibleFormFields(widget);

        const fields = accessibleFields.map(f => `
            <div style="margin-bottom: 0.5rem;" data-field-name="${this.escape(f.name || f.label)}">
                <label style="display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                    ${this.escape(f.label)}${f.required ? ' *' : ''}
                    ${f.condition ? '<span style="color: var(--warning); font-size: 0.65rem;" title="Has condition">⚡</span>' : ''}
                </label>
                ${this.renderFormField(widget.id, f)}
            </div>
        `).join('');

        const actions = this.renderActions(widget);

        return `
            <div class="widget" data-widget-id="${widget.id}">
                ${this.renderWidgetHeader(widget)}
                <form onsubmit="UIRenderer.handleFormSubmit(event, '${widget.id}')">
                    ${fields}
                    ${actions || '<div class="widget-actions"><button type="submit" class="widget-btn primary">Submit</button></div>'}
                </form>
            </div>
        `;
    },

    /**
     * Get accessible form fields, filtering by Condition
     */
    getAccessibleFormFields(widget) {
        const fields = widget.fields || [];
        const target = widget.target;
        const mode = widget.mode || 'create';

        // For create mode, show all fields (no individual to check against yet)
        if (mode === 'create' || !target) {
            return fields;
        }

        // For edit mode, check Condition for each field
        return fields.filter(f => {
            const fieldName = f.name || f.label;

            // If field has explicit condition in widget definition
            if (f.condition) {
                return Memory.checkCondition(f.condition, target);
            }

            // Check model-level condition
            return Memory.isFieldAccessible(target, fieldName);
        });
    },

    /**
     * Render form field
     */
    renderFormField(widgetId, field) {
        const id = `${widgetId}_${field.name || field.label}`;
        const type = field.type || 'text';
        // Use defaultValue if value is not set
        const fieldValue = field.value !== undefined ? field.value : (field.defaultValue || '');

        // HTML display field (read-only)
        if (type === 'html') {
            return `<div style="padding: 0.375rem; background: var(--bg-darker); border-radius: 4px;">${field.html || ''}</div>`;
        }

        if (type === 'select') {
            const options = this.resolveSelectOptions(field.options, field.range);
            const optionsHtml = options.map(o => {
                const value = typeof o === 'object' ? (o.value || o.id || o.name) : o;
                const label = typeof o === 'object' ? (o.label || o.name || o.value || o.id) : o;
                const selected = String(value) === String(fieldValue) ? 'selected' : '';
                return `<option value="${this.escape(value)}" ${selected}>${this.escape(label)}</option>`;
            }).join('');
            const emptySelected = !fieldValue ? 'selected' : '';
            return `<select id="${id}" name="${field.name || field.label}" style="width: 100%; padding: 0.375rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary);"><option value="" ${emptySelected}>-- Select --</option>${optionsHtml}</select>`;
        }

        if (type === 'textarea') {
            return `<textarea id="${id}" name="${field.name || field.label}" rows="3" style="width: 100%; padding: 0.375rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary); resize: vertical;">${this.escape(fieldValue)}</textarea>`;
        }

        if (type === 'checkbox') {
            const checked = fieldValue === true || fieldValue === '1' || fieldValue === 1 ? 'checked' : '';
            return `<input type="checkbox" id="${id}" name="${field.name || field.label}" ${checked} style="width: auto;">`;
        }

        return `<input type="${type}" id="${id}" name="${field.name || field.label}" value="${this.escape(fieldValue)}" ${field.required ? 'required' : ''} style="width: 100%; padding: 0.375rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary);">`;
    },

    /**
     * Resolve select options from various formats
     * @param {Array|String} options - Options array, concept name, or query
     * @param {String} range - Optional range (concept name for relation)
     * @returns {Array} Array of options [{value, label}] or strings
     */
    resolveSelectOptions(options, range) {
        // If no options, try to get from range (for relations)
        if (!options && range) {
            return this.getIndividualsOfConcept(range);
        }

        // Already an array
        if (Array.isArray(options)) {
            return options;
        }

        // String - could be concept name or query
        if (typeof options === 'string') {
            // Remove $ prefix if present
            const conceptName = options.replace(/^\$/, '');
            return this.getIndividualsOfConcept(conceptName);
        }

        // Object with query
        if (options && typeof options === 'object' && options.query) {
            // Execute query to get options
            try {
                const result = Memory.executeQuery ? Memory.executeQuery(options.query) : [];
                return Array.isArray(result) ? result : [];
            } catch (e) {
                console.error('Failed to execute options query:', e);
                return [];
            }
        }

        return [];
    },

    /**
     * Get individuals of a concept for select options
     */
    getIndividualsOfConcept(conceptName) {
        const individuals = Memory.getIndividuals(conceptName);
        if (!individuals || individuals.length === 0) {
            return [];
        }
        return individuals.map(ind => {
            // Get display name from events
            const nameEvent = Memory.events.find(e =>
                e.base === ind && (e.type === 'name' || e.type === 'title' || e.type === 'label')
            );
            return {
                value: ind,
                label: nameEvent ? nameEvent.value : ind
            };
        });
    },

    /**
     * Render table widget
     */
    renderTable(widget) {
        const headers = (widget.columns || []).map(c => `<th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid var(--border);">${this.escape(c)}</th>`).join('');

        const rows = (widget.rows || []).map(row => {
            const cells = (widget.columns || []).map(col => `<td style="padding: 0.5rem; border-bottom: 1px solid var(--border);">${this.escape(row[col] || '')}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        const actions = this.renderActions(widget);

        return `
            <div class="widget" data-widget-id="${widget.id}">
                ${this.renderWidgetHeader(widget)}
                <div style="overflow-x: auto;">
                    <table style="width: 100%; font-size: 0.875rem;">
                        <thead><tr>${headers}</tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                ${actions}
            </div>
        `;
    },

    /**
     * Render widget actions
     */
    renderActions(widget) {
        if (!widget.actions || widget.actions.length === 0) return '';

        const buttons = widget.actions.map(a => `
            <button type="button" class="widget-btn ${a.primary ? 'primary' : ''}"
                    onclick="UIRenderer.handleAction('${widget.id}', '${a.action}', '${this.escape(a.target || '')}')">
                ${this.escape(a.label)}
            </button>
        `).join('');

        return `<div class="widget-actions">${buttons}</div>`;
    },

    /**
     * Handle widget action - creates BSL events directly where possible
     */
    handleAction(widgetId, action, target) {
        console.log(`Action: ${action} on ${target} (widget: ${widgetId})`);

        const widget = this.widgets.find(w => w.id === widgetId);

        switch (action) {
            case 'submit':
                // Directly call handleFormSubmit with a synthetic event
                const widgetEl = document.querySelector(`[data-widget-id="${widgetId}"]`);
                const form = widgetEl?.querySelector('form');
                if (form) {
                    // Call handleFormSubmit directly with form as target
                    this.handleFormSubmit({
                        preventDefault: () => {},
                        target: form
                    }, widgetId);
                } else {
                    console.error('Form not found in widget:', widgetId);
                }
                break;

            case 'close':
            case 'dismiss':
                this.removeWidget(widgetId);
                break;

            case 'edit':
                if (target) {
                    // Create edit form widget from current individual state
                    this.openEditForm(target, widget);
                }
                break;

            case 'delete':
                if (target && confirm(`Delete ${target}?`)) {
                    // Create BSL Delete event (standard way to mark deletion)
                    Memory.addEvent({
                        base: target,
                        type: 'Delete',
                        value: '1',
                        actor: 'user',
                        model: widget?.model || null
                    });

                    // Update UI
                    if (typeof renderEvents === 'function') renderEvents();
                    if (typeof updateStats === 'function') updateStats();

                    if (typeof addSystemMessage === 'function') {
                        addSystemMessage(`Deleted: ${target}`);
                    }

                    this.removeWidget(widgetId);
                }
                break;

            case 'save':
                // For card widgets with inline editing
                if (target && widget) {
                    this.saveCardChanges(widget, target);
                }
                break;

            default:
                // Check if action has direct BSL mapping
                if (widget?.actions) {
                    const actionDef = widget.actions.find(a => a.action === action);
                    if (actionDef?.event) {
                        // Direct event creation from action definition
                        Memory.addEvent({
                            base: target || widget.target,
                            type: actionDef.event.type || action,
                            value: actionDef.event.value || '1',
                            actor: 'user',
                            model: widget.model || null
                        });

                        if (typeof renderEvents === 'function') renderEvents();
                        if (typeof updateStats === 'function') updateStats();

                        if (typeof addSystemMessage === 'function') {
                            addSystemMessage(`Action ${action} executed on ${target}`);
                        }
                        return;
                    }
                }

                // Fallback: send to chat for LLM processing
                const msg = `Execute action "${action}"${target ? ` on ${target}` : ''}`;
                if (typeof sendMessageToChat === 'function') {
                    sendMessageToChat(msg);
                }
        }
    },

    /**
     * Open edit form for an existing individual
     */
    openEditForm(target, sourceWidget) {
        // Get current state of the individual from Memory
        const state = Memory.getIndividualState(target);

        // Determine concept and model from source widget or events
        const concept = sourceWidget?.concept || this.inferConcept(target);
        const model = sourceWidget?.model || `Model ${concept}`;

        // Get model fields (from source widget or infer from state)
        const fields = sourceWidget?.fields?.map(f => ({
            ...f,
            name: f.name || f.label,
            value: state[f.name || f.label] || f.value || ''
        })) || Object.entries(state)
            .filter(([key]) => key !== 'id' && key !== 'SetModel')
            .map(([key, value]) => ({
                name: key,
                label: key,
                value: value,
                type: typeof value === 'number' ? 'number' : 'text'
            }));

        // Create edit form widget
        const editWidget = this.addWidget({
            type: 'form',
            title: `Edit: ${target}`,
            mode: 'edit',
            target: target,
            concept: concept,
            model: model,
            fields: fields,
            actions: [
                { label: 'Save', action: 'submit', primary: true },
                { label: 'Cancel', action: 'close' }
            ]
        });

        console.log(`Opened edit form for ${target}:`, editWidget);
    },

    /**
     * Infer concept from individual events
     */
    inferConcept(individualId) {
        // Look for the Individual event that created this individual
        const events = Memory.getAllEvents();
        const creationEvent = events.find(e =>
            e.type === 'Individual' && e.value === individualId
        );
        return creationEvent?.base || 'Entity';
    },

    /**
     * Save inline card changes
     */
    saveCardChanges(widget, target) {
        // Collect edited field values from DOM
        const widgetEl = document.querySelector(`[data-widget-id="${widget.id}"]`);
        if (!widgetEl) return;

        const editableFields = widgetEl.querySelectorAll('[data-field][contenteditable="true"], [data-field] input');
        const changes = [];

        editableFields.forEach(el => {
            const fieldName = el.dataset.field || el.closest('[data-field]')?.dataset.field;
            const value = el.value || el.textContent;
            if (fieldName && value) {
                changes.push({ field: fieldName, value });
            }
        });

        // Create events for changes
        changes.forEach(({ field, value }) => {
            Memory.addEvent({
                base: target,
                type: field,
                value: value,
                actor: 'user',
                model: widget.model || null
            });
        });

        if (changes.length > 0) {
            if (typeof renderEvents === 'function') renderEvents();
            if (typeof updateStats === 'function') updateStats();

            if (typeof addSystemMessage === 'function') {
                addSystemMessage(`Updated ${target}: ${changes.length} fields`);
            }
        }
    },

    /**
     * Handle form submit - creates BSL events directly
     *
     * Widget BSL context:
     * - mode: "create" | "edit" - whether to create new individual or edit existing
     * - target: base ID for events (individual name/id)
     * - concept: concept name (Person, Task, etc.)
     * - model: model name (Model Person, Model Task, etc.)
     */
    handleFormSubmit(event, widgetId) {
        event.preventDefault();

        try {
            const form = event.target;
            const formData = new FormData(form);
            const data = {};

            formData.forEach((value, key) => {
                data[key] = value;
            });

            console.log(`Form submitted:`, data, 'widgetId:', widgetId);

            // Find widget to get BSL context
            const widget = this.widgets.find(w => w.id === widgetId);

            if (!widget) {
                console.error('Widget not found:', widgetId, 'Available widgets:', this.widgets.map(w => w.id));
                return;
            }

            console.log('Widget context:', { mode: widget.mode, concept: widget.concept, model: widget.model, target: widget.target });

            // Extract BSL context from widget
            const mode = widget.mode || 'create';
            const concept = widget.concept || 'Entity';
            const model = widget.model || `Model ${concept}`;
            let target = widget.target;

            console.log('Extracted:', { mode, concept, model, target });

            // Generate target ID for new individuals
            if (mode === 'create' && !target) {
                // Use label field if present, otherwise generate ID
                const labelField = data.name || data.title || data.label;
                if (labelField) {
                    // Support Cyrillic and Latin characters, numbers, underscore
                    target = labelField
                        .toLowerCase()
                        .replace(/\s+/g, '_')
                        .replace(/[^a-zа-яё0-9_]/gi, '');
                    // Ensure target is not empty after sanitization
                    if (!target || target === '_') {
                        target = concept.toLowerCase() + '_' + Date.now().toString(36);
                    }
                } else {
                    target = concept.toLowerCase() + '_' + Date.now().toString(36);
                }
            }

            console.log('Final target:', target);

            // Validate target
            if (!target) {
                console.error('Cannot create events - target is undefined');
                if (typeof addSystemMessage === 'function') {
                    addSystemMessage('Error: Cannot create - missing target ID');
                }
                return;
            }

            const createdEvents = [];

            // For CREATE mode: first create Individual and SetModel events
            if (mode === 'create') {
                console.log('Creating new individual...');
                // 1. Create Individual event: Concept: Individual: target
                createdEvents.push(Memory.addEvent({
                    base: concept,
                    type: 'Individual',
                    value: target,
                    actor: 'user',
                    model: null
                }));

                // 2. Create SetModel event: target: SetModel: Model X
                createdEvents.push(Memory.addEvent({
                    base: target,
                    type: 'SetModel',
                    value: model,
                    actor: 'user',
                    model: model,
                    cause: createdEvents[0].id // Single cause, not array
                }));
            }

            // Get current state to detect changes (for edit mode)
            const currentState = mode === 'edit' ? Memory.getIndividualState(target) : {};

            // Create property events only for changed/new values
            console.log('Creating property events for:', Object.keys(data));
            let changedCount = 0;
            Object.entries(data).forEach(([fieldName, value]) => {
                if (value !== '' && value !== null && value !== undefined) {
                    // Parse value type
                    const parsedValue = this.parseFormValue(value, widget.fields?.find(f => f.name === fieldName || f.label === fieldName));

                    // Check if value has changed
                    const currentValue = currentState[fieldName];
                    const valueChanged = currentValue === undefined ||
                        String(currentValue) !== String(parsedValue);

                    if (valueChanged) {
                        changedCount++;
                        createdEvents.push(Memory.addEvent({
                            base: target,
                            type: fieldName,
                            value: parsedValue,
                            actor: 'user',
                            model: model,
                            cause: mode === 'create' ? createdEvents[1]?.id : null // Single cause
                        }));
                    }
                }
            });

            console.log(`Changed fields: ${changedCount}/${Object.keys(data).length}`);

            console.log(`Created ${createdEvents.length} BSL events for ${target}`, createdEvents);

            // Skip if nothing changed (edit mode with no modifications)
            if (mode === 'edit' && createdEvents.length === 0) {
                console.log('No changes detected, skipping update');
                if (typeof addSystemMessage === 'function') {
                    addSystemMessage(`No changes for ${target}`);
                }
                this.removeWidget(widgetId);
                return;
            }

            // Execute dataflow to trigger SetValue/SetDo rules
            const dataflowResult = Memory.executeToFixpoint(target);
            if (dataflowResult.events.length > 0) {
                console.log(`Dataflow generated ${dataflowResult.events.length} additional events`);
            }

            // Update UI
            if (typeof renderEvents === 'function') renderEvents();
            if (typeof updateStats === 'function') updateStats();

            // Check and show next stage views
            this.checkAndShowViews(target, model);

            // Show confirmation
            const actionText = mode === 'create' ? 'Created' : 'Updated';
            const totalEvents = createdEvents.length + dataflowResult.events.length;
            if (typeof addSystemMessage === 'function') {
                const changesInfo = mode === 'edit' ? ` (${changedCount} changed)` : '';
                addSystemMessage(`${actionText} ${concept}: ${target}${changesInfo}`);
            }

            // Close the widget after successful submission
            this.removeWidget(widgetId);

        } catch (error) {
            console.error('Form submit error:', error);
            if (typeof addSystemMessage === 'function') {
                addSystemMessage(`Error: ${error.message}`);
            }
        }
    },

    /**
     * Parse form value to appropriate type
     */
    parseFormValue(value, fieldDef) {
        if (!fieldDef) return value;

        const fieldType = fieldDef.type || fieldDef.dataType || 'text';

        switch (fieldType) {
            case 'number':
            case 'Numeric':
                return parseFloat(value) || 0;
            case 'checkbox':
            case 'Boolean':
                return value === 'true' || value === '1' || value === true;
            case 'date':
            case 'DateTime':
                return new Date(value).toISOString();
            default:
                return value;
        }
    },

    /**
     * Handle list item click
     */
    handleItemClick(widgetId, index) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (widget && widget.items && widget.items[index]) {
            const item = widget.items[index];
            console.log(`Item clicked:`, item);

            // Send to chat
            const msg = typeof item === 'object' ? `Show details for "${item.text}"` : `Show details for "${item}"`;
            if (typeof sendMessageToChat === 'function') {
                sendMessageToChat(msg);
            }
        }
    },

    /**
     * Check and show views based on current state
     * Looks for View events with Condition in the model and shows matching ones
     * Also checks registered stage views from LLM
     */
    checkAndShowViews(individualId, modelName) {
        console.log(`Checking views for ${individualId} (${modelName})`);

        // Get current individual state
        const state = Memory.getIndividualState(individualId);
        console.log('Current state:', state);

        // 1. Check registered stage views (from LLM)
        const stages = this.stageViews[modelName];
        if (stages) {
            console.log(`Checking ${Object.keys(stages).length} registered stage views`);

            for (const [stageName, viewConfig] of Object.entries(stages)) {
                const condition = viewConfig.condition;
                const shouldShow = !condition || Memory.checkCondition(condition, individualId);

                console.log(`Stage "${stageName}": condition="${condition}", shouldShow=${shouldShow}`);

                if (shouldShow) {
                    // Check if already showing
                    const alreadyShowing = this.widgets.some(w =>
                        w.stageName === stageName && w.target === individualId
                    );

                    if (!alreadyShowing) {
                        // Populate field values from current state
                        const fields = (viewConfig.fields || []).map(f => ({
                            ...f,
                            value: state[f.name] || f.value || ''
                        }));

                        this.addWidget({
                            ...viewConfig,
                            stageName: stageName,
                            target: individualId,
                            fields: fields,
                            concept: viewConfig.concept || this.inferConcept(individualId),
                            model: modelName
                        });
                        console.log(`Showing stage view: ${stageName}`);
                    }
                }
            }
        }

        // 2. Check View definitions from events
        const viewDefs = this.getViewDefinitions(modelName);
        console.log(`Found ${viewDefs.length} view definitions from events`);

        if (viewDefs.length === 0) return;

        // Check each view's condition
        viewDefs.forEach(viewDef => {
            const condition = viewDef.condition;

            // If no condition, or condition is met, show the view
            const shouldShow = !condition || Memory.checkCondition(condition, individualId);

            console.log(`View "${viewDef.title}": condition="${condition}", shouldShow=${shouldShow}`);

            if (shouldShow) {
                // Check if this view is already showing
                const alreadyShowing = this.widgets.some(w =>
                    w.viewDefId === viewDef.id ||
                    (w.title === viewDef.title && w.target === individualId)
                );

                if (!alreadyShowing) {
                    // Create widget from view definition
                    const widget = this.createWidgetFromViewDef(viewDef, individualId, state);
                    if (widget) {
                        console.log(`Showing view: ${viewDef.title}`);
                    }
                }
            }
        });
    },

    /**
     * Get View definitions from model events
     * Views are stored as: ModelEvent: View: ViewName with nested properties
     */
    getViewDefinitions(modelName) {
        const views = [];
        const events = Memory.getAllEvents();

        // Find the model event
        const modelEvent = events.find(e =>
            e.type === 'Model' && e.value === modelName
        );

        if (!modelEvent) {
            // Also check for views defined directly on concept
            const concept = modelName.replace('Model ', '');
            const conceptViews = events.filter(e =>
                e.base === concept && e.type === 'View'
            );

            conceptViews.forEach(viewEvent => {
                const viewDef = this.parseViewDefinition(viewEvent, events);
                if (viewDef) views.push(viewDef);
            });

            return views;
        }

        // Find View events nested under model
        const viewEvents = events.filter(e =>
            e.base === modelEvent.id && e.type === 'View'
        );

        viewEvents.forEach(viewEvent => {
            const viewDef = this.parseViewDefinition(viewEvent, events);
            if (viewDef) views.push(viewDef);
        });

        return views;
    },

    /**
     * Parse view definition from event and its nested events
     */
    parseViewDefinition(viewEvent, allEvents) {
        const nested = allEvents.filter(e => e.base === viewEvent.id);

        // Build view definition
        const viewDef = {
            id: viewEvent.id,
            title: viewEvent.value,
            type: 'form', // default
            condition: null,
            fields: [],
            actions: []
        };

        nested.forEach(e => {
            switch (e.type) {
                case 'Condition':
                    viewDef.condition = e.value;
                    break;
                case 'ViewType':
                    viewDef.type = e.value;
                    break;
                case 'Attribute':
                case 'Field':
                    // Get field restrictions
                    const fieldNested = allEvents.filter(n => n.base === e.id);
                    const field = {
                        name: e.value,
                        label: e.value,
                        type: 'text',
                        required: false
                    };
                    fieldNested.forEach(fn => {
                        if (fn.type === 'Required') field.required = fn.value === '1' || fn.value === true;
                        if (fn.type === 'DataType') field.type = this.mapDataType(fn.value);
                        if (fn.type === 'Condition') field.condition = fn.value;
                        if (fn.type === 'Label') field.label = fn.value;
                    });
                    viewDef.fields.push(field);
                    break;
                case 'Action':
                    const actionNested = allEvents.filter(n => n.base === e.id);
                    const action = {
                        label: e.value,
                        action: e.value.toLowerCase()
                    };
                    actionNested.forEach(an => {
                        if (an.type === 'ActionType') action.action = an.value;
                        if (an.type === 'Primary') action.primary = an.value === '1' || an.value === true;
                    });
                    viewDef.actions.push(action);
                    break;
            }
        });

        return viewDef;
    },

    /**
     * Map BSL DataType to HTML input type
     */
    mapDataType(dataType) {
        const mapping = {
            'BasicType': 'text',
            'TextType': 'text',
            'Numeric': 'number',
            'Boolean': 'checkbox',
            'DateTime': 'datetime-local',
            'EnumType': 'select'
        };
        return mapping[dataType] || 'text';
    },

    /**
     * Create widget from view definition
     */
    createWidgetFromViewDef(viewDef, individualId, state) {
        // Determine concept from individual
        const concept = this.inferConcept(individualId);
        const model = `Model ${concept}`;

        // Populate field values from state
        const fields = viewDef.fields.map(f => ({
            ...f,
            value: state[f.name] || ''
        }));

        // Add default actions if none defined
        const actions = viewDef.actions.length > 0 ? viewDef.actions : [
            { label: 'Submit', action: 'submit', primary: true },
            { label: 'Cancel', action: 'close' }
        ];

        return this.addWidget({
            type: viewDef.type,
            title: viewDef.title,
            viewDefId: viewDef.id,
            mode: 'edit',
            target: individualId,
            concept: concept,
            model: model,
            fields: fields,
            actions: actions
        });
    },

    /**
     * Register a stage view template
     * Used by models to define what views appear at each stage
     */
    stageViews: {},

    registerStageView(modelName, stageName, viewConfig) {
        if (!this.stageViews[modelName]) {
            this.stageViews[modelName] = {};
        }
        this.stageViews[modelName][stageName] = viewConfig;
        console.log(`Registered stage view: ${modelName}.${stageName}`);
    },

    /**
     * Show next stage view based on current state
     */
    showNextStage(individualId, modelName) {
        const stages = this.stageViews[modelName];
        if (!stages) return false;

        const state = Memory.getIndividualState(individualId);

        // Find first stage whose condition is met and not already showing
        for (const [stageName, viewConfig] of Object.entries(stages)) {
            const condition = viewConfig.condition;
            const shouldShow = !condition || Memory.checkCondition(condition, individualId);

            if (shouldShow) {
                const alreadyShowing = this.widgets.some(w =>
                    w.stageName === stageName && w.target === individualId
                );

                if (!alreadyShowing) {
                    this.addWidget({
                        ...viewConfig,
                        stageName: stageName,
                        target: individualId,
                        concept: viewConfig.concept || this.inferConcept(individualId),
                        model: modelName
                    });
                    return true;
                }
            }
        }

        return false;
    },

    // ============================================
    // WORKSPACE FUNCTIONALITY
    // ============================================

    /**
     * Open workspace for application
     * Creates a full workspace with sidebar + content layout
     */
    openWorkspace(appId) {
        const appState = Memory.getIndividualState(appId);
        const models = this.getAppModels(appId, appState);

        // Build model info list
        const modelList = models.map(modelName => {
            const conceptName = modelName.replace(/^Model\s+/, '');
            return {
                name: modelName,
                label: conceptName,
                icon: this.getConceptIcon(conceptName)
            };
        });

        const workspace = {
            id: `workspace_${appId}_${Date.now()}`,
            type: 'workspace',
            appId: appId,
            title: appState.Title || appId,
            icon: appState.Icon || '📱',
            models: modelList,
            state: {
                currentModel: modelList[0]?.name || null,
                currentView: 'list',
                selectedIndividual: null,
                history: []
            }
        };

        this.addWidget(workspace);
    },

    /**
     * Render workspace widget with sidebar + content layout
     */
    renderWorkspace(widget) {
        const { appId, title, icon, models, state } = widget;

        return `
            <div class="widget workspace-widget" data-widget-id="${widget.id}" data-app="${appId}">
                <div class="workspace-container">
                    <div class="workspace-header">
                        <div class="workspace-title">
                            <span class="workspace-icon">${icon || '📱'}</span>
                            <span>${this.escape(title)}</span>
                        </div>
                        <div class="workspace-actions">
                            <button class="workspace-btn" onclick="UIRenderer.closeWorkspace('${widget.id}')" title="Close">×</button>
                        </div>
                    </div>
                    <div class="workspace-body">
                        <div class="workspace-sidebar">
                            ${this.renderWorkspaceSidebar(widget)}
                        </div>
                        <div class="workspace-content">
                            ${this.renderWorkspaceContent(widget)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render workspace sidebar with models and views
     */
    renderWorkspaceSidebar(widget) {
        const { models, state } = widget;

        const modelItems = (models || []).map(m => `
            <div class="sidebar-item ${state.currentModel === m.name ? 'active' : ''}"
                 onclick="UIRenderer.selectWorkspaceModel('${widget.id}', '${this.escape(m.name)}')">
                <span class="sidebar-icon">${m.icon || '📋'}</span>
                <span class="sidebar-label">${this.escape(m.label)}</span>
            </div>
        `).join('');

        // Add "Add Model" button
        const addModelBtn = `
            <div class="sidebar-item" onclick="UIRenderer.setWorkspaceView('${widget.id}', 'config')"
                 style="color: var(--accent); border: 1px dashed var(--border);">
                <span class="sidebar-icon">+</span>
                <span class="sidebar-label">Add Model</span>
            </div>
        `;

        const viewItems = (models && models.length > 0) ? `
            <div class="sidebar-item ${state.currentView === 'list' ? 'active' : ''}"
                 onclick="UIRenderer.setWorkspaceView('${widget.id}', 'list')">
                <span class="sidebar-icon">📋</span>
                <span class="sidebar-label">List</span>
            </div>
        ` : '';

        return `
            <div class="sidebar-section">
                <div class="sidebar-title">Models</div>
                ${modelItems || ''}
                ${addModelBtn}
            </div>
            ${viewItems ? `
            <div class="sidebar-section">
                <div class="sidebar-title">Views</div>
                ${viewItems}
            </div>
            ` : ''}
        `;
    },

    /**
     * Render workspace content area based on current state
     */
    renderWorkspaceContent(widget) {
        const { state, models, appId } = widget;

        // If no models in workspace - show configuration view
        if (!models || models.length === 0) {
            return this.renderWorkspaceConfigView(widget);
        }

        if (!state.currentModel) {
            return '<div class="workspace-empty">Select a model from the sidebar</div>';
        }

        // Dispatch based on current view
        switch (state.currentView) {
            case 'list':
                return this.renderWorkspaceListView(widget);
            case 'detail':
                return this.renderWorkspaceDetailView(widget);
            case 'form':
                return this.renderWorkspaceFormView(widget);
            case 'config':
                return this.renderWorkspaceConfigView(widget);
            default:
                return this.renderWorkspaceListView(widget);
        }
    },

    /**
     * Render configuration view for workspace (when no models)
     */
    renderWorkspaceConfigView(widget) {
        const { appId } = widget;
        const events = Memory.getAllEvents();

        // Get all available models (not system models like Model_Application)
        const availableModels = events
            .filter(e => e.type === 'Model' && !e.value.startsWith('Model_'))
            .map(e => e.value);

        const modelOptions = availableModels.map(m => `
            <button class="list-btn" style="margin: 0.25rem;" onclick="UIRenderer.addModelToApp('${widget.id}', '${this.escape(m)}')">
                + ${this.escape(m.replace(/^Model\s+/, ''))}
            </button>
        `).join('');

        return `
            <div class="workspace-config-view">
                <h3 style="color: var(--accent); margin-bottom: 1rem;">Configure Application</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    This application has no models linked yet. Add models to enable data management.
                </p>
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--text-secondary); font-size: 0.75rem;">Available Models:</strong>
                </div>
                <div style="display: flex; flex-wrap: wrap;">
                    ${modelOptions || '<span style="color: var(--text-muted);">No models available. Create models first.</span>'}
                </div>
            </div>
        `;
    },

    /**
     * Add model to application
     */
    addModelToApp(widgetId, modelName) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        const appId = widget.appId;

        // Create Models event linking app to model
        Memory.addEvent({
            base: appId,
            type: 'Models',
            value: modelName,
            actor: 'user',
            model: 'Model_Application'
        });

        // Update widget models list
        const conceptName = modelName.replace(/^Model\s+/, '');
        widget.models.push({
            name: modelName,
            label: conceptName,
            icon: this.getConceptIcon(conceptName)
        });

        // Set as current model if first one
        if (!widget.state.currentModel) {
            widget.state.currentModel = modelName;
        }

        // Update UI
        if (typeof renderEvents === 'function') renderEvents();
        if (typeof updateStats === 'function') updateStats();
        this.render();

        console.log(`Added model ${modelName} to application ${appId}`);
    },

    /**
     * Render list view within workspace
     */
    renderWorkspaceListView(widget) {
        const { state, appId } = widget;
        const modelName = state.currentModel;

        if (!modelName) {
            return '<div class="workspace-empty">Select a model</div>';
        }

        // Get individuals for this model
        const individuals = this.getIndividualsByModel(modelName);
        const columns = this.getModelColumns(modelName);

        // Toolbar
        const toolbar = `
            <div class="list-view-toolbar">
                <button class="list-btn primary" onclick="UIRenderer.createNewInWorkspace('${widget.id}')">
                    + New ${modelName.replace(/^Model\s+/, '')}
                </button>
            </div>
        `;

        if (individuals.length === 0) {
            return `
                ${toolbar}
                <div class="workspace-empty">
                    <p>No ${modelName.replace(/^Model\s+/, '')} items yet</p>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">Click "+ New" to create one</p>
                </div>
            `;
        }

        // Build table headers
        const headerCells = columns.slice(0, 4).map(col =>
            `<th class="list-header-cell">${this.escape(col.label)}</th>`
        ).join('');

        // Build table rows
        const rows = individuals.map(ind => {
            const indState = Memory.getIndividualState(ind.value);
            const cells = columns.slice(0, 4).map(col =>
                `<td class="list-cell">${this.escape(indState[col.name] || '')}</td>`
            ).join('');

            return `
                <tr class="list-row" onclick="UIRenderer.openDetailInWorkspace('${widget.id}', '${this.escape(ind.value)}')">
                    ${cells}
                    <td class="list-cell list-actions">
                        <button class="list-action-btn" onclick="event.stopPropagation(); UIRenderer.editInWorkspace('${widget.id}', '${this.escape(ind.value)}')" title="Edit">✏️</button>
                        <button class="list-action-btn" onclick="event.stopPropagation(); UIRenderer.deleteInWorkspace('${widget.id}', '${this.escape(ind.value)}')" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            ${toolbar}
            <div class="list-view-table-wrapper">
                <table class="list-view-table">
                    <thead>
                        <tr>${headerCells}<th class="list-header-cell" style="width: 80px;">Actions</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            ${this.renderWorkflowActions(widget, null)}
        `;
    },

    /**
     * Render detail view within workspace
     */
    renderWorkspaceDetailView(widget) {
        const { state } = widget;
        const individualId = state.selectedIndividual;

        if (!individualId) {
            return '<div class="workspace-empty">No item selected</div>';
        }

        const indState = Memory.getIndividualState(individualId);
        const columns = this.getModelColumns(state.currentModel);

        // Back button
        const backBtn = `
            <button class="list-btn" onclick="UIRenderer.setWorkspaceView('${widget.id}', 'list')">
                ← Back to List
            </button>
        `;

        // Field display
        const fields = columns.map(col => `
            <div class="detail-field">
                <span class="detail-label">${this.escape(col.label)}</span>
                <span class="detail-value">${this.escape(indState[col.name] || '-')}</span>
            </div>
        `).join('');

        // Actions
        const actions = `
            <div class="detail-actions">
                <button class="list-btn primary" onclick="UIRenderer.editInWorkspace('${widget.id}', '${this.escape(individualId)}')">Edit</button>
                <button class="list-btn danger" onclick="UIRenderer.deleteInWorkspace('${widget.id}', '${this.escape(individualId)}')">Delete</button>
            </div>
        `;

        return `
            <div class="detail-view">
                <div class="detail-toolbar">${backBtn}</div>
                <h3 class="detail-title">${this.escape(individualId)}</h3>
                <div class="detail-fields">${fields}</div>
                ${actions}
                ${this.renderWorkflowActions(widget, individualId)}
            </div>
        `;
    },

    /**
     * Render form view within workspace (create/edit)
     */
    renderWorkspaceFormView(widget) {
        const { state, appId } = widget;
        const modelName = state.currentModel;
        const individualId = state.selectedIndividual;
        const isEdit = !!individualId;

        // Get model fields
        const formConfig = this.buildFormFromModel(modelName, null);
        if (!formConfig) {
            return '<div class="workspace-empty">Cannot load form for this model</div>';
        }

        // If editing, populate field values
        const indState = isEdit ? Memory.getIndividualState(individualId) : {};
        const fields = formConfig.fields.map(f => ({
            ...f,
            value: indState[f.name] !== undefined ? indState[f.name] : (f.defaultValue || '')
        }));

        // Back button
        const backBtn = `
            <button class="list-btn" onclick="UIRenderer.setWorkspaceView('${widget.id}', 'list')">
                ← Back to List
            </button>
        `;

        // Build form fields
        const formFields = fields.map(f => `
            <div class="form-field">
                <label class="form-label">
                    ${this.escape(f.label)}${f.required ? ' *' : ''}
                </label>
                ${this.renderFormField(widget.id, f)}
            </div>
        `).join('');

        const formId = `workspace_form_${widget.id}`;
        const title = isEdit ? `Edit: ${individualId}` : `New ${modelName.replace(/^Model\s+/, '')}`;

        return `
            <div class="workspace-form-view">
                <div class="form-toolbar">${backBtn}</div>
                <h3 class="form-title">${this.escape(title)}</h3>
                <form id="${formId}" onsubmit="UIRenderer.handleWorkspaceFormSubmit(event, '${widget.id}')">
                    <input type="hidden" name="_model" value="${this.escape(modelName)}">
                    <input type="hidden" name="_target" value="${this.escape(individualId || '')}">
                    <input type="hidden" name="_concept" value="${this.escape(formConfig.concept)}">
                    ${formFields}
                    <div class="form-actions">
                        <button type="submit" class="list-btn primary">${isEdit ? 'Save' : 'Create'}</button>
                        <button type="button" class="list-btn" onclick="UIRenderer.setWorkspaceView('${widget.id}', 'list')">Cancel</button>
                    </div>
                </form>
            </div>
        `;
    },

    /**
     * Get individuals by model name
     * Filters out deleted individuals
     */
    getIndividualsByModel(modelName) {
        const events = Memory.getAllEvents();

        // Find concept from model
        const modelEvent = events.find(e =>
            e.type === 'Model' && e.value === modelName
        );
        const concept = modelEvent?.base;

        // Find all individuals of this concept with this model
        return events.filter(e => {
            if (e.type !== 'Individual') return false;

            // Check if base matches concept
            if (e.base === concept) {
                const state = Memory.getIndividualState(e.value);

                // Filter out deleted individuals
                const isDeleted = state.Delete === '1' || state.Delete === 1 || state.Delete === true;
                if (isDeleted) return false;

                // Include if no SetModel or SetModel matches
                return !state.SetModel || state.SetModel === modelName;
            }
            return false;
        });
    },

    /**
     * Get columns/fields for model
     */
    getModelColumns(modelName) {
        const events = Memory.getAllEvents();

        const modelEvent = events.find(e =>
            e.type === 'Model' && e.value === modelName
        );

        if (!modelEvent) return [];

        // Get Attribute and Relation events for this model
        const fieldEvents = events.filter(e =>
            e.cause === modelEvent.id &&
            (e.type === 'Attribute' || e.type === 'Relation')
        );

        return fieldEvents.map(e => ({
            name: e.value,
            label: this.formatLabel(e.value),
            type: e.type
        }));
    },

    /**
     * Select model in workspace
     */
    selectWorkspaceModel(widgetId, modelName) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        widget.state.currentModel = modelName;
        widget.state.currentView = 'list';
        widget.state.selectedIndividual = null;
        this.render();
    },

    /**
     * Set view in workspace
     */
    setWorkspaceView(widgetId, view) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        widget.state.currentView = view;
        if (view === 'list') {
            widget.state.selectedIndividual = null;
        }
        this.render();
    },

    /**
     * Open detail view in workspace
     */
    openDetailInWorkspace(widgetId, individualId) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        widget.state.selectedIndividual = individualId;
        widget.state.currentView = 'detail';
        this.render();
    },

    /**
     * Create new item in workspace
     */
    createNewInWorkspace(widgetId) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        widget.state.selectedIndividual = null;
        widget.state.currentView = 'form';
        this.render();
    },

    /**
     * Edit item in workspace
     */
    editInWorkspace(widgetId, individualId) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        widget.state.selectedIndividual = individualId;
        widget.state.currentView = 'form';
        this.render();
    },

    /**
     * Delete item in workspace
     */
    deleteInWorkspace(widgetId, individualId) {
        if (!confirm(`Delete ${individualId}?`)) return;

        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        // Create Delete event
        Memory.addEvent({
            base: individualId,
            type: 'Delete',
            value: '1',
            actor: 'user',
            model: widget.state.currentModel
        });

        // Return to list
        widget.state.selectedIndividual = null;
        widget.state.currentView = 'list';

        // Update UI
        if (typeof renderEvents === 'function') renderEvents();
        if (typeof updateStats === 'function') updateStats();
        this.render();
    },

    /**
     * Close workspace
     */
    closeWorkspace(widgetId) {
        this.removeWidget(widgetId);
    },

    /**
     * Handle workspace form submit
     */
    handleWorkspaceFormSubmit(event, widgetId) {
        event.preventDefault();

        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        const form = event.target;
        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            if (!key.startsWith('_')) {
                data[key] = value;
            }
        });

        const modelName = formData.get('_model');
        const targetId = formData.get('_target');
        const concept = formData.get('_concept');
        const isEdit = !!targetId;

        // Generate new ID if creating
        let target = targetId;
        if (!isEdit) {
            const labelField = data.name || data.title || data.label;
            if (labelField) {
                target = labelField
                    .toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-zа-яё0-9_]/gi, '');
                if (!target || target === '_') {
                    target = concept.toLowerCase() + '_' + Date.now().toString(36);
                }
            } else {
                target = concept.toLowerCase() + '_' + Date.now().toString(36);
            }
        }

        const createdEvents = [];

        // Create individual if new
        if (!isEdit) {
            createdEvents.push(Memory.addEvent({
                base: concept,
                type: 'Individual',
                value: target,
                actor: 'user'
            }));

            createdEvents.push(Memory.addEvent({
                base: target,
                type: 'SetModel',
                value: modelName,
                actor: 'user',
                model: modelName,
                cause: createdEvents[0].id
            }));
        }

        // Create property events
        const currentState = isEdit ? Memory.getIndividualState(target) : {};
        Object.entries(data).forEach(([fieldName, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                const currentValue = currentState[fieldName];
                if (currentValue === undefined || String(currentValue) !== String(value)) {
                    createdEvents.push(Memory.addEvent({
                        base: target,
                        type: fieldName,
                        value: value,
                        actor: 'user',
                        model: modelName,
                        cause: !isEdit && createdEvents[1] ? createdEvents[1].id : null
                    }));
                }
            }
        });

        console.log(`Created ${createdEvents.length} events for ${target}`);

        // Execute dataflow
        Memory.executeToFixpoint(target);

        // Update UI
        if (typeof renderEvents === 'function') renderEvents();
        if (typeof updateStats === 'function') updateStats();

        // Return to list view
        widget.state.currentView = 'list';
        widget.state.selectedIndividual = null;
        this.render();

        if (typeof addSystemMessage === 'function') {
            const action = isEdit ? 'Updated' : 'Created';
            addSystemMessage(`${action} ${concept}: ${target}`);
        }
    },

    // ============================================
    // WORKFLOW FUNCTIONALITY
    // ============================================

    /**
     * Get workflows (SetDo) defined in model
     */
    getModelWorkflows(modelName) {
        const events = Memory.getAllEvents();
        const modelEvent = events.find(e =>
            e.type === 'Model' && e.value === modelName
        );

        if (!modelEvent) return [];

        // Find all SetDo events under model attributes
        const workflows = [];

        // Get all attributes/relations of model
        const fields = events.filter(e =>
            e.cause === modelEvent.id &&
            (e.type === 'Attribute' || e.type === 'Relation')
        );

        fields.forEach(field => {
            // Find SetDo under this field
            const setDoEvents = events.filter(e =>
                e.cause === field.id && e.type === 'SetDo'
            );

            setDoEvents.forEach(setDo => {
                // Find associated Condition
                const conditionEvent = events.find(e =>
                    e.cause === field.id && e.type === 'Condition'
                );

                workflows.push({
                    id: setDo.id,
                    action: setDo.value,
                    field: field.value,
                    condition: conditionEvent?.value || null
                });
            });
        });

        return workflows;
    },

    /**
     * Render workflow action buttons
     */
    renderWorkflowActions(widget, individualId) {
        const workflows = this.getModelWorkflows(widget.state.currentModel);

        if (workflows.length === 0) return '';

        // Filter by condition if individual is provided
        const availableWorkflows = individualId
            ? workflows.filter(w => !w.condition || Memory.checkCondition(w.condition, individualId))
            : workflows;

        if (availableWorkflows.length === 0) return '';

        const buttons = availableWorkflows.map(w => {
            const label = this.formatWorkflowLabel(w.action);
            return `
                <button class="workflow-btn"
                        onclick="UIRenderer.executeWorkflow('${widget.id}', '${this.escape(w.id)}', '${this.escape(individualId || '')}')">
                    ${this.escape(label)}
                </button>
            `;
        }).join('');

        return `
            <div class="workflow-actions-bar">
                <span class="workflow-label">Actions:</span>
                ${buttons}
            </div>
        `;
    },

    /**
     * Format workflow action label
     */
    formatWorkflowLabel(action) {
        // CreateIndividual(Task) -> "Create Task"
        const createMatch = action.match(/CreateIndividual\((\w+)\)/);
        if (createMatch) {
            return `Create ${createMatch[1]}`;
        }

        // EditIndividual(...) -> "Edit"
        if (action.includes('EditIndividual')) {
            return 'Edit';
        }

        // Default: format action name
        return action.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    },

    /**
     * Execute workflow action
     */
    async executeWorkflow(widgetId, workflowId, individualId) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        const workflows = this.getModelWorkflows(widget.state.currentModel);
        const workflow = workflows.find(w => w.id === workflowId);

        if (!workflow) {
            console.error('Workflow not found:', workflowId);
            return;
        }

        console.log('Executing workflow:', workflow);

        // Parse action
        if (workflow.action.startsWith('CreateIndividual')) {
            const conceptMatch = workflow.action.match(/CreateIndividual\((\w+)\)/);
            if (conceptMatch) {
                const concept = conceptMatch[1];
                const modelName = `Model ${concept}`;

                // Switch to create form for that model
                if (widget.state.currentModel !== modelName) {
                    widget.state.currentModel = modelName;
                }
                widget.state.selectedIndividual = null;
                widget.state.currentView = 'form';
                this.render();
            }
        }
        else if (workflow.action.includes('EditIndividual')) {
            if (individualId) {
                widget.state.selectedIndividual = individualId;
                widget.state.currentView = 'form';
                this.render();
            }
        }
        else {
            // Custom action - trigger dataflow
            if (individualId) {
                await this.triggerDataflow(individualId);

                // Refresh view
                if (typeof renderEvents === 'function') renderEvents();
                this.render();
            }
        }
    },

    /**
     * Trigger dataflow execution on backend
     */
    async triggerDataflow(individualId) {
        try {
            const response = await fetch('/api/dataflow/fixpoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ individual: individualId })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Dataflow result:', result);

                // Sync memory
                await Memory.sync();
            }
        } catch (error) {
            console.error('Dataflow error:', error);
        }
    },

    /**
     * Escape HTML - handles objects by converting to readable string
     */
    escape(str) {
        if (str === null || str === undefined) return '';

        // Handle objects - convert to readable string
        if (typeof str === 'object') {
            // If array, join with comma
            if (Array.isArray(str)) {
                return str.map(item => this.escape(item)).join(', ');
            }
            // If object has common display properties, use them
            if (str.label) return this.escape(str.label);
            if (str.name) return this.escape(str.name);
            if (str.title) return this.escape(str.title);
            if (str.value) return this.escape(str.value);
            if (str.text) return this.escape(str.text);
            if (str.id) return this.escape(str.id);
            // Fallback to JSON
            try {
                return JSON.stringify(str);
            } catch (e) {
                return '[Object]';
            }
        }

        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Format value for display - extracts readable string from various types
     */
    formatDisplayValue(value) {
        if (value === null || value === undefined) return '';

        // Primitives
        if (typeof value !== 'object') return String(value);

        // Array of objects - format each
        if (Array.isArray(value)) {
            return value.map(item => this.formatDisplayValue(item)).join(', ');
        }

        // Object - try to extract meaningful display value
        if (value.label) return value.label;
        if (value.name) return value.name;
        if (value.title) return value.title;
        if (value.value !== undefined) return this.formatDisplayValue(value.value);
        if (value.text) return value.text;
        if (value.id) return value.id;

        // Fallback to JSON
        try {
            return JSON.stringify(value);
        } catch (e) {
            return '[Object]';
        }
    },

    // ========================================
    // BSL EDITOR
    // ========================================

    /**
     * Open BSL Editor modal
     */
    openBSLEditor() {
        // Create modal if not exists
        let modal = document.getElementById('bsl-editor-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bsl-editor-modal';
            modal.className = 'bsl-modal';
            modal.innerHTML = `
                <div class="bsl-modal-content">
                    <div class="bsl-modal-header">
                        <h3>BSL Editor</h3>
                        <div class="bsl-header-actions">
                            <select id="bsl-model-select" onchange="UIRenderer.loadModelToBSL(this.value)">
                                <option value="">-- Select Model --</option>
                            </select>
                            <button class="bsl-btn" onclick="UIRenderer.loadAllModelsToBSL()" title="Load all models">Load All</button>
                            <button class="bsl-btn" onclick="UIRenderer.clearBSLEditor()" title="Clear editor">Clear</button>
                            <button class="bsl-btn validate" onclick="UIRenderer.validateBSLOnly()" title="Validate BSL">Validate</button>
                            <button class="bsl-btn primary" onclick="UIRenderer.parseBSL()" title="Validate and save">Save</button>
                            <button class="bsl-btn-close" onclick="UIRenderer.closeBSLEditor()">×</button>
                        </div>
                    </div>
                    <div class="bsl-modal-body">
                        <div class="bsl-sidebar" id="bsl-sidebar">
                            <div class="bsl-sidebar-header">
                                <span>Structure</span>
                                <button class="bsl-sidebar-refresh" onclick="UIRenderer.refreshBSLTree()" title="Refresh">↻</button>
                            </div>
                            <div class="bsl-tree" id="bsl-tree"></div>
                        </div>
                        <textarea id="bsl-editor-textarea" placeholder="# BSL Model Editor

# Example:
Person: Model: Model Person
: Attribute: name
:: Required: 1
:: DataType: BasicType
: Attribute: age
:: DataType: Numeric
: Relation: spouse
:: Range: Person
:: Condition: $.age >= 18

# Create individuals:
Person: Individual: john_smith
: SetModel: Model Person
: name: John Smith
: age: 30
"></textarea>
                    </div>
                    <div class="bsl-modal-footer">
                        <div id="bsl-status" class="bsl-status"></div>
                        <div class="bsl-footer-actions">
                            <button class="bsl-btn" onclick="UIRenderer.downloadBSL()">Download</button>
                            <label class="bsl-btn">
                                Upload
                                <input type="file" id="bsl-file-input" accept=".bsl,.txt,.pef" onchange="UIRenderer.uploadBSL(event)" style="display:none">
                            </label>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Populate model selector
        this.populateBSLModelSelect();

        // Build tree
        this.refreshBSLTree();

        // Show modal
        modal.style.display = 'flex';
    },

    /**
     * Refresh BSL tree structure
     */
    refreshBSLTree() {
        const tree = document.getElementById('bsl-tree');
        if (!tree) return;

        // Build hierarchy: Concept -> Model -> Fields
        const hierarchy = this.buildConceptModelHierarchy();

        // Render tree
        tree.innerHTML = this.renderBSLTree(hierarchy);
    },

    /**
     * Build concept -> model -> fields hierarchy
     *
     * BSL Structure (Variant A):
     * - Concept: Entity definition (Person, Task)
     * - Model: Model event with base=concept (Model Person has base=Person)
     * - Attribute/Relation: Field events with base=model.id
     * - Restriction: Constraint events with base=field.id (Required, Range, DataType)
     *
     * Important: Genesis contains TYPE DEFINITIONS (e.g., Multiple is a type of Restriction)
     * vs APPLICATIONS of those types (e.g., a field has Multiple:1)
     */
    buildConceptModelHierarchy() {
        const hierarchy = {};

        // System/meta types that should not appear as concepts in the tree
        // These are type definitions, not user concepts
        const systemTypes = new Set([
            'Event', 'Instance', 'Delete', 'Actor', 'Concept', 'Model', 'Individual',
            'Attribute', 'Relation', 'Role', 'Restriction', 'DataType', 'Entity'
        ]);

        // Known restriction types (from genesis) - used for identifying field constraints
        const restrictionTypes = new Set([
            'Required', 'Multiple', 'Unique', 'UniqueIdentifier', 'Immutable', 'Mutable',
            'DataType', 'Range', 'SetRange', 'Domain',
            'Condition', 'ValueCondition', 'Permission',
            'SetValue', 'Default', 'Cardinality', 'AttributeValue'
        ]);

        // Get all models
        const allModels = Memory.getInstancesOfType('Model');

        // Filter models: exclude system models AND models for system types
        const userModels = allModels.filter(model => {
            // Exclude Model_* system models
            if (model.value.startsWith('Model_')) return false;

            // Exclude models for system types (e.g., Model for Attribute, Restriction, etc.)
            if (systemTypes.has(model.base)) return false;

            return true;
        });

        userModels.forEach(model => {
            const conceptName = model.base;

            if (!hierarchy[conceptName]) {
                hierarchy[conceptName] = {
                    name: conceptName,
                    models: []
                };
            }

            // Get model fields - events with base=model.id and type=Attribute or Relation
            const modelId = model.id || model.value;
            const allChildren = Memory.getEventsByBase(modelId);

            // Filter to only Attribute and Relation (not type definitions)
            // Also exclude events where type is 'Individual' (these are type definitions)
            const fields = allChildren.filter(e =>
                (e.type === 'Attribute' || e.type === 'Relation') &&
                e.type !== 'Individual'
            );

            const modelInfo = {
                id: modelId,
                name: model.value,
                fields: fields.map(f => {
                    // Get restrictions for this field - events with base=field.id
                    // and type is a known restriction type
                    const fieldChildren = Memory.getEventsByBase(f.id);
                    const restrictions = fieldChildren.filter(r =>
                        restrictionTypes.has(r.type)
                    );

                    return {
                        id: f.id,
                        name: f.value,
                        type: f.type,
                        restrictions: restrictions.map(r => ({
                            type: r.type,
                            value: r.value
                        }))
                    };
                })
            };

            hierarchy[conceptName].models.push(modelInfo);
        });

        return hierarchy;
    },

    /**
     * Render BSL tree HTML
     */
    renderBSLTree(hierarchy) {
        if (Object.keys(hierarchy).length === 0) {
            return '<div class="bsl-tree-empty">No models found</div>';
        }

        let html = '';

        Object.keys(hierarchy).sort().forEach(conceptName => {
            const concept = hierarchy[conceptName];

            html += `
                <div class="bsl-tree-concept">
                    <div class="bsl-tree-item concept" onclick="UIRenderer.toggleBSLNode(this)">
                        <span class="bsl-tree-icon">📦</span>
                        <span class="bsl-tree-label">${this.escape(conceptName)}</span>
                        <span class="bsl-tree-arrow">▶</span>
                    </div>
                    <div class="bsl-tree-children">
            `;

            concept.models.forEach(model => {
                html += `
                    <div class="bsl-tree-model">
                        <div class="bsl-tree-item model" onclick="UIRenderer.toggleBSLNode(this)" data-model="${this.escape(model.name)}">
                            <span class="bsl-tree-icon">📋</span>
                            <span class="bsl-tree-label">${this.escape(model.name.replace(/^Model[_\s]+/, ''))}</span>
                            <button class="bsl-tree-load" onclick="event.stopPropagation(); UIRenderer.loadModelToBSL('${this.escape(model.name)}')" title="Load to editor">↓</button>
                            <span class="bsl-tree-arrow">▶</span>
                        </div>
                        <div class="bsl-tree-children">
                `;

                model.fields.forEach(field => {
                    const icon = field.type === 'Attribute' ? '🔤' : '🔗';
                    const restrictionTags = field.restrictions.map(r =>
                        `<span class="bsl-tree-tag">${r.type}</span>`
                    ).join('');

                    html += `
                        <div class="bsl-tree-field">
                            <div class="bsl-tree-item field" data-field="${this.escape(field.name)}">
                                <span class="bsl-tree-icon">${icon}</span>
                                <span class="bsl-tree-label">${this.escape(field.name)}</span>
                                <span class="bsl-tree-type">${field.type}</span>
                            </div>
                            ${restrictionTags ? `<div class="bsl-tree-restrictions">${restrictionTags}</div>` : ''}
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        return html;
    },

    /**
     * Toggle BSL tree node expand/collapse
     */
    toggleBSLNode(element) {
        const parent = element.parentElement;
        parent.classList.toggle('expanded');
    },

    /**
     * Close BSL Editor modal
     */
    closeBSLEditor() {
        const modal = document.getElementById('bsl-editor-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    /**
     * Populate model select dropdown
     */
    populateBSLModelSelect() {
        const select = document.getElementById('bsl-model-select');
        if (!select) return;

        // Get all models from memory
        const models = Memory.getInstancesOfType('Model')
            .filter(e => !e.value.startsWith('Model_')) // Exclude system models
            .map(e => e.value);

        select.innerHTML = '<option value="">-- Select Model --</option>' +
            models.map(m => `<option value="${this.escape(m)}">${this.escape(m)}</option>`).join('');
    },

    /**
     * Load specific model to BSL editor
     */
    loadModelToBSL(modelName) {
        if (!modelName) return;

        const textarea = document.getElementById('bsl-editor-textarea');
        if (!textarea) return;

        const bsl = this.exportModelToBSL(modelName);
        textarea.value = bsl;
        this.setBSLStatus(`Loaded: ${modelName}`, 'success');
    },

    /**
     * Load all models to BSL editor
     */
    loadAllModelsToBSL() {
        const textarea = document.getElementById('bsl-editor-textarea');
        if (!textarea) return;

        const models = Memory.getInstancesOfType('Model')
            .filter(e => !e.value.startsWith('Model_'))
            .map(e => e.value);

        const bslParts = models.map(m => this.exportModelToBSL(m));
        textarea.value = bslParts.join('\n\n');
        this.setBSLStatus(`Loaded ${models.length} models`, 'success');
    },

    /**
     * Export model to BSL format
     */
    exportModelToBSL(modelName) {
        const lines = [];

        // Find model event
        const modelEvent = Memory.queryGraph({ type: 'Model', value: modelName })[0];
        if (!modelEvent) {
            return `# Model not found: ${modelName}`;
        }

        const conceptName = modelEvent.base;
        lines.push(`# Model: ${modelName}`);
        lines.push(`${conceptName}: Model: ${modelName}`);

        // Get model fields (Attributes and Relations)
        const fields = Memory.getEventsByBase(modelEvent.id)
            .filter(e => e.type === 'Attribute' || e.type === 'Relation');

        fields.forEach(field => {
            lines.push(`: ${field.type}: ${field.value}`);

            // Get restrictions for this field
            const restrictions = Memory.getEventsByBase(field.id);
            restrictions.forEach(r => {
                lines.push(`:: ${r.type}: ${r.value}`);
            });
        });

        return lines.join('\n');
    },

    /**
     * Clear BSL editor
     */
    clearBSLEditor() {
        const textarea = document.getElementById('bsl-editor-textarea');
        if (textarea) {
            textarea.value = '';
        }
        this.setBSLStatus('', '');
    },

    /**
     * Parse BSL and save to memory
     */
    parseBSL() {
        const textarea = document.getElementById('bsl-editor-textarea');
        if (!textarea) return;

        const bslText = textarea.value.trim();
        if (!bslText) {
            this.setBSLStatus('Nothing to parse', 'warning');
            return;
        }

        // Validate first
        const validation = this.validateBSL(bslText);

        // If there are errors, don't proceed
        if (!validation.valid) {
            const formatted = this.formatValidationResult(validation);
            this.setBSLStatus(formatted.message, 'error');
            this.showValidationDetails(validation);
            return;
        }

        // Show warnings but continue
        if (validation.warnings.length > 0) {
            this.showValidationDetails(validation);
        }

        try {
            const events = this.parseBSLText(bslText);

            if (events.length === 0) {
                this.setBSLStatus('No valid events found', 'warning');
                return;
            }

            // Add events to memory
            let added = 0;
            events.forEach(evt => {
                // Check if event already exists
                const existing = Memory.events.find(e => e.id === evt.id);
                if (!existing) {
                    Memory.addEvent(evt);
                    added++;
                }
            });

            const msg = `Parsed ${events.length} events, added ${added} new`;
            if (validation.warnings.length > 0) {
                this.setBSLStatus(`${msg} (${validation.warnings.length} warnings)`, 'warning');
            } else {
                this.setBSLStatus(msg, 'success');
            }
            this.render(); // Refresh UI
        } catch (error) {
            console.error('BSL parse error:', error);
            this.setBSLStatus(`Error: ${error.message}`, 'error');
        }
    },

    /**
     * Validate BSL without saving
     */
    validateBSLOnly() {
        const textarea = document.getElementById('bsl-editor-textarea');
        if (!textarea) return;

        const bslText = textarea.value.trim();
        if (!bslText) {
            this.setBSLStatus('Nothing to validate', 'warning');
            return;
        }

        const validation = this.validateBSL(bslText);
        const formatted = this.formatValidationResult(validation);
        this.setBSLStatus(formatted.message, formatted.type);
        this.showValidationDetails(validation);
    },

    /**
     * Show validation details in the editor
     */
    showValidationDetails(validation) {
        let detailsEl = document.getElementById('bsl-validation-details');

        if (!detailsEl) {
            const statusEl = document.getElementById('bsl-status');
            if (statusEl) {
                detailsEl = document.createElement('div');
                detailsEl.id = 'bsl-validation-details';
                detailsEl.className = 'bsl-validation-details';
                statusEl.parentNode.insertBefore(detailsEl, statusEl.nextSibling);
            }
        }

        if (!detailsEl) return;

        if (validation.errors.length === 0 && validation.warnings.length === 0) {
            detailsEl.innerHTML = '';
            return;
        }

        const allIssues = [...validation.errors, ...validation.warnings];
        const html = allIssues.map(issue => {
            const cssClass = issue.type.includes('Error') ? 'error' : 'warning';
            return `<div class="validation-item ${cssClass}">
                <span class="validation-line">Line ${issue.line}</span>
                <span class="validation-code">[${issue.code}]</span>
                <span class="validation-msg">${this.escape(issue.message)}</span>
            </div>`;
        }).join('');

        detailsEl.innerHTML = html;
    },

    /**
     * Parse BSL text into events
     */
    parseBSLText(text) {
        const events = [];
        const lines = text.split('\n');

        let currentBase = null;
        let currentLevel1 = null;  // For : level
        let currentLevel2 = null;  // For :: level

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Count leading colons to determine nesting level
            const colonMatch = line.match(/^(:*)(.*)$/);
            if (!colonMatch) continue;

            const level = colonMatch[1].length;
            const content = colonMatch[2].trim();

            // Parse content: Type: Value or Base: Type: Value
            const parts = content.split(':').map(s => s.trim());

            if (parts.length < 2) continue;

            let base, type, value;

            if (level === 0) {
                // Root level: Base: Type: Value
                if (parts.length >= 3) {
                    base = parts[0];
                    type = parts[1];
                    value = parts.slice(2).join(':').trim();
                } else {
                    continue;
                }
                currentBase = null;
                currentLevel1 = null;
                currentLevel2 = null;
            } else if (level === 1) {
                // Level 1: : Type: Value
                type = parts[0];
                value = parts.slice(1).join(':').trim();
                base = currentBase;
                currentLevel2 = null;
            } else if (level === 2) {
                // Level 2: :: Type: Value
                type = parts[0];
                value = parts.slice(1).join(':').trim();
                base = currentLevel1;
            } else if (level === 3) {
                // Level 3: ::: Type: Value
                type = parts[0];
                value = parts.slice(1).join(':').trim();
                base = currentLevel2;
            }

            if (!base || !type || value === undefined) continue;

            // Generate event ID
            const eventId = `bsl_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;

            const event = {
                id: eventId,
                base: base,
                type: type,
                value: value,
                model: 'Event',
                cause: base,
                actor: 'user',
                date: new Date().toISOString()
            };

            events.push(event);

            // Update current references for nesting
            if (level === 0) {
                // For Model events, use model name as ID
                if (type === 'Model') {
                    event.id = value;
                    currentBase = value;
                } else if (type === 'Individual') {
                    event.id = value;
                    currentBase = value;
                } else {
                    currentBase = eventId;
                }
                currentLevel1 = event.id;
            } else if (level === 1) {
                currentLevel1 = eventId;
            } else if (level === 2) {
                currentLevel2 = eventId;
            }
        }

        return events;
    },

    /**
     * Validate BSL text according to specification
     * Returns validation result with errors and warnings
     */
    validateBSL(text) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        if (!text || !text.trim()) {
            return result;
        }

        const lines = text.split('\n');

        // Known types from genesis and specification
        const validTypes = new Set([
            'Instance', 'Individual', 'Model', 'SetModel', 'Delete',
            'Attribute', 'Relation', 'Role',
            'Required', 'Multiple', 'DataType', 'Range', 'SetRange', 'Domain',
            'Condition', 'SetValue', 'SetDo', 'Permission', 'ValueCondition',
            'Default', 'Unique', 'UniqueIdentifier', 'Immutable', 'Mutable',
            'Cardinality', 'AttributeValue', 'Title', 'Icon', 'Description',
            'Models', 'Vocabularies', 'Attributes', 'Relations', 'Roles'
        ]);

        const restrictionTypes = new Set([
            'Required', 'Multiple', 'DataType', 'Range', 'SetRange', 'Domain',
            'Condition', 'SetValue', 'SetDo', 'Permission', 'ValueCondition',
            'Default', 'Unique', 'UniqueIdentifier', 'Immutable', 'Mutable',
            'Cardinality', 'AttributeValue'
        ]);

        const propertyTypes = new Set(['Attribute', 'Relation', 'Role']);

        const validDataTypes = new Set([
            'Text', 'BasicType', 'Numeric', 'Boolean', 'DateTime', 'Date',
            'Time', 'EnumType', 'File', 'Image', 'URL', 'Email', 'Phone'
        ]);

        // Parse context tracking
        let prevLevel = -1;
        let contextStack = []; // [{level, type, base, isModel, isConcept, isVocabulary}]

        // Known entities from existing memory
        const existingConcepts = new Set(
            Memory.getInstancesOfType('Instance')
                .filter(e => e.base === 'Concept')
                .map(e => e.value)
        );
        existingConcepts.add('Concept');
        existingConcepts.add('Attribute');
        existingConcepts.add('Relation');
        existingConcepts.add('Role');
        existingConcepts.add('Vocabulary');
        existingConcepts.add('Application');

        // Track defined concepts in this BSL
        const definedConcepts = new Set();
        const definedModels = new Set();

        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            const line = lines[i];
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) continue;

            // SYNTAX_003: Check quote balance
            const quoteCount = (trimmed.match(/"/g) || []).length;
            if (quoteCount % 2 !== 0) {
                result.errors.push({
                    type: 'Syntax Error',
                    line: lineNum,
                    message: 'Unbalanced quotes',
                    code: 'SYNTAX_003'
                });
                result.valid = false;
                continue;
            }

            // Determine nesting level
            const colonMatch = line.match(/^(:*)(.*)$/);
            if (!colonMatch) continue;

            const level = colonMatch[1].length;
            const content = colonMatch[2].trim();

            // SYNTAX_004: Check max nesting
            if (level > 5) {
                result.errors.push({
                    type: 'Syntax Error',
                    line: lineNum,
                    message: 'Nesting too deep (max 5 levels)',
                    code: 'SYNTAX_004'
                });
                result.valid = false;
                continue;
            }

            // SYNTAX_005: Check level skip
            if (level > prevLevel + 1 && prevLevel >= 0) {
                result.errors.push({
                    type: 'Syntax Error',
                    line: lineNum,
                    message: `Skipped nesting level (from ${prevLevel} to ${level})`,
                    code: 'SYNTAX_005'
                });
                result.valid = false;
                continue;
            }

            // SYNTAX_001: Check for colon separator
            if (!content.includes(':')) {
                result.errors.push({
                    type: 'Syntax Error',
                    line: lineNum,
                    message: 'Missing colon separator',
                    code: 'SYNTAX_001'
                });
                result.valid = false;
                continue;
            }

            // Parse the content
            const parts = content.split(':').map(s => s.trim());

            let base, type, value;
            if (level === 0) {
                // Root level: Base: Type: Value
                if (parts.length < 3) {
                    result.errors.push({
                        type: 'Syntax Error',
                        line: lineNum,
                        message: 'Root level requires Base: Type: Value format',
                        code: 'SYNTAX_002'
                    });
                    result.valid = false;
                    continue;
                }
                base = parts[0];
                type = parts[1];
                value = parts.slice(2).join(':').trim();

                // SYNTAX_002: Check empty parts
                if (!base || !type || value === '') {
                    result.errors.push({
                        type: 'Syntax Error',
                        line: lineNum,
                        message: 'Empty Base, Type or Value',
                        code: 'SYNTAX_002'
                    });
                    result.valid = false;
                    continue;
                }

                // Track context
                contextStack = [{
                    level: 0,
                    type: type,
                    base: base,
                    value: value,
                    isModel: type === 'Model',
                    isConcept: base === 'Concept' && type === 'Instance',
                    isVocabulary: base === 'Vocabulary',
                    isApplication: base === 'Application',
                    isIndividual: type === 'Individual'
                }];

                // Track defined concepts
                if (base === 'Concept' && type === 'Instance') {
                    definedConcepts.add(value);
                }

                // Track defined models
                if (type === 'Model') {
                    definedModels.add(value);
                }

                // SEMANTIC_006: Check concept exists (for Model declarations)
                if (type === 'Model' && base !== 'Concept') {
                    if (!existingConcepts.has(base) && !definedConcepts.has(base)) {
                        result.warnings.push({
                            type: 'Semantic Warning',
                            line: lineNum,
                            message: `Concept '${base}' not declared before model`,
                            code: 'SEMANTIC_006'
                        });
                    }
                }

                // SEMANTIC_007: Check model name format
                if (type === 'Model' && !value.startsWith('Model ') && !value.startsWith('Model_')) {
                    result.warnings.push({
                        type: 'Semantic Warning',
                        line: lineNum,
                        message: `Model name should start with 'Model ' (got '${value}')`,
                        code: 'SEMANTIC_007'
                    });
                }

            } else {
                // Nested level: : Type: Value
                type = parts[0];
                value = parts.slice(1).join(':').trim();

                // Update context stack
                while (contextStack.length > 0 && contextStack[contextStack.length - 1].level >= level) {
                    contextStack.pop();
                }

                const parentContext = contextStack.length > 0 ? contextStack[contextStack.length - 1] : null;

                contextStack.push({
                    level: level,
                    type: type,
                    value: value,
                    isAttribute: type === 'Attribute',
                    isRelation: type === 'Relation',
                    isRole: type === 'Role',
                    isRestriction: restrictionTypes.has(type),
                    parentContext: parentContext
                });

                // SEMANTIC_001: Attribute/Relation directly on concept
                if (propertyTypes.has(type) && parentContext) {
                    if (parentContext.isConcept) {
                        result.errors.push({
                            type: 'Semantic Error',
                            line: lineNum,
                            message: `${type} cannot be defined on concept directly (should be in model)`,
                            code: 'SEMANTIC_001'
                        });
                        result.valid = false;
                    }
                }

                // SEMANTIC_002: Attribute/Relation in vocabulary (as definition)
                if (propertyTypes.has(type) && parentContext && parentContext.isVocabulary) {
                    // Only warn if it looks like a definition (not a reference)
                    // In vocabulary, Attributes/Relations should be a property reference, not definition
                    if (type === 'Attribute' || type === 'Relation') {
                        result.warnings.push({
                            type: 'Semantic Warning',
                            line: lineNum,
                            message: `${type} in vocabulary should be a reference, not definition`,
                            code: 'SEMANTIC_002'
                        });
                    }
                }

                // SEMANTIC_004: Restriction on concept
                if (restrictionTypes.has(type) && parentContext && parentContext.isConcept) {
                    result.errors.push({
                        type: 'Semantic Error',
                        line: lineNum,
                        message: `Restriction '${type}' cannot be applied to concept`,
                        code: 'SEMANTIC_004'
                    });
                    result.valid = false;
                }

                // SEMANTIC_005: Restriction placement check
                // Restrictions should be on Attribute/Relation/Role in a Model
                if (restrictionTypes.has(type) && level > 1) {
                    const fieldContext = contextStack.find(c =>
                        c.isAttribute || c.isRelation || c.isRole
                    );
                    if (!fieldContext) {
                        result.warnings.push({
                            type: 'Semantic Warning',
                            line: lineNum,
                            message: `Restriction '${type}' should be applied to Attribute/Relation/Role`,
                            code: 'SEMANTIC_005'
                        });
                    }
                }

                // SEMANTIC_008: Role in non-Organization model
                if (type === 'Role' && parentContext && parentContext.isModel) {
                    if (parentContext.base !== 'Organization' && !parentContext.base.includes('Organization')) {
                        result.warnings.push({
                            type: 'Semantic Warning',
                            line: lineNum,
                            message: 'Role typically used only in Organization models',
                            code: 'SEMANTIC_008'
                        });
                    }
                }

                // TYPE_001: Unknown DataType
                if (type === 'DataType' && !validDataTypes.has(value)) {
                    result.warnings.push({
                        type: 'Type Warning',
                        line: lineNum,
                        message: `Unknown DataType '${value}'`,
                        code: 'TYPE_001'
                    });
                }

                // TYPE_003: Range for Attribute
                if (type === 'Range' && parentContext && parentContext.isAttribute) {
                    result.errors.push({
                        type: 'Type Error',
                        line: lineNum,
                        message: 'Range can only be applied to Relation, not Attribute',
                        code: 'TYPE_003'
                    });
                    result.valid = false;
                }

                // TYPE_004: SetRange for Attribute
                if (type === 'SetRange' && parentContext && parentContext.isAttribute) {
                    result.errors.push({
                        type: 'Type Error',
                        line: lineNum,
                        message: 'SetRange can only be applied to Relation, not Attribute',
                        code: 'TYPE_004'
                    });
                    result.valid = false;
                }
            }

            prevLevel = level;
        }

        // TYPE_002: Check EnumType without AttributeValue
        // This requires full context analysis
        // Simplified: check in parsed events

        return result;
    },

    /**
     * Format validation result for display
     */
    formatValidationResult(result) {
        if (result.valid && result.warnings.length === 0) {
            return { message: 'Validation passed', type: 'success' };
        }

        const parts = [];
        if (result.errors.length > 0) {
            parts.push(`${result.errors.length} error(s)`);
        }
        if (result.warnings.length > 0) {
            parts.push(`${result.warnings.length} warning(s)`);
        }

        const allIssues = [...result.errors, ...result.warnings];
        const details = allIssues.slice(0, 3).map(e =>
            `Line ${e.line}: ${e.message}`
        ).join('\n');

        return {
            message: parts.join(', ') + (allIssues.length > 3 ? ` (+${allIssues.length - 3} more)` : ''),
            details: details,
            type: result.valid ? 'warning' : 'error'
        };
    },

    /**
     * Set BSL status message
     */
    setBSLStatus(message, type) {
        const status = document.getElementById('bsl-status');
        if (status) {
            status.textContent = message;
            status.className = 'bsl-status ' + (type || '');
        }
    },

    /**
     * Download BSL content
     */
    downloadBSL() {
        const textarea = document.getElementById('bsl-editor-textarea');
        if (!textarea || !textarea.value.trim()) {
            this.setBSLStatus('Nothing to download', 'warning');
            return;
        }

        const blob = new Blob([textarea.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `models_${new Date().toISOString().slice(0, 10)}.bsl`;
        a.click();
        URL.revokeObjectURL(url);
        this.setBSLStatus('Downloaded', 'success');
    },

    /**
     * Upload BSL file
     */
    uploadBSL(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const textarea = document.getElementById('bsl-editor-textarea');
            if (textarea) {
                textarea.value = e.target.result;
                this.setBSLStatus(`Loaded: ${file.name}`, 'success');
            }
        };
        reader.onerror = () => {
            this.setBSLStatus('Failed to read file', 'error');
        };
        reader.readAsText(file);
    }
};

// Global helper functions
function addWidget(viewData) {
    return UIRenderer.addWidget(viewData);
}

function renderWidgets() {
    UIRenderer.render();
}

function registerStageView(modelName, stageName, viewConfig) {
    return UIRenderer.registerStageView(modelName, stageName, viewConfig);
}

function checkAndShowViews(individualId, modelName) {
    return UIRenderer.checkAndShowViews(individualId, modelName);
}

function showNextStage(individualId, modelName) {
    return UIRenderer.showNextStage(individualId, modelName);
}

function showApplications() {
    return UIRenderer.addWidget({
        type: 'applications',
        title: 'Applications'
    });
}

function launchApplication(appId) {
    return UIRenderer.launchApplication(appId);
}
