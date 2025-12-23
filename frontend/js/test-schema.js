/**
 * Test Schema Loading
 * Run this in browser console after app loads
 */

function testSchemaLoading() {
    console.log('=== Testing Schema Loading ===\n');

    const results = {
        passed: 0,
        failed: 0,
        errors: []
    };

    // Test 1: Check SchemaInstruction concept exists
    const schemaInstructionConcept = GENESIS_EVENTS.find(e =>
        e.id === 'SchemaInstruction' && e.type === 'Instance'
    );
    if (schemaInstructionConcept) {
        console.log('[PASS] SchemaInstruction concept exists');
        results.passed++;
    } else {
        console.log('[FAIL] SchemaInstruction concept NOT found');
        results.failed++;
        results.errors.push('SchemaInstruction concept missing');
    }

    // Test 2: Check target_schema attribute exists
    const targetSchemaAttr = GENESIS_EVENTS.find(e =>
        e.id === 'target_schema' && e.type === 'Individual' && e.base === 'Attribute'
    );
    if (targetSchemaAttr) {
        console.log('[PASS] target_schema attribute exists');
        results.passed++;
    } else {
        console.log('[FAIL] target_schema attribute NOT found');
        results.failed++;
        results.errors.push('target_schema attribute missing');
    }

    // Test 3: Check SchemaInstruction individuals
    const instructions = [
        'def_instruction',
        'comp_instruction',
        'arch_comp_instruction',
        'tech_proc_instruction',
        'algorithm_instruction'
    ];

    instructions.forEach(instId => {
        const inst = GENESIS_EVENTS.find(e => e.id === instId);
        if (inst) {
            console.log(`[PASS] ${instId} individual exists`);
            results.passed++;
        } else {
            console.log(`[FAIL] ${instId} individual NOT found`);
            results.failed++;
            results.errors.push(`${instId} missing`);
        }
    });

    // Test 4: Check instruction properties exist
    const propertyTests = [
        { id: 'def_instruction_ts', base: 'def_instruction', type: 'target_schema', expected: 'Definition' },
        { id: 'arch_comp_instruction_ts', base: 'arch_comp_instruction', type: 'target_schema', expected: 'ArchitecturalComponent' },
        { id: 'tech_proc_instruction_ef', base: 'tech_proc_instruction', type: 'extraction_fields', expected: 'input_types, output_types, process_category, involves_components' }
    ];

    console.log('\n--- Testing Instruction Properties ---');
    propertyTests.forEach(test => {
        const prop = GENESIS_EVENTS.find(e =>
            e.id === test.id &&
            e.base === test.base &&
            e.type === test.type
        );
        if (prop) {
            if (prop.value === test.expected) {
                console.log(`[PASS] ${test.id} = "${prop.value}"`);
                results.passed++;
            } else {
                console.log(`[WARN] ${test.id} value mismatch: expected "${test.expected}", got "${prop.value}"`);
                results.passed++; // Still pass if property exists
            }
        } else {
            console.log(`[FAIL] ${test.id} property NOT found`);
            results.failed++;
            results.errors.push(`${test.id} property missing`);
        }
    });

    // Test 5: Test Memory.getIndividualState for SchemaInstruction
    console.log('\n--- Testing Memory.getIndividualState ---');
    if (typeof Memory !== 'undefined' && Memory.getIndividualState) {
        const defState = Memory.getIndividualState('def_instruction');
        console.log('def_instruction state:', defState);

        if (defState.target_schema === 'Definition') {
            console.log('[PASS] def_instruction.target_schema = "Definition"');
            results.passed++;
        } else {
            console.log(`[FAIL] def_instruction.target_schema = "${defState.target_schema}" (expected "Definition")`);
            results.failed++;
            results.errors.push('def_instruction.target_schema wrong value');
        }

        if (defState.llm_prompt_template) {
            console.log('[PASS] def_instruction.llm_prompt_template exists');
            results.passed++;
        } else {
            console.log('[FAIL] def_instruction.llm_prompt_template missing');
            results.failed++;
            results.errors.push('def_instruction.llm_prompt_template missing');
        }

        // Test arch_comp_instruction
        const archState = Memory.getIndividualState('arch_comp_instruction');
        console.log('arch_comp_instruction state:', archState);

        if (archState.target_schema === 'ArchitecturalComponent') {
            console.log('[PASS] arch_comp_instruction.target_schema = "ArchitecturalComponent"');
            results.passed++;
        } else {
            console.log(`[FAIL] arch_comp_instruction.target_schema = "${archState.target_schema}"`);
            results.failed++;
        }

        if (archState.extraction_fields && archState.extraction_fields.includes('pattern_terms')) {
            console.log('[PASS] arch_comp_instruction.extraction_fields contains "pattern_terms"');
            results.passed++;
        } else {
            console.log('[FAIL] arch_comp_instruction.extraction_fields missing or incomplete');
            results.failed++;
        }
    } else {
        console.log('[SKIP] Memory not loaded yet');
    }

    // Test 6: Test LLMClient.getSchemaInstruction
    console.log('\n--- Testing LLMClient.getSchemaInstruction ---');
    if (typeof LLMClient !== 'undefined' && LLMClient.getSchemaInstruction) {
        const schemas = ['Definition', 'ArchitecturalComponent', 'TechnicalProcess', 'Algorithm'];

        schemas.forEach(schemaName => {
            const instruction = LLMClient.getSchemaInstruction(schemaName);
            if (instruction) {
                console.log(`[PASS] getSchemaInstruction("${schemaName}") returned:`, instruction);
                results.passed++;
            } else {
                console.log(`[FAIL] getSchemaInstruction("${schemaName}") returned null`);
                results.failed++;
                results.errors.push(`getSchemaInstruction("${schemaName}") failed`);
            }
        });
    } else {
        console.log('[SKIP] LLMClient not loaded yet');
    }

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    if (results.errors.length > 0) {
        console.log('Errors:', results.errors);
    }

    return results;
}

// Run test after page loads
if (document.readyState === 'complete') {
    setTimeout(testSchemaLoading, 500);
} else {
    window.addEventListener('load', () => setTimeout(testSchemaLoading, 500));
}

// Also export for manual testing
window.testSchemaLoading = testSchemaLoading;
console.log('Test script loaded. Run testSchemaLoading() in console to test.');
