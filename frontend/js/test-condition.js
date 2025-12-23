/**
 * Test Condition functionality
 * Run in browser console: testCondition()
 */

function testCondition() {
    console.log('=== Testing Condition System ===\n');

    // 1. Test Expression Evaluator
    console.log('1. Testing Expression Evaluator');

    // Create a test individual
    const testPerson = Memory.addEvent({
        base: 'Person',
        type: 'Individual',
        value: 'test_person_' + Date.now(),
        actor: 'test'
    });
    const personId = testPerson.value;

    Memory.addEvent({
        base: personId,
        type: 'SetModel',
        value: 'Model Person',
        actor: 'test'
    });

    Memory.addEvent({
        base: personId,
        type: 'age',
        value: 25,
        actor: 'test'
    });

    Memory.addEvent({
        base: personId,
        type: 'firstName',
        value: 'John',
        actor: 'test'
    });

    Memory.addEvent({
        base: personId,
        type: 'lastName',
        value: 'Doe',
        actor: 'test'
    });

    // Test expressions
    const tests = [
        { expr: '$.age >= 18', expected: true },
        { expr: '$.age < 18', expected: false },
        { expr: '$.firstName && $.lastName', expected: true },
        { expr: '$.age === 25', expected: true },
        { expr: '$.firstName === "John"', expected: true },
        { expr: '$.status === "active"', expected: false }, // undefined != "active"
    ];

    let passed = 0;
    tests.forEach(test => {
        const result = Memory.evaluateExpression(test.expr, personId);
        const success = Boolean(result) === test.expected;
        console.log(`  ${success ? '✓' : '✗'} ${test.expr} = ${result} (expected: ${test.expected})`);
        if (success) passed++;
    });
    console.log(`  Passed: ${passed}/${tests.length}\n`);

    // 2. Test Condition check
    console.log('2. Testing checkCondition()');
    const condition1 = Memory.checkCondition('$.age >= 18', personId);
    const condition2 = Memory.checkCondition('$.age >= 30', personId);
    console.log(`  ✓ $.age >= 18 = ${condition1} (expected: true)`);
    console.log(`  ✓ $.age >= 30 = ${condition2} (expected: false)\n`);

    // 3. Test Form with Conditions
    console.log('3. Testing Form Widget with Conditions');

    const testWidget = {
        id: 'test_widget_' + Date.now(),
        type: 'form',
        title: 'Test Person Form',
        mode: 'edit',
        target: personId,
        concept: 'Person',
        model: 'Model Person',
        fields: [
            { name: 'firstName', label: 'First Name', type: 'text' },
            { name: 'lastName', label: 'Last Name', type: 'text' },
            { name: 'age', label: 'Age', type: 'number' },
            { name: 'spouse', label: 'Spouse', type: 'text', condition: '$.age >= 18' },
            { name: 'pension', label: 'Pension', type: 'number', condition: '$.age >= 60' },
            { name: 'fullName', label: 'Full Name', type: 'text', condition: '$.firstName && $.lastName' }
        ]
    };

    // Add widget to UIRenderer
    UIRenderer.widgets.push(testWidget);

    // Get accessible fields
    const accessibleFields = UIRenderer.getAccessibleFormFields(testWidget);
    console.log(`  Total fields: ${testWidget.fields.length}`);
    console.log(`  Accessible fields: ${accessibleFields.length}`);
    accessibleFields.forEach(f => {
        console.log(`    ✓ ${f.name} (condition: ${f.condition || 'none'})`);
    });

    // Check which fields are hidden
    const hiddenFields = testWidget.fields.filter(f =>
        !accessibleFields.find(af => af.name === f.name)
    );
    hiddenFields.forEach(f => {
        console.log(`    ✗ ${f.name} - HIDDEN (condition: ${f.condition})`);
    });

    // Render the widget
    UIRenderer.render();
    console.log(`\n  Widget rendered. Check the Widgets panel.\n`);

    // 4. Test SetValue expression
    console.log('4. Testing SetValue expression');
    const fullNameExpr = '$.firstName + " " + $.lastName';
    const fullName = Memory.evaluateExpression(fullNameExpr, personId);
    console.log(`  $.firstName + " " + $.lastName = "${fullName}"`);
    console.log(`  Expected: "John Doe"\n`);

    // 5. Summary
    console.log('=== Test Complete ===');
    console.log(`Person ID: ${personId}`);
    console.log(`Age: 25 (adult, so spouse field visible, pension hidden)`);
    console.log('\nTo test interactively:');
    console.log('1. Look at the Widgets panel - form should show');
    console.log('2. spouse field should be visible (age >= 18)');
    console.log('3. pension field should be hidden (age < 60)');
    console.log('4. fullName field should be visible (firstName && lastName exist)');

    return { personId, widget: testWidget };
}

// Test young person (under 18)
function testConditionYoung() {
    console.log('=== Testing Young Person (age < 18) ===\n');

    const personId = 'young_person_' + Date.now();

    Memory.addEvent({ base: 'Person', type: 'Individual', value: personId, actor: 'test' });
    Memory.addEvent({ base: personId, type: 'SetModel', value: 'Model Person', actor: 'test' });
    Memory.addEvent({ base: personId, type: 'age', value: 16, actor: 'test' });
    Memory.addEvent({ base: personId, type: 'firstName', value: 'Young', actor: 'test' });

    const testWidget = {
        id: 'young_widget_' + Date.now(),
        type: 'form',
        title: 'Young Person Form',
        mode: 'edit',
        target: personId,
        concept: 'Person',
        model: 'Model Person',
        fields: [
            { name: 'firstName', label: 'First Name', type: 'text' },
            { name: 'age', label: 'Age', type: 'number' },
            { name: 'spouse', label: 'Spouse', type: 'text', condition: '$.age >= 18' },
            { name: 'drivingLicense', label: 'Driving License', type: 'text', condition: '$.age >= 16' }
        ]
    };

    UIRenderer.widgets.unshift(testWidget);
    const accessibleFields = UIRenderer.getAccessibleFormFields(testWidget);

    console.log('Fields for person age 16:');
    accessibleFields.forEach(f => console.log(`  ✓ ${f.name}`));

    const hiddenFields = testWidget.fields.filter(f =>
        !accessibleFields.find(af => af.name === f.name)
    );
    hiddenFields.forEach(f => console.log(`  ✗ ${f.name} - HIDDEN`));

    UIRenderer.render();

    console.log('\nExpected: spouse HIDDEN (age < 18), drivingLicense VISIBLE (age >= 16)');
    return personId;
}

// Add to global for console access
window.testCondition = testCondition;
window.testConditionYoung = testConditionYoung;

/**
 * Test Rebuild World functionality
 */
function testRebuildWorld() {
    console.log('=== Testing Rebuild World ===\n');

    // 1. First, check current state
    console.log('1. Current state before rebuild:');
    const beforeStats = analyzeEvents();
    console.log(`   Events without cause: ${beforeStats.noCause}`);
    console.log(`   Events without model (that should have): ${beforeStats.noModel}`);

    // 2. Create test events with missing model/cause
    console.log('\n2. Creating test events with missing model/cause...');

    const testId = Date.now().toString(36);

    // Create individual without proper cause
    const ind1 = {
        id: `test_ind_${testId}`,
        base: 'Person',
        type: 'Individual',
        value: `test_person_${testId}`,
        actor: 'test',
        model: 'WRONG_MODEL', // Wrong model
        date: new Date().toISOString(),
        cause: 'nonexistent_cause' // Wrong cause (single value)
    };
    Memory.events.push(ind1);

    // Create SetModel without cause
    const sm1 = {
        id: `test_sm_${testId}`,
        base: `test_person_${testId}`,
        type: 'SetModel',
        value: 'Model Person',
        actor: 'test',
        model: null, // Missing model
        date: new Date().toISOString(),
        cause: null // Missing cause (single value)
    };
    Memory.events.push(sm1);

    // Create property without model/cause
    const prop1 = {
        id: `test_prop_${testId}`,
        base: `test_person_${testId}`,
        type: 'name',
        value: 'Test Person Name',
        actor: 'test',
        model: null, // Missing model
        date: new Date().toISOString(),
        cause: null // Missing cause (single value)
    };
    Memory.events.push(prop1);

    console.log('   Created 3 test events with wrong/missing model and cause');

    // 3. Verify events are broken
    console.log('\n3. Verifying test events are broken:');
    const testInd = Memory.events.find(e => e.id === `test_ind_${testId}`);
    const testSm = Memory.events.find(e => e.id === `test_sm_${testId}`);
    const testProp = Memory.events.find(e => e.id === `test_prop_${testId}`);

    console.log(`   Individual model: "${testInd.model}" (should be null)`);
    console.log(`   Individual cause: ${testInd.cause} (should link to genesis)`);
    console.log(`   SetModel model: "${testSm.model}" (should be "Model Person")`);
    console.log(`   SetModel cause: ${testSm.cause} (should link to Individual)`);
    console.log(`   Property model: "${testProp.model}" (should be "Model Person")`);
    console.log(`   Property cause: ${testProp.cause} (should link to SetModel)`);

    // 4. Run rebuild
    console.log('\n4. Running rebuildWorld()...');
    const report = Memory.rebuildWorld();

    // 5. Verify events are fixed
    console.log('\n5. Verifying test events are fixed:');
    const fixedInd = Memory.events.find(e => e.id === `test_ind_${testId}`);
    const fixedSm = Memory.events.find(e => e.id === `test_sm_${testId}`);
    const fixedProp = Memory.events.find(e => e.id === `test_prop_${testId}`);

    const checks = [];

    // Check Individual (cause is single value, not array)
    const indModelOk = fixedInd.model === null;
    const indCauseOk = typeof fixedInd.cause === 'string' && fixedInd.cause.startsWith('genesis_');
    checks.push({ name: 'Individual model = null', ok: indModelOk, actual: fixedInd.model });
    checks.push({ name: 'Individual cause → genesis', ok: indCauseOk, actual: fixedInd.cause });

    // Check SetModel (cause is single value, not array)
    const smModelOk = fixedSm.model === 'Model Person';
    const smCauseOk = fixedSm.cause === `test_ind_${testId}`;
    checks.push({ name: 'SetModel model = "Model Person"', ok: smModelOk, actual: fixedSm.model });
    checks.push({ name: 'SetModel cause → Individual', ok: smCauseOk, actual: fixedSm.cause });

    // Check Property (cause is single value, not array)
    const propModelOk = fixedProp.model === 'Model Person';
    const propCauseOk = fixedProp.cause === `test_sm_${testId}`;
    checks.push({ name: 'Property model = "Model Person"', ok: propModelOk, actual: fixedProp.model });
    checks.push({ name: 'Property cause → SetModel', ok: propCauseOk, actual: fixedProp.cause });

    // Print results
    let passed = 0;
    checks.forEach(check => {
        const icon = check.ok ? '✓' : '✗';
        console.log(`   ${icon} ${check.name}`);
        if (!check.ok) {
            console.log(`     Actual: ${JSON.stringify(check.actual)}`);
        }
        if (check.ok) passed++;
    });

    // 6. Summary
    console.log('\n=== Test Summary ===');
    console.log(`Rebuild report: ${report.modelsFixed} models, ${report.causesFixed} causes fixed in ${report.duration}`);
    console.log(`Checks passed: ${passed}/${checks.length}`);

    if (passed === checks.length) {
        console.log('\n✅ All tests PASSED!');
    } else {
        console.log('\n❌ Some tests FAILED!');
    }

    // 7. Cleanup - remove test events
    console.log('\n7. Cleaning up test events...');
    Memory.events = Memory.events.filter(e => !e.id.includes(`_${testId}`));
    Memory.saveToStorage(CONFIG.storage.events, Memory.getLocalEvents());
    console.log('   Test events removed.');

    return { passed, total: checks.length, report };
}

/**
 * Analyze events for missing model/cause
 * ALL events must have model and cause filled - no exceptions
 */
function analyzeEvents() {
    let noCause = 0;
    let noModel = 0;
    const badEvents = [];

    Memory.events.forEach(e => {
        let hasProblem = false;

        // Check cause - EVERY event must have a cause (single value, not array)
        if (!e.cause) {
            noCause++;
            hasProblem = true;
        }

        // Check model - EVERY event must have a model
        if (!e.model) {
            noModel++;
            hasProblem = true;
        }

        if (hasProblem) {
            badEvents.push({
                id: e.id,
                base: e.base,
                type: e.type,
                value: e.value,
                model: e.model,
                cause: e.cause,
                actor: e.actor
            });
        }
    });

    if (badEvents.length > 0) {
        console.log('Events with missing model/cause:');
        badEvents.forEach(e => {
            console.log(`  ${e.id}: ${e.base}: ${e.type}: ${e.value}`);
            console.log(`    model: ${e.model || 'NULL'}, cause: ${JSON.stringify(e.cause) || 'EMPTY'}`);
        });
    }

    return { noCause, noModel, badEvents, total: Memory.events.length };
}

/**
 * Show detailed cause chain for an event
 */
function traceCause(eventId, depth = 0) {
    if (depth > 10) {
        console.log('  '.repeat(depth) + '... (max depth)');
        return;
    }

    const event = Memory.events.find(e => e.id === eventId);
    if (!event) {
        console.log('  '.repeat(depth) + `❌ Event not found: ${eventId}`);
        return;
    }

    const shortId = eventId.length > 20 ? eventId.substring(0, 17) + '...' : eventId;
    console.log('  '.repeat(depth) + `${shortId} | ${event.base}: ${event.type}: ${event.value}`);

    // cause is now a single value, not an array
    if (event.cause && event.cause !== event.id) {
        traceCause(event.cause, depth + 1);
    }
}

/**
 * Validate that ALL events have model and cause filled
 * This is a comprehensive check that should pass after rebuildWorld()
 */
function validateAllEvents() {
    console.log('=== Validating ALL Events Have Model and Cause ===\n');

    const analysis = analyzeEvents();

    console.log(`Total events: ${analysis.total}`);
    console.log(`Events without model: ${analysis.noModel}`);
    console.log(`Events without cause: ${analysis.noCause}`);

    if (analysis.noModel === 0 && analysis.noCause === 0) {
        console.log('\n ALL EVENTS VALID - every event has model and cause filled');
        return true;
    } else {
        console.log('\n VALIDATION FAILED');
        console.log('Run rebuildWorld() to fix missing model/cause');
        return false;
    }
}

/**
 * Full test: validate, rebuild, and validate again
 */
function testFullValidation() {
    console.log('=== Full Validation Test ===\n');

    // 1. Check initial state
    console.log('1. Initial state:');
    const beforeAnalysis = analyzeEvents();
    console.log(`   Events without model: ${beforeAnalysis.noModel}`);
    console.log(`   Events without cause: ${beforeAnalysis.noCause}`);

    // 2. Run rebuild
    console.log('\n2. Running rebuildWorld()...');
    const report = Memory.rebuildWorld();
    console.log(`   Models fixed: ${report.modelsFixed}`);
    console.log(`   Causes fixed: ${report.causesFixed}`);
    console.log(`   Duration: ${report.duration}`);

    // 3. Validate after rebuild
    console.log('\n3. After rebuild:');
    const afterAnalysis = analyzeEvents();
    console.log(`   Events without model: ${afterAnalysis.noModel}`);
    console.log(`   Events without cause: ${afterAnalysis.noCause}`);

    // 4. Result
    const success = afterAnalysis.noModel === 0 && afterAnalysis.noCause === 0;

    console.log('\n=== Result ===');
    if (success) {
        console.log(' TEST PASSED - all events have model and cause');
    } else {
        console.log(' TEST FAILED - some events still missing model/cause');
        console.log('Bad events:', afterAnalysis.badEvents);
    }

    return {
        success,
        before: beforeAnalysis,
        after: afterAnalysis,
        report
    };
}

/**
 * Verify genesis structure matches BSL/kg documentation
 */
function verifyGenesis() {
    console.log('=== Verifying Genesis Structure ===\n');

    const genesis = getGenesisEvents();
    const checks = [];

    // 1. Check root event
    const root = genesis.find(e =>
        e.base === 'Concept' && e.type === 'Instance' && e.value === 'Concept'
    );
    checks.push({
        name: 'Root event (Concept: Instance: Concept)',
        ok: !!root,
        details: root ? `id=${root.id}, model=${root.model}, cause=${JSON.stringify(root.cause)}` : 'NOT FOUND'
    });

    // 2. Check meta types exist (cause is single value now)
    const metaTypes = ['Model', 'Attribute', 'Relation', 'Individual', 'Role', 'Actor', 'DataType', 'Restriction'];
    metaTypes.forEach(mt => {
        const evt = genesis.find(e =>
            e.base === 'Concept' && e.type === 'Instance' && e.value === mt
        );
        checks.push({
            name: `Meta type: Concept: Instance: ${mt}`,
            ok: !!evt && evt.model === 'Meta' && !!evt.cause,
            details: evt ? `model=${evt.model}, cause=${evt.cause}` : 'NOT FOUND'
        });
    });

    // 3. Check DataTypes
    const dataTypes = ['BasicType', 'Text', 'Numeric', 'Boolean', 'EnumType', 'String'];
    dataTypes.forEach(dt => {
        const evt = genesis.find(e =>
            e.base === 'DataType' && e.type === 'Instance' && e.value === dt
        );
        checks.push({
            name: `DataType: ${dt}`,
            ok: !!evt && evt.model === 'Meta',
            details: evt ? `model=${evt.model}` : 'NOT FOUND'
        });
    });

    // 4. Check Restrictions
    const restrictions = ['Required', 'Multiple', 'Condition', 'SetValue', 'Range', 'Permission'];
    restrictions.forEach(r => {
        const evt = genesis.find(e =>
            e.base === 'Restriction' && e.type === 'Instance' && e.value === r
        );
        checks.push({
            name: `Restriction: ${r}`,
            ok: !!evt && evt.model === 'Meta',
            details: evt ? `model=${evt.model}` : 'NOT FOUND'
        });
    });

    // 5. Check KG concepts from documentation
    const kgConcepts = ['Fragment', 'Schema', 'Term', 'Document', 'Author', 'Classifier', 'Category'];
    kgConcepts.forEach(c => {
        const evt = genesis.find(e =>
            e.base === 'Concept' && e.type === 'Instance' && e.value === c
        );
        checks.push({
            name: `KG Concept: ${c}`,
            ok: !!evt,
            details: evt ? 'OK' : 'NOT FOUND'
        });
    });

    // 6. Check Models from kg documentation
    const kgModels = ['Model Fragment', 'Model Term', 'Model Document', 'Model Author', 'Definition', 'Comparison'];
    kgModels.forEach(m => {
        const evt = genesis.find(e => e.type === 'Model' && e.value === m);
        checks.push({
            name: `Model: ${m}`,
            ok: !!evt && evt.model === 'Meta',
            details: evt ? `base=${evt.base}, model=${evt.model}` : 'NOT FOUND'
        });
    });

    // 7. Check all genesis events have model and cause (cause is single value now)
    let allHaveModelCause = true;
    genesis.forEach(e => {
        if (!e.model || !e.cause) {
            allHaveModelCause = false;
            console.log(`  BAD: ${e.id} - model=${e.model}, cause=${e.cause}`);
        }
    });
    checks.push({
        name: 'All genesis events have model and cause',
        ok: allHaveModelCause,
        details: allHaveModelCause ? `${genesis.length} events OK` : 'Some events missing model/cause'
    });

    // Print results
    let passed = 0;
    checks.forEach(check => {
        const icon = check.ok ? '✓' : '✗';
        console.log(`${icon} ${check.name}`);
        if (!check.ok) {
            console.log(`  → ${check.details}`);
        }
        if (check.ok) passed++;
    });

    console.log(`\n=== Result: ${passed}/${checks.length} checks passed ===`);

    return {
        passed,
        total: checks.length,
        genesisCount: genesis.length,
        allValid: passed === checks.length
    };
}

window.testRebuildWorld = testRebuildWorld;
window.analyzeEvents = analyzeEvents;
window.traceCause = traceCause;
window.validateAllEvents = validateAllEvents;
window.testFullValidation = testFullValidation;
window.verifyGenesis = verifyGenesis;

console.log('Tests loaded. Available commands:');
console.log('  testCondition()       - Test Condition evaluation');
console.log('  testConditionYoung()  - Test with age < 18');
console.log('  testRebuildWorld()    - Test Rebuild World');
console.log('  analyzeEvents()       - Analyze missing model/cause');
console.log('  traceCause(eventId)   - Trace cause chain for event');
console.log('  validateAllEvents()   - Check all events have model+cause');
console.log('  testFullValidation()  - Full test: validate, rebuild, validate');
console.log('  verifyGenesis()       - Verify genesis matches BSL/kg docs');
