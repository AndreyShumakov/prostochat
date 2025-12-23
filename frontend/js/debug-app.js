/**
 * Debug script for Application → Model → Form flow
 * Run in browser console: paste this code or load as script
 */

function debugApplicationFlow() {
    console.log('========================================');
    console.log('APPLICATION FLOW DIAGNOSTIC');
    console.log('========================================\n');

    const events = Memory.getAllEvents();
    console.log(`Total events: ${events.length}`);

    // 1. Find Applications
    console.log('\n--- APPLICATIONS ---');
    const apps = events.filter(e => e.type === 'Individual' && e.base === 'Application');
    console.log(`Found ${apps.length} applications:`);
    apps.forEach(app => {
        console.log(`  - ${app.value} (id: ${app.id})`);

        // Get app state
        const appState = Memory.getIndividualState(app.value);
        console.log(`    Title: ${appState.Title || '(none)'}`);
        console.log(`    SetModel: ${appState.SetModel || '(none)'}`);

        // Find Models events for this app
        const modelEvents = events.filter(e =>
            e.base === app.value && e.type === 'Models'
        );
        console.log(`    Models events: ${modelEvents.length}`);
        modelEvents.forEach(m => console.log(`      - ${m.value}`));
    });

    // 2. Find Models
    console.log('\n--- MODELS ---');
    const models = events.filter(e => e.type === 'Model');
    console.log(`Found ${models.length} models:`);
    models.slice(0, 10).forEach(model => {
        console.log(`  - ${model.value} (id: ${model.id}, base: ${model.base})`);

        // Find attributes for this model
        const attrs = events.filter(e =>
            e.cause === model.id &&
            (e.type === 'Attribute' || e.type === 'Relation')
        );
        console.log(`    Attributes by cause: ${attrs.length}`);
        attrs.forEach(a => console.log(`      - ${a.type}: ${a.value}`));

        // Fallback - find by base
        if (attrs.length === 0) {
            const attrsByBase = events.filter(e =>
                e.base === model.base &&
                (e.type === 'Attribute' || e.type === 'Relation')
            );
            console.log(`    Attributes by base (fallback): ${attrsByBase.length}`);
        }
    });

    // 3. Test specific app
    console.log('\n--- TEST: task_app ---');
    const taskApp = apps.find(a => a.value === 'task_app');
    if (taskApp) {
        console.log('task_app found:', taskApp);
        const taskModels = events.filter(e =>
            e.base === 'task_app' && e.type === 'Models'
        );
        console.log('Models for task_app:', taskModels);

        if (taskModels.length > 0) {
            const modelName = taskModels[0].value;
            console.log(`\nLooking for model: ${modelName}`);
            const modelEvent = events.find(e =>
                e.type === 'Model' && e.value === modelName
            );
            if (modelEvent) {
                console.log('Model event found:', modelEvent);
                const fields = events.filter(e => e.cause === modelEvent.id);
                console.log(`Fields with cause=${modelEvent.id}:`, fields);
            } else {
                console.log('Model event NOT FOUND');
                console.log('Available Model values:',
                    models.map(m => m.value).slice(0, 20)
                );
            }
        }
    } else {
        console.log('task_app NOT FOUND');
    }

    // 4. Check sync status
    console.log('\n--- SYNC STATUS ---');
    const bootstrapEvents = events.filter(e =>
        e.id && (e.id.startsWith('bootstrap_') || e.id.startsWith('thesaurus_'))
    );
    console.log(`Bootstrap/Thesaurus events: ${bootstrapEvents.length}`);
    console.log(`Genesis events: ${events.filter(e => e.actor === 'System').length}`);
    console.log(`User events: ${events.filter(e => e.actor === 'user').length}`);

    console.log('\n========================================');
    console.log('END DIAGNOSTIC');
    console.log('========================================');
}

// Auto-run
debugApplicationFlow();
