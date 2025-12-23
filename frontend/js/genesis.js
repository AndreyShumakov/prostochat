/**
 * Prostochat Genesis Events
 * Unified genesis for frontend and backend
 *
 * Event format: {id, base, type, value, model, cause, actor}
 * - id: unique identifier
 * - base: base event (subject)
 * - type: value type (Instance, Individual, Model, etc.)
 * - value: the actual value
 * - model: reference to model event ID
 * - cause: ARRAY of cause event IDs (BSL spec A2, A3 - chain to genesis)
 * - actor: who created (System or system)
 */

const GENESIS_EVENTS = [
    // === ROOT BOOTSTRAP ===
    { id: 'Event', base: 'Event', type: 'Event', value: 'Event', model: 'Event', cause: [], actor: 'System' },
    { id: 'Delete', base: 'Event', type: 'Instance', value: 'Delete', model: 'Event', cause: ['Event'], actor: 'System' },
    { id: 'Instance', base: 'Event', type: 'Instance', value: 'Instance', model: 'Event', cause: ['Delete'], actor: 'System' },
    { id: 'Actor', base: 'Event', type: 'Instance', value: 'Actor', model: 'Event', cause: ['Event'], actor: 'System' },
    { id: 'Concept', base: 'Event', type: 'Instance', value: 'Concept', model: 'Event', cause: ['Actor'], actor: 'System' },
    { id: 'Model', base: 'Event', type: 'Instance', value: 'Model', model: 'Event', cause: ['Concept'], actor: 'System' },
    { id: 'Individual', base: 'Event', type: 'Instance', value: 'Individual', model: 'Event', cause: ['Model'], actor: 'System' },
    { id: 'Attribute', base: 'Event', type: 'Instance', value: 'Attribute', model: 'Event', cause: ['Individual'], actor: 'System' },
    { id: 'Relation', base: 'Event', type: 'Instance', value: 'Relation', model: 'Event', cause: ['Attribute'], actor: 'System' },
    { id: 'Role', base: 'Event', type: 'Instance', value: 'Role', model: 'Event', cause: ['Relation'], actor: 'System' },
    { id: 'Restriction', base: 'Event', type: 'Instance', value: 'Restriction', model: 'Event', cause: ['Role'], actor: 'System' },
    { id: 'Entity', base: 'Event', type: 'Instance', value: 'Entity', model: 'Event', cause: ['Restriction'], actor: 'System' },

    // === RESTRICTIONS ===
    { id: 'Domain', base: 'Restriction', type: 'Individual', value: 'Domain', model: 'Event', cause: ['Restriction'], actor: 'System' },
    { id: 'DataType', base: 'Restriction', type: 'Individual', value: 'DataType', model: 'Event', cause: ['Domain'], actor: 'System' },
    { id: 'Range', base: 'Restriction', type: 'Individual', value: 'Range', model: 'Event', cause: ['DataType'], actor: 'System' },
    { id: 'Required', base: 'Restriction', type: 'Individual', value: 'Required', model: 'Event', cause: ['Range'], actor: 'System' },
    { id: 'Multiple', base: 'Restriction', type: 'Individual', value: 'Multiple', model: 'Event', cause: ['Required'], actor: 'System' },
    { id: 'Immutable', base: 'Restriction', type: 'Individual', value: 'Immutable', model: 'Event', cause: ['Multiple'], actor: 'System' },

    // === DATA TYPES ===
    { id: 'BasicType', base: 'DataType', type: 'Individual', value: 'BasicType', model: 'Event', cause: ['DataType'], actor: 'System' },
    { id: 'TextType', base: 'DataType', type: 'Individual', value: 'TextType', model: 'Event', cause: ['BasicType'], actor: 'System' },
    { id: 'Numeric', base: 'DataType', type: 'Individual', value: 'Numeric', model: 'Event', cause: ['TextType'], actor: 'System' },
    { id: 'EnumType', base: 'DataType', type: 'Individual', value: 'EnumType', model: 'Event', cause: ['Numeric'], actor: 'System' },
    { id: 'Boolean', base: 'DataType', type: 'Individual', value: 'Boolean', model: 'Event', cause: ['EnumType'], actor: 'System' },
    { id: 'Expression', base: 'DataType', type: 'Individual', value: 'Expression', model: 'Event', cause: ['Boolean'], actor: 'System' },
    { id: 'DateTime', base: 'DataType', type: 'Individual', value: 'DateTime', model: 'Event', cause: ['Expression'], actor: 'System' },
    { id: 'Duration', base: 'DataType', type: 'Individual', value: 'Duration', model: 'Event', cause: ['DateTime'], actor: 'System' },
    { id: 'PDFType', base: 'DataType', type: 'Individual', value: 'PDFType', model: 'Event', cause: ['Duration'], actor: 'System' },

    // === MORE RESTRICTIONS ===
    { id: 'AttributeValue', base: 'Restriction', type: 'Individual', value: 'AttributeValue', model: 'Event', cause: ['Immutable'], actor: 'System' },
    { id: 'Condition', base: 'Restriction', type: 'Individual', value: 'Condition', model: 'Event', cause: ['AttributeValue'], actor: 'System' },
    { id: 'ValueCondition', base: 'Restriction', type: 'Individual', value: 'ValueCondition', model: 'Event', cause: ['Condition'], actor: 'System' },
    { id: 'Permission', base: 'Restriction', type: 'Individual', value: 'Permission', model: 'Event', cause: ['ValueCondition'], actor: 'System' },
    { id: 'SetValue', base: 'Restriction', type: 'Individual', value: 'SetValue', model: 'Event', cause: ['Permission'], actor: 'System' },
    { id: 'Unique', base: 'Restriction', type: 'Individual', value: 'Unique', model: 'Event', cause: ['SetValue'], actor: 'System' },
    { id: 'UniqueIdentifier', base: 'Restriction', type: 'Individual', value: 'UniqueIdentifier', model: 'Event', cause: ['Unique'], actor: 'System' },
    { id: 'SetRange', base: 'Restriction', type: 'Individual', value: 'SetRange', model: 'Event', cause: ['UniqueIdentifier'], actor: 'System' },
    { id: 'Default', base: 'Restriction', type: 'Individual', value: 'Default', model: 'Event', cause: ['SetRange'], actor: 'System' },
    { id: 'Cardinality', base: 'Restriction', type: 'Individual', value: 'Cardinality', model: 'Event', cause: ['Default'], actor: 'System' },
    { id: 'Mutable', base: 'Restriction', type: 'Individual', value: 'Mutable', model: 'Event', cause: ['Cardinality'], actor: 'System' },

    // === META MODELS ===
    { id: 'Model_Event', base: 'Event', type: 'Model', value: 'Model_Event', model: 'Event', cause: ['Event'], actor: 'System' },
    { id: 'Model_Entity', base: 'Entity', type: 'Model', value: 'Model_Entity', model: 'Event', cause: ['Entity'], actor: 'System' },
    { id: 'Model_Actor', base: 'Actor', type: 'Model', value: 'Model_Actor', model: 'Event', cause: ['Actor'], actor: 'System' },
    { id: 'Model_Relation', base: 'Relation', type: 'Model', value: 'Model_Relation', model: 'Event', cause: ['Relation'], actor: 'System' },
    { id: 'Model_Datatype', base: 'DataType', type: 'Model', value: 'Model_Datatype', model: 'Event', cause: ['DataType'], actor: 'System' },
    { id: 'Model_Attribute', base: 'Attribute', type: 'Model', value: 'Model_Attribute', model: 'Event', cause: ['Attribute'], actor: 'System' },
    { id: 'Model_Role', base: 'Role', type: 'Model', value: 'Model_Role', model: 'Event', cause: ['Role'], actor: 'System' },

    // === SYSTEM ACTORS ===
    { id: 'system', base: 'Actor', type: 'Individual', value: 'system', model: 'Event', cause: ['Actor'], actor: 'System' },
    { id: 'engine', base: 'Actor', type: 'Individual', value: 'engine', model: 'Event', cause: ['system'], actor: 'System' },
    { id: 'guest', base: 'Actor', type: 'Individual', value: 'guest', model: 'Event', cause: ['engine'], actor: 'System' },

    // === SYSTEM ATTRIBUTES ===
    { id: 'CreateIndividual', base: 'Attribute', type: 'Individual', value: 'CreateIndividual', model: 'Event', cause: ['Attribute'], actor: 'System' },
    { id: 'SetEntity', base: 'Attribute', type: 'Individual', value: 'SetEntity', model: 'Event', cause: ['CreateIndividual'], actor: 'System' },
    { id: 'SetModel', base: 'Attribute', type: 'Individual', value: 'SetModel', model: 'Event', cause: ['SetEntity'], actor: 'System' },
    { id: 'SetLabel', base: 'Attribute', type: 'Individual', value: 'SetLabel', model: 'Event', cause: ['SetModel'], actor: 'System' },
    { id: 'Apply', base: 'Attribute', type: 'Individual', value: 'Apply', model: 'Event', cause: ['SetLabel'], actor: 'System' },
    { id: 'delete', base: 'Attribute', type: 'Individual', value: 'deleted', model: 'Event', cause: ['Apply'], actor: 'System' },

    // === DELETED DATATYPE ===
    { id: 'deleted', base: 'DataType', type: 'Numeric', value: 'deleted', model: 'Event', cause: ['delete'], actor: 'System' },

    // === SYSTEM RELATIONS ===
    { id: 'NewIndividual', base: 'Relation', type: 'Individual', value: 'NewIndividual', model: 'Event', cause: ['Relation'], actor: 'System' },
    { id: 'EditIndividual', base: 'Relation', type: 'Individual', value: 'EditIndividual', model: 'Event', cause: ['NewIndividual'], actor: 'System' },

    // === SYSTEM ROLES ===
    { id: 'Admin', base: 'Role', type: 'Individual', value: 'Admin', model: 'Event', cause: ['Role'], actor: 'System' },
    { id: 'Owner', base: 'Role', type: 'Individual', value: 'Owner', model: 'Event', cause: ['Admin'], actor: 'System' },

    // === ENTITY: VOCABULARY ===
    { id: 'Vocabulary', base: 'Entity', type: 'Instance', value: 'Vocabulary', model: 'Event', cause: ['Entity'], actor: 'System' },
    { id: 'Model_Vocabulary', base: 'Vocabulary', type: 'Model', value: 'Model_Vocabulary', model: 'Event', cause: ['Vocabulary'], actor: 'System' },

    // === MORE RELATIONS ===
    { id: 'Attributes', base: 'Relation', type: 'Individual', value: 'Attributes', model: 'Event', cause: ['EditIndividual'], actor: 'System' },
    { id: 'Relations', base: 'Relation', type: 'Individual', value: 'Relations', model: 'Event', cause: ['Attributes'], actor: 'System' },

    // === DESCRIPTION ATTRIBUTE ===
    { id: 'Description', base: 'Attribute', type: 'Individual', value: 'Description', model: 'Event', cause: ['delete'], actor: 'System' },

    // === MORE RELATIONS ===
    { id: 'Roles', base: 'Relation', type: 'Individual', value: 'Roles', model: 'Event', cause: ['Relations'], actor: 'System' },

    // === ENTITY: APPLICATION ===
    { id: 'Application', base: 'Entity', type: 'Instance', value: 'Application', model: 'Event', cause: ['Vocabulary'], actor: 'System' },
    { id: 'Model_Application', base: 'Application', type: 'Model', value: 'Model_Application', model: 'Event', cause: ['Application'], actor: 'System' },

    // === MODEL_APPLICATION ATTRIBUTES ===
    { id: 'App_Title', base: 'Model_Application', type: 'Attribute', value: 'Title', model: 'Event', cause: ['Model_Application'], actor: 'System' },
    { id: 'App_Title_Required', base: 'App_Title', type: 'Required', value: '1', model: 'Event', cause: ['App_Title'], actor: 'System' },
    { id: 'App_Icon', base: 'Model_Application', type: 'Attribute', value: 'Icon', model: 'Event', cause: ['App_Title'], actor: 'System' },
    { id: 'App_Icon_Default', base: 'App_Icon', type: 'Default', value: '📱', model: 'Event', cause: ['App_Icon'], actor: 'System' },
    { id: 'App_Description', base: 'Model_Application', type: 'Attribute', value: 'Description', model: 'Event', cause: ['App_Icon'], actor: 'System' },

    // === MODEL_APPLICATION RELATIONS ===
    { id: 'App_Models', base: 'Model_Application', type: 'Relation', value: 'Models', model: 'Event', cause: ['App_Description'], actor: 'System' },
    { id: 'App_Models_Multiple', base: 'App_Models', type: 'Multiple', value: '1', model: 'Event', cause: ['App_Models'], actor: 'System' },
    { id: 'App_Models_Range', base: 'App_Models', type: 'Range', value: 'Model', model: 'Event', cause: ['App_Models_Multiple'], actor: 'System' },
    { id: 'App_DefaultView', base: 'Model_Application', type: 'Relation', value: 'DefaultView', model: 'Event', cause: ['App_Models'], actor: 'System' },
    { id: 'App_DefaultView_Range', base: 'App_DefaultView', type: 'Range', value: 'View', model: 'Event', cause: ['App_DefaultView'], actor: 'System' },

    // === GLOBAL ATTRIBUTES/RELATIONS (for backwards compatibility) ===
    { id: 'Icon', base: 'Attribute', type: 'Individual', value: 'Icon', model: 'Event', cause: ['App_DefaultView'], actor: 'System' },

    // === MORE RELATIONS ===
    { id: 'Models', base: 'Relation', type: 'Individual', value: 'Models', model: 'Event', cause: ['Icon'], actor: 'System' },
    { id: 'Vocabularies', base: 'Relation', type: 'Individual', value: 'Vocabularies', model: 'Event', cause: ['Models'], actor: 'System' },

    // === ENTITY: ORGANIZATION ===
    { id: 'Organization', base: 'Entity', type: 'Instance', value: 'Organization', model: 'Event', cause: ['Application'], actor: 'System' },
    { id: 'OrganizationModel', base: 'Organization', type: 'Model', value: 'OrganizationModel', model: 'Event', cause: ['Organization'], actor: 'System' },
    { id: 'ThisOrganization', base: 'Organization', type: 'Individual', value: 'ThisOrganization', model: 'OrganizationModel', cause: ['Organization'], actor: 'System' },

    // === VOCABULARY INDIVIDUALS ===
    { id: 'SystemProperties', base: 'Vocabulary', type: 'Individual', value: 'SystemProperties', model: 'Model_Vocabulary', cause: ['Vocabulary'], actor: 'System' },
    { id: 'ViewProperties', base: 'Vocabulary', type: 'Individual', value: 'View Properties', model: 'Model_Vocabulary', cause: ['SystemProperties'], actor: 'system' },

    // === ENTITY: VIEW ===
    { id: 'View', base: 'Entity', type: 'Instance', value: 'View', model: 'Event', cause: ['Organization'], actor: 'system' },
    { id: 'Model_View', base: 'View', type: 'Model', value: 'Model_View', model: 'Event', cause: ['View'], actor: 'system' },

    // === VIEW RELATIONS ===
    { id: 'ViewLink', base: 'Relation', type: 'Individual', value: 'ViewLink', model: 'Event', cause: ['Vocabularies'], actor: 'system' },
    { id: 'IndividualID', base: 'Relation', type: 'Individual', value: 'IndividualID', model: 'Event', cause: ['ViewLink'], actor: 'system' },

    // === VIEW ATTRIBUTES ===
    { id: 'EntityPage', base: 'Attribute', type: 'Individual', value: 'EntityPage', model: 'Event', cause: ['Description'], actor: 'system' },
    { id: 'ViewIndividual', base: 'Attribute', type: 'Individual', value: 'ViewIndividual', model: 'Event', cause: ['EntityPage'], actor: 'system' },
    { id: 'Include', base: 'Attribute', type: 'Individual', value: 'Include', model: 'Event', cause: ['ViewIndividual'], actor: 'system' },
    { id: 'Exclude', base: 'Attribute', type: 'Individual', value: 'Exclude', model: 'Event', cause: ['Include'], actor: 'system' },
    { id: 'ViewEntity', base: 'Attribute', type: 'Individual', value: 'ViewEntity', model: 'Event', cause: ['Exclude'], actor: 'system' },
    { id: 'ViewMode', base: 'Attribute', type: 'Individual', value: 'ViewMode', model: 'Event', cause: ['ViewEntity'], actor: 'system' },
    { id: 'Control', base: 'Attribute', type: 'Individual', value: 'Control', model: 'Event', cause: ['ViewMode'], actor: 'system' },
    { id: 'Value', base: 'Attribute', type: 'Individual', value: 'Value', model: 'Event', cause: ['Control'], actor: 'system' },
    { id: 'Title', base: 'Attribute', type: 'Individual', value: 'Title', model: 'Event', cause: ['Value'], actor: 'system' },
    { id: 'Block', base: 'Attribute', type: 'Individual', value: 'Block', model: 'Event', cause: ['Title'], actor: 'system' },
    { id: 'ControlType', base: 'Attribute', type: 'Individual', value: 'ControlType', model: 'Event', cause: ['Block'], actor: 'system' },

    // === MARKDOWN DATATYPE ===
    { id: 'MarkdownType', base: 'DataType', type: 'Individual', value: 'MarkdownType', model: 'Event', cause: ['PDFType'], actor: 'system' },

    // === VIEW ACTOR ===
    { id: 'view', base: 'Actor', type: 'Individual', value: 'view', model: 'Event', cause: ['guest'], actor: 'system' },

    // === ROLES VOCABULARY ===
    { id: 'RolesVoc', base: 'Vocabulary', type: 'Individual', value: 'RolesVoc', model: 'Model_Vocabulary', cause: ['ViewProperties'], actor: 'system' },

    // === MORE ROLES ===
    { id: 'admin', base: 'Role', type: 'Individual', value: 'admin', model: 'Event', cause: ['Owner'], actor: 'system' },
    { id: 'manager', base: 'Role', type: 'Individual', value: 'manager', model: 'Event', cause: ['admin'], actor: 'system' },

    // === ORGANIZATION APP ===
    { id: 'OrganizationApp', base: 'Application', type: 'Individual', value: 'Organization App', model: 'Model_Application', cause: ['Application'], actor: 'system' },

    // === SEMANTIC SCHEMA ENTITIES ===
    { id: 'Schema', base: 'Entity', type: 'Instance', value: 'Schema', model: 'Event', cause: ['View'], actor: 'system' },
    { id: 'SchemaInstruction', base: 'Entity', type: 'Instance', value: 'SchemaInstruction', model: 'Event', cause: ['Schema'], actor: 'system' },
    { id: 'Term', base: 'Entity', type: 'Instance', value: 'Term', model: 'Event', cause: ['SchemaInstruction'], actor: 'system' },
    { id: 'Fragment', base: 'Entity', type: 'Instance', value: 'Fragment', model: 'Event', cause: ['Term'], actor: 'system' },

    // === SCHEMA MODELS ===
    { id: 'Model_Schema', base: 'Schema', type: 'Model', value: 'Model_Schema', model: 'Event', cause: ['Schema'], actor: 'system' },
    { id: 'Model_SchemaInstruction', base: 'SchemaInstruction', type: 'Model', value: 'Model_SchemaInstruction', model: 'Event', cause: ['SchemaInstruction'], actor: 'system' },
    { id: 'Model_Term', base: 'Term', type: 'Model', value: 'Model_Term', model: 'Event', cause: ['Term'], actor: 'system' },
    { id: 'Model_Fragment', base: 'Fragment', type: 'Model', value: 'Model_Fragment', model: 'Event', cause: ['Fragment'], actor: 'system' },

    // === SCHEMA INSTRUCTION ATTRIBUTES ===
    { id: 'display_name', base: 'Attribute', type: 'Individual', value: 'display_name', model: 'Event', cause: ['ControlType'], actor: 'system' },
    { id: 'model_identifier', base: 'Attribute', type: 'Individual', value: 'model_identifier', model: 'Event', cause: ['display_name'], actor: 'system' },
    { id: 'target_schema', base: 'Attribute', type: 'Individual', value: 'target_schema', model: 'Event', cause: ['model_identifier'], actor: 'system' },
    { id: 'llm_prompt_template', base: 'Attribute', type: 'Individual', value: 'llm_prompt_template', model: 'Event', cause: ['target_schema'], actor: 'system' },
    { id: 'extraction_fields', base: 'Attribute', type: 'Individual', value: 'extraction_fields', model: 'Event', cause: ['llm_prompt_template'], actor: 'system' },

    // === BASIC UNIVERSAL SCHEMAS - SchemaInstruction Individuals ===
    { id: 'def_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'def_instruction', model: 'Model_SchemaInstruction', cause: ['SchemaInstruction'], actor: 'system' },
    { id: 'comp_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'comp_instruction', model: 'Model_SchemaInstruction', cause: ['def_instruction'], actor: 'system' },
    { id: 'causal_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'causal_instruction', model: 'Model_SchemaInstruction', cause: ['comp_instruction'], actor: 'system' },
    { id: 'context_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'context_instruction', model: 'Model_SchemaInstruction', cause: ['causal_instruction'], actor: 'system' },
    { id: 'example_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'example_instruction', model: 'Model_SchemaInstruction', cause: ['context_instruction'], actor: 'system' },

    // === ARCHITECTURAL-TECHNICAL SCHEMAS ===
    { id: 'arch_comp_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'arch_comp_instruction', model: 'Model_SchemaInstruction', cause: ['example_instruction'], actor: 'system' },
    { id: 'tech_proc_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'tech_proc_instruction', model: 'Model_SchemaInstruction', cause: ['arch_comp_instruction'], actor: 'system' },
    { id: 'algorithm_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'algorithm_instruction', model: 'Model_SchemaInstruction', cause: ['tech_proc_instruction'], actor: 'system' },

    // === CONCEPTUAL SCHEMAS ===
    { id: 'concept_model_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'concept_model_instruction', model: 'Model_SchemaInstruction', cause: ['algorithm_instruction'], actor: 'system' },
    { id: 'principle_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'principle_instruction', model: 'Model_SchemaInstruction', cause: ['concept_model_instruction'], actor: 'system' },

    // === PROBLEM-ORIENTED SCHEMAS ===
    { id: 'problem_sol_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'problem_sol_instruction', model: 'Model_SchemaInstruction', cause: ['principle_instruction'], actor: 'system' },
    { id: 'limitations_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'limitations_instruction', model: 'Model_SchemaInstruction', cause: ['problem_sol_instruction'], actor: 'system' },

    // === FUNCTIONAL SCHEMAS ===
    { id: 'functionality_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'functionality_instruction', model: 'Model_SchemaInstruction', cause: ['limitations_instruction'], actor: 'system' },
    { id: 'capabilities_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'capabilities_instruction', model: 'Model_SchemaInstruction', cause: ['functionality_instruction'], actor: 'system' },

    // === INTEGRATION SCHEMAS ===
    { id: 'integration_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'integration_instruction', model: 'Model_SchemaInstruction', cause: ['capabilities_instruction'], actor: 'system' },
    { id: 'interaction_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'interaction_instruction', model: 'Model_SchemaInstruction', cause: ['integration_instruction'], actor: 'system' },

    // === APPLIED SCHEMAS ===
    { id: 'usecase_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'usecase_instruction', model: 'Model_SchemaInstruction', cause: ['interaction_instruction'], actor: 'system' },
    { id: 'implementation_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'implementation_instruction', model: 'Model_SchemaInstruction', cause: ['usecase_instruction'], actor: 'system' },
    { id: 'code_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'code_instruction', model: 'Model_SchemaInstruction', cause: ['implementation_instruction'], actor: 'system' },
    { id: 'enum_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'enum_instruction', model: 'Model_SchemaInstruction', cause: ['code_instruction'], actor: 'system' },
    { id: 'table_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'table_instruction', model: 'Model_SchemaInstruction', cause: ['enum_instruction'], actor: 'system' },
    { id: 'adv_disadv_instruction', base: 'SchemaInstruction', type: 'Individual', value: 'adv_disadv_instruction', model: 'Model_SchemaInstruction', cause: ['table_instruction'], actor: 'system' },

    // === SCHEMA INSTRUCTION PROPERTIES ===
    // Definition
    { id: 'def_instruction_dn', base: 'def_instruction', type: 'display_name', value: 'Определение', model: 'Model_SchemaInstruction', cause: ['def_instruction'], actor: 'system' },
    { id: 'def_instruction_ts', base: 'def_instruction', type: 'target_schema', value: 'Definition', model: 'Model_SchemaInstruction', cause: ['def_instruction'], actor: 'system' },
    { id: 'def_instruction_pt', base: 'def_instruction', type: 'llm_prompt_template', value: 'Извлеки определения: target (определяемый термин), includes (компоненты определения)', model: 'Model_SchemaInstruction', cause: ['def_instruction'], actor: 'system' },
    { id: 'def_instruction_ef', base: 'def_instruction', type: 'extraction_fields', value: 'target, includes', model: 'Model_SchemaInstruction', cause: ['def_instruction'], actor: 'system' },

    // Comparison
    { id: 'comp_instruction_dn', base: 'comp_instruction', type: 'display_name', value: 'Сравнение', model: 'Model_SchemaInstruction', cause: ['comp_instruction'], actor: 'system' },
    { id: 'comp_instruction_ts', base: 'comp_instruction', type: 'target_schema', value: 'Comparison', model: 'Model_SchemaInstruction', cause: ['comp_instruction'], actor: 'system' },
    { id: 'comp_instruction_pt', base: 'comp_instruction', type: 'llm_prompt_template', value: 'Извлеки сравнение: target (первый объект), comparator (второй объект), criterion (критерии), advantage (преимущества)', model: 'Model_SchemaInstruction', cause: ['comp_instruction'], actor: 'system' },
    { id: 'comp_instruction_ef', base: 'comp_instruction', type: 'extraction_fields', value: 'target, comparator, criterion, advantage', model: 'Model_SchemaInstruction', cause: ['comp_instruction'], actor: 'system' },

    // Causal Relation
    { id: 'causal_instruction_dn', base: 'causal_instruction', type: 'display_name', value: 'Причинно-следственная связь', model: 'Model_SchemaInstruction', cause: ['causal_instruction'], actor: 'system' },
    { id: 'causal_instruction_ts', base: 'causal_instruction', type: 'target_schema', value: 'CausalRelation', model: 'Model_SchemaInstruction', cause: ['causal_instruction'], actor: 'system' },
    { id: 'causal_instruction_pt', base: 'causal_instruction', type: 'llm_prompt_template', value: 'Извлеки причинно-следственную связь: cause (причины), effect (следствия)', model: 'Model_SchemaInstruction', cause: ['causal_instruction'], actor: 'system' },
    { id: 'causal_instruction_ef', base: 'causal_instruction', type: 'extraction_fields', value: 'cause, effect', model: 'Model_SchemaInstruction', cause: ['causal_instruction'], actor: 'system' },

    // Application Context
    { id: 'context_instruction_dn', base: 'context_instruction', type: 'display_name', value: 'Контекст применения', model: 'Model_SchemaInstruction', cause: ['context_instruction'], actor: 'system' },
    { id: 'context_instruction_ts', base: 'context_instruction', type: 'target_schema', value: 'ApplicationContext', model: 'Model_SchemaInstruction', cause: ['context_instruction'], actor: 'system' },
    { id: 'context_instruction_pt', base: 'context_instruction', type: 'llm_prompt_template', value: 'Извлеки контекст применения: domain (области применения)', model: 'Model_SchemaInstruction', cause: ['context_instruction'], actor: 'system' },
    { id: 'context_instruction_ef', base: 'context_instruction', type: 'extraction_fields', value: 'domain', model: 'Model_SchemaInstruction', cause: ['context_instruction'], actor: 'system' },

    // Example
    { id: 'example_instruction_dn', base: 'example_instruction', type: 'display_name', value: 'Пример', model: 'Model_SchemaInstruction', cause: ['example_instruction'], actor: 'system' },
    { id: 'example_instruction_ts', base: 'example_instruction', type: 'target_schema', value: 'Example', model: 'Model_SchemaInstruction', cause: ['example_instruction'], actor: 'system' },
    { id: 'example_instruction_pt', base: 'example_instruction', type: 'llm_prompt_template', value: 'Извлеки пример: illustrates (что иллюстрирует), type (тип примера: code, scenario, analogy)', model: 'Model_SchemaInstruction', cause: ['example_instruction'], actor: 'system' },
    { id: 'example_instruction_ef', base: 'example_instruction', type: 'extraction_fields', value: 'illustrates, type', model: 'Model_SchemaInstruction', cause: ['example_instruction'], actor: 'system' },

    // Architectural Component
    { id: 'arch_comp_instruction_dn', base: 'arch_comp_instruction', type: 'display_name', value: 'Архитектурный компонент', model: 'Model_SchemaInstruction', cause: ['arch_comp_instruction'], actor: 'system' },
    { id: 'arch_comp_instruction_ts', base: 'arch_comp_instruction', type: 'target_schema', value: 'ArchitecturalComponent', model: 'Model_SchemaInstruction', cause: ['arch_comp_instruction'], actor: 'system' },
    { id: 'arch_comp_instruction_pt', base: 'arch_comp_instruction', type: 'llm_prompt_template', value: 'Извлеки архитектурный компонент: system_terms (система), purpose_terms (назначение), interfaces_terms (интерфейсы), pattern_terms (паттерны)', model: 'Model_SchemaInstruction', cause: ['arch_comp_instruction'], actor: 'system' },
    { id: 'arch_comp_instruction_ef', base: 'arch_comp_instruction', type: 'extraction_fields', value: 'system_terms, purpose_terms, interfaces_terms, pattern_terms', model: 'Model_SchemaInstruction', cause: ['arch_comp_instruction'], actor: 'system' },

    // Technical Process
    { id: 'tech_proc_instruction_dn', base: 'tech_proc_instruction', type: 'display_name', value: 'Технический процесс', model: 'Model_SchemaInstruction', cause: ['tech_proc_instruction'], actor: 'system' },
    { id: 'tech_proc_instruction_ts', base: 'tech_proc_instruction', type: 'target_schema', value: 'TechnicalProcess', model: 'Model_SchemaInstruction', cause: ['tech_proc_instruction'], actor: 'system' },
    { id: 'tech_proc_instruction_pt', base: 'tech_proc_instruction', type: 'llm_prompt_template', value: 'Извлеки технический процесс: input_types (входные типы), output_types (выходные типы), process_category (категория), involves_components (компоненты)', model: 'Model_SchemaInstruction', cause: ['tech_proc_instruction'], actor: 'system' },
    { id: 'tech_proc_instruction_ef', base: 'tech_proc_instruction', type: 'extraction_fields', value: 'input_types, output_types, process_category, involves_components', model: 'Model_SchemaInstruction', cause: ['tech_proc_instruction'], actor: 'system' },

    // Algorithm
    { id: 'algorithm_instruction_dn', base: 'algorithm_instruction', type: 'display_name', value: 'Алгоритм/Метод', model: 'Model_SchemaInstruction', cause: ['algorithm_instruction'], actor: 'system' },
    { id: 'algorithm_instruction_ts', base: 'algorithm_instruction', type: 'target_schema', value: 'Algorithm', model: 'Model_SchemaInstruction', cause: ['algorithm_instruction'], actor: 'system' },
    { id: 'algorithm_instruction_pt', base: 'algorithm_instruction', type: 'llm_prompt_template', value: 'Извлеки алгоритм: input_types (входы), output_types (выходы), involves_components (концепты), process_category (тип алгоритма)', model: 'Model_SchemaInstruction', cause: ['algorithm_instruction'], actor: 'system' },
    { id: 'algorithm_instruction_ef', base: 'algorithm_instruction', type: 'extraction_fields', value: 'input_types, output_types, involves_components, process_category', model: 'Model_SchemaInstruction', cause: ['algorithm_instruction'], actor: 'system' },

    // Conceptual Model
    { id: 'concept_model_instruction_dn', base: 'concept_model_instruction', type: 'display_name', value: 'Концептуальная модель', model: 'Model_SchemaInstruction', cause: ['concept_model_instruction'], actor: 'system' },
    { id: 'concept_model_instruction_ts', base: 'concept_model_instruction', type: 'target_schema', value: 'ConceptualModel', model: 'Model_SchemaInstruction', cause: ['concept_model_instruction'], actor: 'system' },
    { id: 'concept_model_instruction_pt', base: 'concept_model_instruction', type: 'llm_prompt_template', value: 'Извлеки концептуальную модель: target (центральный концепт), involves_components (связанные концепты)', model: 'Model_SchemaInstruction', cause: ['concept_model_instruction'], actor: 'system' },
    { id: 'concept_model_instruction_ef', base: 'concept_model_instruction', type: 'extraction_fields', value: 'target, involves_components', model: 'Model_SchemaInstruction', cause: ['concept_model_instruction'], actor: 'system' },

    // Principle
    { id: 'principle_instruction_dn', base: 'principle_instruction', type: 'display_name', value: 'Принцип/Подход', model: 'Model_SchemaInstruction', cause: ['principle_instruction'], actor: 'system' },
    { id: 'principle_instruction_ts', base: 'principle_instruction', type: 'target_schema', value: 'Principle', model: 'Model_SchemaInstruction', cause: ['principle_instruction'], actor: 'system' },
    { id: 'principle_instruction_pt', base: 'principle_instruction', type: 'llm_prompt_template', value: 'Извлеки принцип: target (принцип), domain (применение), comparator (контраст), demonstrates (результаты)', model: 'Model_SchemaInstruction', cause: ['principle_instruction'], actor: 'system' },
    { id: 'principle_instruction_ef', base: 'principle_instruction', type: 'extraction_fields', value: 'target, domain, comparator, demonstrates', model: 'Model_SchemaInstruction', cause: ['principle_instruction'], actor: 'system' },

    // Problem Solution
    { id: 'problem_sol_instruction_dn', base: 'problem_sol_instruction', type: 'display_name', value: 'Проблема и решение', model: 'Model_SchemaInstruction', cause: ['problem_sol_instruction'], actor: 'system' },
    { id: 'problem_sol_instruction_ts', base: 'problem_sol_instruction', type: 'target_schema', value: 'ProblemSolution', model: 'Model_SchemaInstruction', cause: ['problem_sol_instruction'], actor: 'system' },
    { id: 'problem_sol_instruction_pt', base: 'problem_sol_instruction', type: 'llm_prompt_template', value: 'Извлеки проблему и решение: problem_domain (проблема), solution_components (решение), alternative_solutions (альтернативы), keywords (термины)', model: 'Model_SchemaInstruction', cause: ['problem_sol_instruction'], actor: 'system' },
    { id: 'problem_sol_instruction_ef', base: 'problem_sol_instruction', type: 'extraction_fields', value: 'problem_domain, solution_components, alternative_solutions, keywords', model: 'Model_SchemaInstruction', cause: ['problem_sol_instruction'], actor: 'system' },

    // Limitations and Challenges
    { id: 'limitations_instruction_dn', base: 'limitations_instruction', type: 'display_name', value: 'Ограничения и вызовы', model: 'Model_SchemaInstruction', cause: ['limitations_instruction'], actor: 'system' },
    { id: 'limitations_instruction_ts', base: 'limitations_instruction', type: 'target_schema', value: 'LimitationsAndChallenges', model: 'Model_SchemaInstruction', cause: ['limitations_instruction'], actor: 'system' },
    { id: 'limitations_instruction_pt', base: 'limitations_instruction', type: 'llm_prompt_template', value: 'Извлеки ограничения: target (объект), problem_domain (типы ограничений)', model: 'Model_SchemaInstruction', cause: ['limitations_instruction'], actor: 'system' },
    { id: 'limitations_instruction_ef', base: 'limitations_instruction', type: 'extraction_fields', value: 'target, problem_domain', model: 'Model_SchemaInstruction', cause: ['limitations_instruction'], actor: 'system' },

    // Functionality
    { id: 'functionality_instruction_dn', base: 'functionality_instruction', type: 'display_name', value: 'Функциональность', model: 'Model_SchemaInstruction', cause: ['functionality_instruction'], actor: 'system' },
    { id: 'functionality_instruction_ts', base: 'functionality_instruction', type: 'target_schema', value: 'Functionality', model: 'Model_SchemaInstruction', cause: ['functionality_instruction'], actor: 'system' },
    { id: 'functionality_instruction_pt', base: 'functionality_instruction', type: 'llm_prompt_template', value: 'Извлеки функциональность: system_terms (система), purpose_terms (функции), involves_components (зависимости)', model: 'Model_SchemaInstruction', cause: ['functionality_instruction'], actor: 'system' },
    { id: 'functionality_instruction_ef', base: 'functionality_instruction', type: 'extraction_fields', value: 'system_terms, purpose_terms, involves_components', model: 'Model_SchemaInstruction', cause: ['functionality_instruction'], actor: 'system' },

    // Capabilities
    { id: 'capabilities_instruction_dn', base: 'capabilities_instruction', type: 'display_name', value: 'Возможности', model: 'Model_SchemaInstruction', cause: ['capabilities_instruction'], actor: 'system' },
    { id: 'capabilities_instruction_ts', base: 'capabilities_instruction', type: 'target_schema', value: 'Capabilities', model: 'Model_SchemaInstruction', cause: ['capabilities_instruction'], actor: 'system' },
    { id: 'capabilities_instruction_pt', base: 'capabilities_instruction', type: 'llm_prompt_template', value: 'Извлеки возможности: target (объект), purpose_terms (типы возможностей), demonstrates (сценарии)', model: 'Model_SchemaInstruction', cause: ['capabilities_instruction'], actor: 'system' },
    { id: 'capabilities_instruction_ef', base: 'capabilities_instruction', type: 'extraction_fields', value: 'target, purpose_terms, demonstrates', model: 'Model_SchemaInstruction', cause: ['capabilities_instruction'], actor: 'system' },

    // System Integration
    { id: 'integration_instruction_dn', base: 'integration_instruction', type: 'display_name', value: 'Интеграция систем', model: 'Model_SchemaInstruction', cause: ['integration_instruction'], actor: 'system' },
    { id: 'integration_instruction_ts', base: 'integration_instruction', type: 'target_schema', value: 'SystemIntegration', model: 'Model_SchemaInstruction', cause: ['integration_instruction'], actor: 'system' },
    { id: 'integration_instruction_pt', base: 'integration_instruction', type: 'llm_prompt_template', value: 'Извлеки интеграцию: target (основная система), comparator (интегрируемая), interfaces_terms (точки интеграции), process_category (метод)', model: 'Model_SchemaInstruction', cause: ['integration_instruction'], actor: 'system' },
    { id: 'integration_instruction_ef', base: 'integration_instruction', type: 'extraction_fields', value: 'target, comparator, interfaces_terms, process_category', model: 'Model_SchemaInstruction', cause: ['integration_instruction'], actor: 'system' },

    // Component Interaction
    { id: 'interaction_instruction_dn', base: 'interaction_instruction', type: 'display_name', value: 'Взаимодействие компонентов', model: 'Model_SchemaInstruction', cause: ['interaction_instruction'], actor: 'system' },
    { id: 'interaction_instruction_ts', base: 'interaction_instruction', type: 'target_schema', value: 'ComponentInteraction', model: 'Model_SchemaInstruction', cause: ['interaction_instruction'], actor: 'system' },
    { id: 'interaction_instruction_pt', base: 'interaction_instruction', type: 'llm_prompt_template', value: 'Извлеки взаимодействие: target (инициатор), comparator (цель), process_category (тип), involves_components (посредники)', model: 'Model_SchemaInstruction', cause: ['interaction_instruction'], actor: 'system' },
    { id: 'interaction_instruction_ef', base: 'interaction_instruction', type: 'extraction_fields', value: 'target, comparator, process_category, involves_components', model: 'Model_SchemaInstruction', cause: ['interaction_instruction'], actor: 'system' },

    // Use Case
    { id: 'usecase_instruction_dn', base: 'usecase_instruction', type: 'display_name', value: 'Сценарий использования', model: 'Model_SchemaInstruction', cause: ['usecase_instruction'], actor: 'system' },
    { id: 'usecase_instruction_ts', base: 'usecase_instruction', type: 'target_schema', value: 'UseCase', model: 'Model_SchemaInstruction', cause: ['usecase_instruction'], actor: 'system' },
    { id: 'usecase_instruction_pt', base: 'usecase_instruction', type: 'llm_prompt_template', value: 'Извлеки сценарий: domain (область), actors (участники), demonstrates (демонстрирует)', model: 'Model_SchemaInstruction', cause: ['usecase_instruction'], actor: 'system' },
    { id: 'usecase_instruction_ef', base: 'usecase_instruction', type: 'extraction_fields', value: 'domain, actors, demonstrates', model: 'Model_SchemaInstruction', cause: ['usecase_instruction'], actor: 'system' },

    // Concept Implementation
    { id: 'implementation_instruction_dn', base: 'implementation_instruction', type: 'display_name', value: 'Реализация концепции', model: 'Model_SchemaInstruction', cause: ['implementation_instruction'], actor: 'system' },
    { id: 'implementation_instruction_ts', base: 'implementation_instruction', type: 'target_schema', value: 'ConceptImplementation', model: 'Model_SchemaInstruction', cause: ['implementation_instruction'], actor: 'system' },
    { id: 'implementation_instruction_pt', base: 'implementation_instruction', type: 'llm_prompt_template', value: 'Извлеки реализацию: concept_ref (концепт), technologies (технологии), key_features (особенности)', model: 'Model_SchemaInstruction', cause: ['implementation_instruction'], actor: 'system' },
    { id: 'implementation_instruction_ef', base: 'implementation_instruction', type: 'extraction_fields', value: 'concept_ref, technologies, key_features', model: 'Model_SchemaInstruction', cause: ['implementation_instruction'], actor: 'system' },

    // Code Snippet
    { id: 'code_instruction_dn', base: 'code_instruction', type: 'display_name', value: 'Фрагмент кода', model: 'Model_SchemaInstruction', cause: ['code_instruction'], actor: 'system' },
    { id: 'code_instruction_ts', base: 'code_instruction', type: 'target_schema', value: 'CodeSnippet', model: 'Model_SchemaInstruction', cause: ['code_instruction'], actor: 'system' },
    { id: 'code_instruction_pt', base: 'code_instruction', type: 'llm_prompt_template', value: 'Извлеки код: language (язык), illustrates (демонстрирует), input_types (входы), output_types (выходы), keywords (термины)', model: 'Model_SchemaInstruction', cause: ['code_instruction'], actor: 'system' },
    { id: 'code_instruction_ef', base: 'code_instruction', type: 'extraction_fields', value: 'language, illustrates, input_types, output_types, keywords', model: 'Model_SchemaInstruction', cause: ['code_instruction'], actor: 'system' },

    // Enumeration
    { id: 'enum_instruction_dn', base: 'enum_instruction', type: 'display_name', value: 'Перечисление/Список', model: 'Model_SchemaInstruction', cause: ['enum_instruction'], actor: 'system' },
    { id: 'enum_instruction_ts', base: 'enum_instruction', type: 'target_schema', value: 'Enumeration', model: 'Model_SchemaInstruction', cause: ['enum_instruction'], actor: 'system' },
    { id: 'enum_instruction_pt', base: 'enum_instruction', type: 'llm_prompt_template', value: 'Извлеки список: category (категория), items (элементы), keywords (термины)', model: 'Model_SchemaInstruction', cause: ['enum_instruction'], actor: 'system' },
    { id: 'enum_instruction_ef', base: 'enum_instruction', type: 'extraction_fields', value: 'category, items, keywords', model: 'Model_SchemaInstruction', cause: ['enum_instruction'], actor: 'system' },

    // Table Analysis
    { id: 'table_instruction_dn', base: 'table_instruction', type: 'display_name', value: 'Таблица/Матрица', model: 'Model_SchemaInstruction', cause: ['table_instruction'], actor: 'system' },
    { id: 'table_instruction_ts', base: 'table_instruction', type: 'target_schema', value: 'TableAnalysis', model: 'Model_SchemaInstruction', cause: ['table_instruction'], actor: 'system' },
    { id: 'table_instruction_pt', base: 'table_instruction', type: 'llm_prompt_template', value: 'Извлеки таблицу: rows (строки), columns (столбцы), values (значения), keywords (термины)', model: 'Model_SchemaInstruction', cause: ['table_instruction'], actor: 'system' },
    { id: 'table_instruction_ef', base: 'table_instruction', type: 'extraction_fields', value: 'rows, columns, values, keywords', model: 'Model_SchemaInstruction', cause: ['table_instruction'], actor: 'system' },

    // Advantage Disadvantage
    { id: 'adv_disadv_instruction_dn', base: 'adv_disadv_instruction', type: 'display_name', value: 'Преимущества и недостатки', model: 'Model_SchemaInstruction', cause: ['adv_disadv_instruction'], actor: 'system' },
    { id: 'adv_disadv_instruction_ts', base: 'adv_disadv_instruction', type: 'target_schema', value: 'AdvantageDisadvantage', model: 'Model_SchemaInstruction', cause: ['adv_disadv_instruction'], actor: 'system' },
    { id: 'adv_disadv_instruction_pt', base: 'adv_disadv_instruction', type: 'llm_prompt_template', value: 'Извлеки преимущества и недостатки: target (объект), advantages (плюсы), disadvantages (минусы), keywords (термины)', model: 'Model_SchemaInstruction', cause: ['adv_disadv_instruction'], actor: 'system' },
    { id: 'adv_disadv_instruction_ef', base: 'adv_disadv_instruction', type: 'extraction_fields', value: 'target, advantages, disadvantages, keywords', model: 'Model_SchemaInstruction', cause: ['adv_disadv_instruction'], actor: 'system' },

    // === SCHEMA MODELS (for Fragment extraction) ===
    // Basic Universal
    { id: 'Definition', base: 'Schema', type: 'Model', value: 'Definition', model: 'Model_Schema', cause: ['def_instruction'], actor: 'system' },
    { id: 'Comparison', base: 'Schema', type: 'Model', value: 'Comparison', model: 'Model_Schema', cause: ['comp_instruction'], actor: 'system' },
    { id: 'CausalRelation', base: 'Schema', type: 'Model', value: 'CausalRelation', model: 'Model_Schema', cause: ['causal_instruction'], actor: 'system' },
    { id: 'ApplicationContext', base: 'Schema', type: 'Model', value: 'ApplicationContext', model: 'Model_Schema', cause: ['context_instruction'], actor: 'system' },
    { id: 'ExampleSchema', base: 'Schema', type: 'Model', value: 'Example', model: 'Model_Schema', cause: ['example_instruction'], actor: 'system' },

    // Architectural-Technical
    { id: 'ArchitecturalComponent', base: 'Schema', type: 'Model', value: 'ArchitecturalComponent', model: 'Model_Schema', cause: ['arch_comp_instruction'], actor: 'system' },
    { id: 'TechnicalProcess', base: 'Schema', type: 'Model', value: 'TechnicalProcess', model: 'Model_Schema', cause: ['tech_proc_instruction'], actor: 'system' },
    { id: 'Algorithm', base: 'Schema', type: 'Model', value: 'Algorithm', model: 'Model_Schema', cause: ['algorithm_instruction'], actor: 'system' },

    // Conceptual
    { id: 'ConceptualModel', base: 'Schema', type: 'Model', value: 'ConceptualModel', model: 'Model_Schema', cause: ['concept_model_instruction'], actor: 'system' },
    { id: 'Principle', base: 'Schema', type: 'Model', value: 'Principle', model: 'Model_Schema', cause: ['principle_instruction'], actor: 'system' },

    // Problem-Oriented
    { id: 'ProblemSolution', base: 'Schema', type: 'Model', value: 'ProblemSolution', model: 'Model_Schema', cause: ['problem_sol_instruction'], actor: 'system' },
    { id: 'LimitationsAndChallenges', base: 'Schema', type: 'Model', value: 'LimitationsAndChallenges', model: 'Model_Schema', cause: ['limitations_instruction'], actor: 'system' },

    // Functional
    { id: 'Functionality', base: 'Schema', type: 'Model', value: 'Functionality', model: 'Model_Schema', cause: ['functionality_instruction'], actor: 'system' },
    { id: 'Capabilities', base: 'Schema', type: 'Model', value: 'Capabilities', model: 'Model_Schema', cause: ['capabilities_instruction'], actor: 'system' },

    // Integration
    { id: 'SystemIntegration', base: 'Schema', type: 'Model', value: 'SystemIntegration', model: 'Model_Schema', cause: ['integration_instruction'], actor: 'system' },
    { id: 'ComponentInteraction', base: 'Schema', type: 'Model', value: 'ComponentInteraction', model: 'Model_Schema', cause: ['interaction_instruction'], actor: 'system' },

    // Applied
    { id: 'UseCase', base: 'Schema', type: 'Model', value: 'UseCase', model: 'Model_Schema', cause: ['usecase_instruction'], actor: 'system' },
    { id: 'ConceptImplementation', base: 'Schema', type: 'Model', value: 'ConceptImplementation', model: 'Model_Schema', cause: ['implementation_instruction'], actor: 'system' },
    { id: 'CodeSnippet', base: 'Schema', type: 'Model', value: 'CodeSnippet', model: 'Model_Schema', cause: ['code_instruction'], actor: 'system' },
    { id: 'Enumeration', base: 'Schema', type: 'Model', value: 'Enumeration', model: 'Model_Schema', cause: ['enum_instruction'], actor: 'system' },
    { id: 'TableAnalysis', base: 'Schema', type: 'Model', value: 'TableAnalysis', model: 'Model_Schema', cause: ['table_instruction'], actor: 'system' },
    { id: 'AdvantageDisadvantage', base: 'Schema', type: 'Model', value: 'AdvantageDisadvantage', model: 'Model_Schema', cause: ['adv_disadv_instruction'], actor: 'system' },

    // === SCHEMA RELATION ATTRIBUTES (for model fields) ===
    { id: 'term', base: 'Relation', type: 'Individual', value: 'term', model: 'Event', cause: ['IndividualID'], actor: 'system' },
    { id: 'includes', base: 'Relation', type: 'Individual', value: 'includes', model: 'Event', cause: ['term'], actor: 'system' },
    { id: 'target', base: 'Relation', type: 'Individual', value: 'target', model: 'Event', cause: ['includes'], actor: 'system' },
    { id: 'comparator', base: 'Relation', type: 'Individual', value: 'comparator', model: 'Event', cause: ['target'], actor: 'system' },
    { id: 'criterion', base: 'Relation', type: 'Individual', value: 'criterion', model: 'Event', cause: ['comparator'], actor: 'system' },
    { id: 'advantage', base: 'Relation', type: 'Individual', value: 'advantage', model: 'Event', cause: ['criterion'], actor: 'system' },
    { id: 'cause_rel', base: 'Relation', type: 'Individual', value: 'cause', model: 'Event', cause: ['advantage'], actor: 'system' },
    { id: 'effect', base: 'Relation', type: 'Individual', value: 'effect', model: 'Event', cause: ['cause_rel'], actor: 'system' },
    { id: 'domain', base: 'Relation', type: 'Individual', value: 'domain', model: 'Event', cause: ['effect'], actor: 'system' },
    { id: 'illustrates', base: 'Relation', type: 'Individual', value: 'illustrates', model: 'Event', cause: ['domain'], actor: 'system' },
    { id: 'system_terms', base: 'Relation', type: 'Individual', value: 'system_terms', model: 'Event', cause: ['illustrates'], actor: 'system' },
    { id: 'purpose_terms', base: 'Relation', type: 'Individual', value: 'purpose_terms', model: 'Event', cause: ['system_terms'], actor: 'system' },
    { id: 'interfaces_terms', base: 'Relation', type: 'Individual', value: 'interfaces_terms', model: 'Event', cause: ['purpose_terms'], actor: 'system' },
    { id: 'pattern_terms', base: 'Relation', type: 'Individual', value: 'pattern_terms', model: 'Event', cause: ['interfaces_terms'], actor: 'system' },
    { id: 'input_types', base: 'Relation', type: 'Individual', value: 'input_types', model: 'Event', cause: ['pattern_terms'], actor: 'system' },
    { id: 'output_types', base: 'Relation', type: 'Individual', value: 'output_types', model: 'Event', cause: ['input_types'], actor: 'system' },
    { id: 'process_category', base: 'Relation', type: 'Individual', value: 'process_category', model: 'Event', cause: ['output_types'], actor: 'system' },
    { id: 'involves_components', base: 'Relation', type: 'Individual', value: 'involves_components', model: 'Event', cause: ['process_category'], actor: 'system' },
    { id: 'demonstrates', base: 'Relation', type: 'Individual', value: 'demonstrates', model: 'Event', cause: ['involves_components'], actor: 'system' },
    { id: 'problem_domain', base: 'Relation', type: 'Individual', value: 'problem_domain', model: 'Event', cause: ['demonstrates'], actor: 'system' },
    { id: 'solution_components', base: 'Relation', type: 'Individual', value: 'solution_components', model: 'Event', cause: ['problem_domain'], actor: 'system' },
    { id: 'alternative_solutions', base: 'Relation', type: 'Individual', value: 'alternative_solutions', model: 'Event', cause: ['solution_components'], actor: 'system' },
    { id: 'actors', base: 'Relation', type: 'Individual', value: 'actors', model: 'Event', cause: ['alternative_solutions'], actor: 'system' },
    { id: 'concept_ref', base: 'Relation', type: 'Individual', value: 'concept_ref', model: 'Event', cause: ['actors'], actor: 'system' },
    { id: 'technologies', base: 'Relation', type: 'Individual', value: 'technologies', model: 'Event', cause: ['concept_ref'], actor: 'system' },
    { id: 'key_features', base: 'Relation', type: 'Individual', value: 'key_features', model: 'Event', cause: ['technologies'], actor: 'system' },
    { id: 'language', base: 'Relation', type: 'Individual', value: 'language', model: 'Event', cause: ['key_features'], actor: 'system' },
    { id: 'keywords', base: 'Relation', type: 'Individual', value: 'keywords', model: 'Event', cause: ['language'], actor: 'system' },
    { id: 'category', base: 'Relation', type: 'Individual', value: 'category', model: 'Event', cause: ['keywords'], actor: 'system' },
    { id: 'items', base: 'Relation', type: 'Individual', value: 'items', model: 'Event', cause: ['category'], actor: 'system' },
    { id: 'rows', base: 'Relation', type: 'Individual', value: 'rows', model: 'Event', cause: ['items'], actor: 'system' },
    { id: 'columns', base: 'Relation', type: 'Individual', value: 'columns', model: 'Event', cause: ['rows'], actor: 'system' },
    { id: 'values', base: 'Relation', type: 'Individual', value: 'values', model: 'Event', cause: ['columns'], actor: 'system' },
    { id: 'advantages', base: 'Relation', type: 'Individual', value: 'advantages', model: 'Event', cause: ['values'], actor: 'system' },
    { id: 'disadvantages', base: 'Relation', type: 'Individual', value: 'disadvantages', model: 'Event', cause: ['advantages'], actor: 'system' },

    // === ADDITIONAL ENTITIES: Author, Document, Classifier, Category ===
    { id: 'Author', base: 'Entity', type: 'Instance', value: 'Author', model: 'Event', cause: ['Fragment'], actor: 'system' },
    { id: 'Document', base: 'Entity', type: 'Instance', value: 'Document', model: 'Event', cause: ['Author'], actor: 'system' },
    { id: 'Classifier', base: 'Entity', type: 'Instance', value: 'Classifier', model: 'Event', cause: ['Document'], actor: 'system' },
    { id: 'Category', base: 'Entity', type: 'Instance', value: 'Category', model: 'Event', cause: ['Classifier'], actor: 'system' },

    // === MODELS FOR NEW ENTITIES ===
    { id: 'Model_Author', base: 'Author', type: 'Model', value: 'Model_Author', model: 'Event', cause: ['Author'], actor: 'system' },
    { id: 'Model_Document', base: 'Document', type: 'Model', value: 'Model_Document', model: 'Event', cause: ['Document'], actor: 'system' },
    { id: 'Model_Classifier', base: 'Classifier', type: 'Model', value: 'Model_Classifier', model: 'Event', cause: ['Classifier'], actor: 'system' },
    { id: 'Model_Category', base: 'Category', type: 'Model', value: 'Model_Category', model: 'Event', cause: ['Category'], actor: 'system' },

    // === THESAURUS ATTRIBUTES (for Model Term) ===
    { id: 'definition', base: 'Attribute', type: 'Individual', value: 'definition', model: 'Event', cause: ['extraction_fields'], actor: 'system' },
    { id: 'synonym', base: 'Attribute', type: 'Individual', value: 'synonym', model: 'Event', cause: ['definition'], actor: 'system' },
    { id: 'importance', base: 'Attribute', type: 'Individual', value: 'importance', model: 'Event', cause: ['synonym'], actor: 'system' },
    { id: 'domain_attr', base: 'Attribute', type: 'Individual', value: 'domain', model: 'Event', cause: ['importance'], actor: 'system' },

    // === THESAURUS RELATIONS (for Model Term) ===
    { id: 'broader', base: 'Relation', type: 'Individual', value: 'broader', model: 'Event', cause: ['disadvantages'], actor: 'system' },
    { id: 'related', base: 'Relation', type: 'Individual', value: 'related', model: 'Event', cause: ['broader'], actor: 'system' },

    // === DOCUMENT RELATIONS ===
    { id: 'author', base: 'Relation', type: 'Individual', value: 'author', model: 'Event', cause: ['related'], actor: 'system' },
    { id: 'source', base: 'Relation', type: 'Individual', value: 'source', model: 'Event', cause: ['author'], actor: 'system' },
    { id: 'belongs_to', base: 'Relation', type: 'Individual', value: 'belongs_to', model: 'Event', cause: ['source'], actor: 'system' },

    // === CLASSIFIER RELATIONS (for Model Category) ===
    { id: 'classifier', base: 'Relation', type: 'Individual', value: 'classifier', model: 'Event', cause: ['belongs_to'], actor: 'system' }
];

/**
 * Get all genesis events with sequential date field
 * Each event gets a unique timestamp to preserve order
 */
function getGenesisEvents() {
    return GENESIS_EVENTS.map((evt, index) => ({
        ...evt,
        date: new Date(index).toISOString()  // 1970-01-01T00:00:00.000Z, .001Z, .002Z, ...
    }));
}

/**
 * Check if event is a genesis event
 */
function isGenesisEvent(event) {
    if (!event) return false;
    // Check by actor
    if (event.actor === 'System' || event.actor === 'system') {
        // Genesis events have specific IDs from the table
        return GENESIS_EVENTS.some(g => g.id === event.id);
    }
    return false;
}

/**
 * Check if event ID is a genesis ID
 */
function isGenesisId(id) {
    return GENESIS_EVENTS.some(g => g.id === id);
}

/**
 * Check if event is a system event (genesis, bootstrap, or thesaurus)
 * System events are loaded from BSL files and should not be synced
 */
function isSystemEvent(event) {
    if (!event) return false;
    return isSystemId(event.id);
}

/**
 * Check if ID is a system ID (genesis, bootstrap, or thesaurus)
 */
function isSystemId(id) {
    if (!id) return false;
    return isGenesisId(id) ||
           id.startsWith('bootstrap_') ||
           id.startsWith('thesaurus_');
}

/**
 * Validate that all required genesis events exist in memory
 * @param {Array} events - Current events in memory
 * @returns {Object} { valid, missing, extra, found, total }
 */
function validateGenesis(events) {
    const required = GENESIS_EVENTS;
    const missing = [];
    const found = [];

    required.forEach(reqEvt => {
        const exists = events.some(e => e.id === reqEvt.id);

        if (exists) {
            found.push(reqEvt);
        } else {
            missing.push(reqEvt);
        }
    });

    // Find extra events that claim to be genesis but aren't in the table
    const extra = events.filter(e =>
        (e.actor === 'System' || e.actor === 'system') &&
        !required.some(r => r.id === e.id)
    );

    const valid = missing.length === 0;

    return {
        valid,
        total: required.length,
        found: found.length,
        missing,
        extra
    };
}

/**
 * Repair genesis by adding missing events
 * @param {Array} events - Current events array (will be modified)
 * @returns {Object} { added, report }
 */
function repairGenesis(events) {
    const validation = validateGenesis(events);
    const added = [];

    if (validation.missing.length > 0) {
        console.warn(`Genesis validation: ${validation.missing.length} missing events`);

        validation.missing.forEach(evt => {
            // Find original index to get correct timestamp
            const originalIndex = GENESIS_EVENTS.findIndex(g => g.id === evt.id);
            const newEvent = {
                ...evt,
                date: new Date(originalIndex >= 0 ? originalIndex : 0).toISOString()
            };

            events.push(newEvent);
            added.push(newEvent);

            console.log(`  + Added: ${evt.id} (${evt.base}: ${evt.type}: ${evt.value})`);
        });
    }

    return {
        added,
        report: {
            total: validation.total,
            found: validation.found,
            repaired: added.length,
            valid: validation.valid || added.length > 0
        }
    };
}

/**
 * Get genesis validation report as string
 */
function getGenesisReport(events) {
    const validation = validateGenesis(events);

    const lines = [
        `=== Genesis Validation Report ===`,
        `Total required: ${validation.total}`,
        `Found: ${validation.found}`,
        `Missing: ${validation.missing.length}`,
        `Extra: ${validation.extra.length}`
    ];

    if (validation.missing.length > 0) {
        lines.push(`\nMissing events:`);
        validation.missing.forEach(e => {
            lines.push(`  - ${e.id}: ${e.base}: ${e.type}: ${e.value}`);
        });
    }

    if (validation.extra.length > 0) {
        lines.push(`\nExtra events (not in standard genesis):`);
        validation.extra.forEach(e => {
            lines.push(`  + ${e.id}: ${e.base}: ${e.type}: ${e.value}`);
        });
    }

    lines.push(`\nStatus: ${validation.valid ? 'VALID OK' : 'INVALID X'}`);

    return lines.join('\n');
}

/**
 * Get genesis event by ID
 */
function getGenesisEvent(id) {
    return GENESIS_EVENTS.find(e => e.id === id) || null;
}

/**
 * Get all genesis IDs
 */
function getGenesisIds() {
    return GENESIS_EVENTS.map(e => e.id);
}

/**
 * Parse genesis BSL format
 * Format: [ID] Base: Type: Value {cause=X, model=Y}
 */
function parseGenesisBsl(bslText) {
    const events = [];
    const lines = bslText.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    for (const line of lines) {
        const event = parseGenesisLine(line);
        if (event) {
            events.push(event);
        }
    }

    return events;
}

/**
 * Parse single genesis BSL line
 * [ID] Base: Type: Value {cause=X, model=Y}
 */
function parseGenesisLine(line) {
    // Extract [ID] prefix
    const idMatch = line.match(/^\[([^\]]+)\]\s*/);
    if (!idMatch) return null;

    const id = idMatch[1];
    let rest = line.slice(idMatch[0].length);

    // Extract {key=value, ...} metadata suffix
    const metaMatch = rest.match(/\s*\{([^}]+)\}\s*$/);
    let metadata = {};
    if (metaMatch) {
        const metaStr = metaMatch[1];
        metaStr.split(',').forEach(pair => {
            const [key, value] = pair.split('=').map(s => s.trim());
            if (key && value) {
                metadata[key] = value;
            }
        });
        rest = rest.slice(0, rest.length - metaMatch[0].length).trim();
    }

    // Parse BSL content: Base: Type: Value
    const parts = rest.split(':').map(s => s.trim());
    if (parts.length < 3) return null;

    const [base, type, ...valueParts] = parts;
    const value = valueParts.join(':').trim();

    return {
        id,
        base,
        type,
        value,
        model: metadata.model || 'Event',
        cause: metadata.cause ? [metadata.cause] : [],
        actor: 'System'
    };
}

/**
 * Load genesis from BSL file (for future use)
 */
async function loadGenesisBsl(url = '/api/genesis.bsl') {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log('genesis.bsl not available, using hardcoded genesis');
            return GENESIS_EVENTS;
        }
        const bslText = await response.text();
        const events = parseGenesisBsl(bslText);
        console.log(`Loaded ${events.length} genesis events from BSL`);
        return events.length > 0 ? events : GENESIS_EVENTS;
    } catch (error) {
        console.log('Failed to load genesis.bsl, using hardcoded genesis:', error);
        return GENESIS_EVENTS;
    }
}

// Export for console access
window.GENESIS_EVENTS = GENESIS_EVENTS;
window.getGenesisEvents = getGenesisEvents;
window.isGenesisEvent = isGenesisEvent;
window.isGenesisId = isGenesisId;
window.validateGenesis = validateGenesis;
window.repairGenesis = repairGenesis;
window.getGenesisReport = getGenesisReport;
window.getGenesisEvent = getGenesisEvent;
window.getGenesisIds = getGenesisIds;
window.parseGenesisBsl = parseGenesisBsl;
window.loadGenesisBsl = loadGenesisBsl;
