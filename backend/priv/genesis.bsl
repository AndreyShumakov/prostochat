# Genesis Events - Core Ontology Foundation
# Loaded at first startup before bootstrap.bsl
# Format: [ID] Base: Type: Value {cause=X, model=Y}
# All events have actor=System by default

# ========================================
# ROOT EVENT - Self-referential bootstrap
# ========================================
[Event] Event: Event: Event {cause=Event, model=Event}

# ========================================
# CORE TYPE SYSTEM
# ========================================
[Delete] Event: Instance: Delete {cause=Event}
[Instance] Event: Instance: Instance {cause=Delete}
[Actor] Event: Instance: Actor {cause=Event}
[Concept] Event: Instance: Concept {cause=Actor}
[Model] Event: Instance: Model {cause=Concept}
[Individual] Event: Instance: Individual {cause=Model}
[Attribute] Event: Instance: Attribute {cause=Individual}
[Relation] Event: Instance: Relation {cause=Attribute}
[Role] Event: Instance: Role {cause=Relation}
[Restriction] Event: Instance: Restriction {cause=Role}

# ========================================
# RESTRICTION TYPES
# ========================================
[Domain] Restriction: Individual: Domain {cause=Restriction}
[DataType] Restriction: Individual: DataType {cause=Domain}
[Range] Restriction: Individual: Range {cause=DataType}
[Required] Restriction: Individual: Required {cause=Range}
[Multiple] Restriction: Individual: Multiple {cause=Required}
[Immutable] Restriction: Individual: Immutable {cause=Multiple}
[AttributeValue] Restriction: Individual: AttributeValue {cause=Immutable}
[Condition] Restriction: Individual: Condition {cause=AttributeValue}
[ValueCondition] Restriction: Individual: ValueCondition {cause=Condition}
[Permission] Restriction: Individual: Permission {cause=ValueCondition}
[SetValue] Restriction: Individual: SetValue {cause=Permission}
[Unique] Restriction: Individual: Unique {cause=SetValue}
[UniqueIdentifier] Restriction: Individual: UniqueIdentifier {cause=Unique}
[SetRange] Restriction: Individual: SetRange {cause=UniqueIdentifier}
[Default] Restriction: Individual: Default {cause=SetRange}
[Cardinality] Restriction: Individual: Cardinality {cause=Default}
[Mutable] Restriction: Individual: Mutable {cause=Cardinality}
[SetDo] Restriction: Individual: SetDo {cause=Mutable}

# ========================================
# DATA TYPES
# ========================================
[BasicType] DataType: Individual: BasicType {cause=DataType}
[TextType] DataType: Individual: TextType {cause=BasicType}
[Numeric] DataType: Individual: Numeric {cause=TextType}
[EnumType] DataType: Individual: EnumType {cause=Numeric}
[Boolean] DataType: Individual: Boolean {cause=EnumType}
[Expression] DataType: Individual: Expression {cause=Boolean}
[DateTime] DataType: Individual: DateTime {cause=Expression}
[Duration] DataType: Individual: Duration {cause=DateTime}
[PDFType] DataType: Individual: PDFType {cause=Duration}
[MarkdownType] DataType: Individual: MarkdownType {cause=PDFType}

# ========================================
# CORE MODELS
# ========================================
[Model_Event] Event: Model: Model_Event {cause=Event}
[Model_Entity] Entity: Model: Model_Entity {cause=Entity}
[Model_Actor] Actor: Model: Model_Actor {cause=Actor}
[Model_Relation] Relation: Model: Model_Relation {cause=Relation}
[Model_Datatype] DataType: Model: Model_Datatype {cause=DataType}
[Model_Attribute] Attribute: Model: Model_Attribute {cause=Attribute}
[Model_Role] Role: Model: Model_Role {cause=Role}

# ========================================
# SYSTEM ACTORS
# ========================================
[system] Actor: Individual: system {cause=Actor}
[engine] Actor: Individual: engine {cause=system}
[guest] Actor: Individual: guest {cause=engine}
[view] Actor: Individual: view {cause=guest}

# ========================================
# CORE ATTRIBUTES
# ========================================
[CreateIndividual] Attribute: Individual: CreateIndividual {cause=Attribute}
[SetEntity] Attribute: Individual: SetEntity {cause=CreateIndividual}
[SetModel] Attribute: Individual: SetModel {cause=SetEntity}
[SetLabel] Attribute: Individual: SetLabel {cause=SetModel}
[Apply] Attribute: Individual: Apply {cause=SetLabel}
[delete] Attribute: Individual: deleted {cause=Apply}
[Description] Attribute: Individual: Description {cause=delete}
[EntityPage] Attribute: Individual: EntityPage {cause=Description}
[ViewIndividual] Attribute: Individual: ViewIndividual {cause=EntityPage}
[Include] Attribute: Individual: Include {cause=ViewIndividual}
[Exclude] Attribute: Individual: Exclude {cause=Include}
[ViewEntity] Attribute: Individual: ViewEntity {cause=Exclude}
[ViewMode] Attribute: Individual: ViewMode {cause=ViewEntity}
[Control] Attribute: Individual: Control {cause=ViewMode}
[Value] Attribute: Individual: Value {cause=Control}
[Title] Attribute: Individual: Title {cause=Value}
[Block] Attribute: Individual: Block {cause=Title}
[ControlType] Attribute: Individual: ControlType {cause=Block}
[Icon] Attribute: Individual: Icon {cause=ControlType}

# ========================================
# SCHEMA INSTRUCTION ATTRIBUTES
# ========================================
[display_name] Attribute: Individual: display_name {cause=Icon}
[model_identifier] Attribute: Individual: model_identifier {cause=display_name}
[target_schema] Attribute: Individual: target_schema {cause=model_identifier}
[llm_prompt_template] Attribute: Individual: llm_prompt_template {cause=target_schema}
[extraction_fields] Attribute: Individual: extraction_fields {cause=llm_prompt_template}

# ========================================
# THESAURUS ATTRIBUTES (for Model Term)
# ========================================
[definition] Attribute: Individual: definition {cause=extraction_fields}
[synonym] Attribute: Individual: synonym {cause=definition}
[importance] Attribute: Individual: importance {cause=synonym}
[domain_attr] Attribute: Individual: domain {cause=importance}

# ========================================
# CORE RELATIONS
# ========================================
[NewIndividual] Relation: Individual: NewIndividual {cause=Relation}
[EditIndividual] Relation: Individual: EditIndividual {cause=NewIndividual}
[Attributes] Relation: Individual: Attributes {cause=EditIndividual}
[Relations] Relation: Individual: Relations {cause=Attributes}
[Roles] Relation: Individual: Roles {cause=Relations}
[Models] Relation: Individual: Models {cause=Roles}
[Vocabularies] Relation: Individual: Vocabularies {cause=Models}
[ViewLink] Relation: Individual: ViewLink {cause=Vocabularies}
[IndividualID] Relation: Individual: IndividualID {cause=ViewLink}

# ========================================
# SCHEMA RELATION ATTRIBUTES
# ========================================
[term] Relation: Individual: term {cause=IndividualID}
[includes] Relation: Individual: includes {cause=term}
[target] Relation: Individual: target {cause=includes}
[comparator] Relation: Individual: comparator {cause=target}
[criterion] Relation: Individual: criterion {cause=comparator}
[advantage] Relation: Individual: advantage {cause=criterion}
[cause_rel] Relation: Individual: cause {cause=advantage}
[effect] Relation: Individual: effect {cause=cause_rel}
[domain] Relation: Individual: domain {cause=effect}
[illustrates] Relation: Individual: illustrates {cause=domain}
[system_terms] Relation: Individual: system_terms {cause=illustrates}
[purpose_terms] Relation: Individual: purpose_terms {cause=system_terms}
[interfaces_terms] Relation: Individual: interfaces_terms {cause=purpose_terms}
[pattern_terms] Relation: Individual: pattern_terms {cause=interfaces_terms}
[input_types] Relation: Individual: input_types {cause=pattern_terms}
[output_types] Relation: Individual: output_types {cause=input_types}
[process_category] Relation: Individual: process_category {cause=output_types}
[involves_components] Relation: Individual: involves_components {cause=process_category}
[demonstrates] Relation: Individual: demonstrates {cause=involves_components}
[problem_domain] Relation: Individual: problem_domain {cause=demonstrates}
[solution_components] Relation: Individual: solution_components {cause=problem_domain}
[alternative_solutions] Relation: Individual: alternative_solutions {cause=solution_components}
[actors] Relation: Individual: actors {cause=alternative_solutions}
[concept_ref] Relation: Individual: concept_ref {cause=actors}
[technologies] Relation: Individual: technologies {cause=concept_ref}
[key_features] Relation: Individual: key_features {cause=technologies}
[language] Relation: Individual: language {cause=key_features}
[keywords] Relation: Individual: keywords {cause=language}
[category] Relation: Individual: category {cause=keywords}
[items] Relation: Individual: items {cause=category}
[rows] Relation: Individual: rows {cause=items}
[columns] Relation: Individual: columns {cause=rows}
[values] Relation: Individual: values {cause=columns}
[advantages] Relation: Individual: advantages {cause=values}
[disadvantages] Relation: Individual: disadvantages {cause=advantages}

# ========================================
# THESAURUS RELATIONS
# ========================================
[broader] Relation: Individual: broader {cause=disadvantages}
[related] Relation: Individual: related {cause=broader}

# ========================================
# DOCUMENT RELATIONS
# ========================================
[author] Relation: Individual: author {cause=related}
[source] Relation: Individual: source {cause=author}
[belongs_to] Relation: Individual: belongs_to {cause=source}

# ========================================
# CLASSIFIER RELATIONS
# ========================================
[classifier] Relation: Individual: classifier {cause=belongs_to}

# ========================================
# CORE ROLES
# ========================================
[Admin] Role: Individual: Admin {cause=Role}
[Owner] Role: Individual: Owner {cause=Admin}
[admin] Role: Individual: admin {cause=Owner}
[manager] Role: Individual: manager {cause=admin}

# ========================================
# ENTITY TYPES (matching frontend order)
# ========================================
[Entity] Event: Instance: Entity {cause=Role}
[Vocabulary] Entity: Instance: Vocabulary {cause=Entity}
[Application] Entity: Instance: Application {cause=Vocabulary}
[Organization] Entity: Instance: Organization {cause=Application}
[View] Entity: Instance: View {cause=Organization}
[Schema] Entity: Instance: Schema {cause=View}
[SchemaInstruction] Entity: Instance: SchemaInstruction {cause=Schema}
[Term] Entity: Instance: Term {cause=SchemaInstruction}
[Fragment] Entity: Instance: Fragment {cause=Term}
[Author] Entity: Instance: Author {cause=Fragment}
[Document] Entity: Instance: Document {cause=Author}
[Classifier] Entity: Instance: Classifier {cause=Document}
[Category] Entity: Instance: Category {cause=Classifier}

# ========================================
# ENTITY MODELS
# ========================================
[Model_Vocabulary] Vocabulary: Model: Model_Vocabulary {cause=Vocabulary}
[Model_Application] Application: Model: Model_Application {cause=Application}
[OrganizationModel] Organization: Model: OrganizationModel {cause=Organization}
[Model_View] View: Model: Model_View {cause=View}
[Model_Schema] Schema: Model: Model_Schema {cause=Schema}
[Model_SchemaInstruction] SchemaInstruction: Model: Model_SchemaInstruction {cause=SchemaInstruction}
[Model_Term] Term: Model: Model_Term {cause=Term}
[Model_Fragment] Fragment: Model: Model_Fragment {cause=Fragment}
[Model_Author] Author: Model: Model_Author {cause=Author}
[Model_Document] Document: Model: Model_Document {cause=Document}
[Model_Classifier] Classifier: Model: Model_Classifier {cause=Classifier}
[Model_Category] Category: Model: Model_Category {cause=Category}

# ========================================
# SYSTEM INDIVIDUALS
# ========================================
[ThisOrganization] Organization: Individual: ThisOrganization {cause=Organization, model=OrganizationModel}
[SystemProperties] Vocabulary: Individual: SystemProperties {cause=Vocabulary, model=Model_Vocabulary}
[ViewProperties] Vocabulary: Individual: View Properties {cause=SystemProperties, model=Model_Vocabulary}
[RolesVoc] Vocabulary: Individual: RolesVoc {cause=ViewProperties, model=Model_Vocabulary}
[OrganizationApp] Application: Individual: Organization App {cause=Application, model=Model_Application}

# ========================================
# SCHEMA INSTRUCTION INDIVIDUALS
# ========================================
[def_instruction] SchemaInstruction: Individual: def_instruction {cause=SchemaInstruction, model=Model_SchemaInstruction}
[comp_instruction] SchemaInstruction: Individual: comp_instruction {cause=def_instruction, model=Model_SchemaInstruction}
[causal_instruction] SchemaInstruction: Individual: causal_instruction {cause=comp_instruction, model=Model_SchemaInstruction}
[context_instruction] SchemaInstruction: Individual: context_instruction {cause=causal_instruction, model=Model_SchemaInstruction}
[example_instruction] SchemaInstruction: Individual: example_instruction {cause=context_instruction, model=Model_SchemaInstruction}
[arch_comp_instruction] SchemaInstruction: Individual: arch_comp_instruction {cause=example_instruction, model=Model_SchemaInstruction}
[tech_proc_instruction] SchemaInstruction: Individual: tech_proc_instruction {cause=arch_comp_instruction, model=Model_SchemaInstruction}
[algorithm_instruction] SchemaInstruction: Individual: algorithm_instruction {cause=tech_proc_instruction, model=Model_SchemaInstruction}
[concept_model_instruction] SchemaInstruction: Individual: concept_model_instruction {cause=algorithm_instruction, model=Model_SchemaInstruction}
[principle_instruction] SchemaInstruction: Individual: principle_instruction {cause=concept_model_instruction, model=Model_SchemaInstruction}
[problem_sol_instruction] SchemaInstruction: Individual: problem_sol_instruction {cause=principle_instruction, model=Model_SchemaInstruction}
[limitations_instruction] SchemaInstruction: Individual: limitations_instruction {cause=problem_sol_instruction, model=Model_SchemaInstruction}
[functionality_instruction] SchemaInstruction: Individual: functionality_instruction {cause=limitations_instruction, model=Model_SchemaInstruction}
[capabilities_instruction] SchemaInstruction: Individual: capabilities_instruction {cause=functionality_instruction, model=Model_SchemaInstruction}
[integration_instruction] SchemaInstruction: Individual: integration_instruction {cause=capabilities_instruction, model=Model_SchemaInstruction}
[interaction_instruction] SchemaInstruction: Individual: interaction_instruction {cause=integration_instruction, model=Model_SchemaInstruction}
[usecase_instruction] SchemaInstruction: Individual: usecase_instruction {cause=interaction_instruction, model=Model_SchemaInstruction}
[implementation_instruction] SchemaInstruction: Individual: implementation_instruction {cause=usecase_instruction, model=Model_SchemaInstruction}
[code_instruction] SchemaInstruction: Individual: code_instruction {cause=implementation_instruction, model=Model_SchemaInstruction}
[enum_instruction] SchemaInstruction: Individual: enum_instruction {cause=code_instruction, model=Model_SchemaInstruction}
[table_instruction] SchemaInstruction: Individual: table_instruction {cause=enum_instruction, model=Model_SchemaInstruction}
[adv_disadv_instruction] SchemaInstruction: Individual: adv_disadv_instruction {cause=table_instruction, model=Model_SchemaInstruction}

# ========================================
# SCHEMA MODELS (for Fragment extraction)
# ========================================
[Definition] Schema: Model: Definition {cause=def_instruction, model=Model_Schema}
[Comparison] Schema: Model: Comparison {cause=comp_instruction, model=Model_Schema}
[CausalRelation] Schema: Model: CausalRelation {cause=causal_instruction, model=Model_Schema}
[ApplicationContext] Schema: Model: ApplicationContext {cause=context_instruction, model=Model_Schema}
[ExampleSchema] Schema: Model: Example {cause=example_instruction, model=Model_Schema}
[ArchitecturalComponent] Schema: Model: ArchitecturalComponent {cause=arch_comp_instruction, model=Model_Schema}
[TechnicalProcess] Schema: Model: TechnicalProcess {cause=tech_proc_instruction, model=Model_Schema}
[Algorithm] Schema: Model: Algorithm {cause=algorithm_instruction, model=Model_Schema}
[ConceptualModel] Schema: Model: ConceptualModel {cause=concept_model_instruction, model=Model_Schema}
[Principle] Schema: Model: Principle {cause=principle_instruction, model=Model_Schema}
[ProblemSolution] Schema: Model: ProblemSolution {cause=problem_sol_instruction, model=Model_Schema}
[LimitationsAndChallenges] Schema: Model: LimitationsAndChallenges {cause=limitations_instruction, model=Model_Schema}
[Functionality] Schema: Model: Functionality {cause=functionality_instruction, model=Model_Schema}
[Capabilities] Schema: Model: Capabilities {cause=capabilities_instruction, model=Model_Schema}
[SystemIntegration] Schema: Model: SystemIntegration {cause=integration_instruction, model=Model_Schema}
[ComponentInteraction] Schema: Model: ComponentInteraction {cause=interaction_instruction, model=Model_Schema}
[UseCase] Schema: Model: UseCase {cause=usecase_instruction, model=Model_Schema}
[ConceptImplementation] Schema: Model: ConceptImplementation {cause=implementation_instruction, model=Model_Schema}
[CodeSnippet] Schema: Model: CodeSnippet {cause=code_instruction, model=Model_Schema}
[Enumeration] Schema: Model: Enumeration {cause=enum_instruction, model=Model_Schema}
[TableAnalysis] Schema: Model: TableAnalysis {cause=table_instruction, model=Model_Schema}
[AdvantageDisadvantage] Schema: Model: AdvantageDisadvantage {cause=adv_disadv_instruction, model=Model_Schema}

# ========================================
# SCHEMA INSTRUCTION PROPERTIES
# Property events: [ID] Individual: AttributeName: Value
# ========================================

# Definition instruction
[def_instruction_dn] def_instruction: display_name: Определение {model=Model_SchemaInstruction}
[def_instruction_ts] def_instruction: target_schema: Definition {model=Model_SchemaInstruction}
[def_instruction_pt] def_instruction: llm_prompt_template: Извлеки определения: target (определяемый термин), includes (компоненты определения) {model=Model_SchemaInstruction}
[def_instruction_ef] def_instruction: extraction_fields: target, includes {model=Model_SchemaInstruction}

# Comparison instruction
[comp_instruction_dn] comp_instruction: display_name: Сравнение {model=Model_SchemaInstruction}
[comp_instruction_ts] comp_instruction: target_schema: Comparison {model=Model_SchemaInstruction}
[comp_instruction_pt] comp_instruction: llm_prompt_template: Извлеки сравнение: target (первый объект), comparator (второй объект), criterion (критерии), advantage (преимущества) {model=Model_SchemaInstruction}
[comp_instruction_ef] comp_instruction: extraction_fields: target, comparator, criterion, advantage {model=Model_SchemaInstruction}

# Causal instruction
[causal_instruction_dn] causal_instruction: display_name: Причинно-следственная связь {model=Model_SchemaInstruction}
[causal_instruction_ts] causal_instruction: target_schema: CausalRelation {model=Model_SchemaInstruction}
[causal_instruction_pt] causal_instruction: llm_prompt_template: Извлеки причинно-следственную связь: cause (причины), effect (следствия) {model=Model_SchemaInstruction}
[causal_instruction_ef] causal_instruction: extraction_fields: cause, effect {model=Model_SchemaInstruction}

# Context instruction
[context_instruction_dn] context_instruction: display_name: Контекст применения {model=Model_SchemaInstruction}
[context_instruction_ts] context_instruction: target_schema: ApplicationContext {model=Model_SchemaInstruction}
[context_instruction_pt] context_instruction: llm_prompt_template: Извлеки контекст применения: domain (области применения) {model=Model_SchemaInstruction}
[context_instruction_ef] context_instruction: extraction_fields: domain {model=Model_SchemaInstruction}

# Example instruction
[example_instruction_dn] example_instruction: display_name: Пример {model=Model_SchemaInstruction}
[example_instruction_ts] example_instruction: target_schema: Example {model=Model_SchemaInstruction}
[example_instruction_pt] example_instruction: llm_prompt_template: Извлеки пример: illustrates (что иллюстрирует), type (тип примера: code, scenario, analogy) {model=Model_SchemaInstruction}
[example_instruction_ef] example_instruction: extraction_fields: illustrates, type {model=Model_SchemaInstruction}

# Architectural component instruction
[arch_comp_instruction_dn] arch_comp_instruction: display_name: Архитектурный компонент {model=Model_SchemaInstruction}
[arch_comp_instruction_ts] arch_comp_instruction: target_schema: ArchitecturalComponent {model=Model_SchemaInstruction}
[arch_comp_instruction_pt] arch_comp_instruction: llm_prompt_template: Извлеки архитектурный компонент: system_terms (система), purpose_terms (назначение), interfaces_terms (интерфейсы), pattern_terms (паттерны) {model=Model_SchemaInstruction}
[arch_comp_instruction_ef] arch_comp_instruction: extraction_fields: system_terms, purpose_terms, interfaces_terms, pattern_terms {model=Model_SchemaInstruction}

# Technical process instruction
[tech_proc_instruction_dn] tech_proc_instruction: display_name: Технический процесс {model=Model_SchemaInstruction}
[tech_proc_instruction_ts] tech_proc_instruction: target_schema: TechnicalProcess {model=Model_SchemaInstruction}
[tech_proc_instruction_pt] tech_proc_instruction: llm_prompt_template: Извлеки технический процесс: input_types (входные типы), output_types (выходные типы), process_category (категория), involves_components (компоненты) {model=Model_SchemaInstruction}
[tech_proc_instruction_ef] tech_proc_instruction: extraction_fields: input_types, output_types, process_category, involves_components {model=Model_SchemaInstruction}

# Algorithm instruction
[algorithm_instruction_dn] algorithm_instruction: display_name: Алгоритм/Метод {model=Model_SchemaInstruction}
[algorithm_instruction_ts] algorithm_instruction: target_schema: Algorithm {model=Model_SchemaInstruction}
[algorithm_instruction_pt] algorithm_instruction: llm_prompt_template: Извлеки алгоритм: input_types (входы), output_types (выходы), involves_components (концепты), process_category (тип алгоритма) {model=Model_SchemaInstruction}
[algorithm_instruction_ef] algorithm_instruction: extraction_fields: input_types, output_types, involves_components, process_category {model=Model_SchemaInstruction}

# Conceptual model instruction
[concept_model_instruction_dn] concept_model_instruction: display_name: Концептуальная модель {model=Model_SchemaInstruction}
[concept_model_instruction_ts] concept_model_instruction: target_schema: ConceptualModel {model=Model_SchemaInstruction}
[concept_model_instruction_pt] concept_model_instruction: llm_prompt_template: Извлеки концептуальную модель: target (центральный концепт), involves_components (связанные концепты) {model=Model_SchemaInstruction}
[concept_model_instruction_ef] concept_model_instruction: extraction_fields: target, involves_components {model=Model_SchemaInstruction}

# Principle instruction
[principle_instruction_dn] principle_instruction: display_name: Принцип/Подход {model=Model_SchemaInstruction}
[principle_instruction_ts] principle_instruction: target_schema: Principle {model=Model_SchemaInstruction}
[principle_instruction_pt] principle_instruction: llm_prompt_template: Извлеки принцип: target (принцип), domain (применение), comparator (контраст), demonstrates (результаты) {model=Model_SchemaInstruction}
[principle_instruction_ef] principle_instruction: extraction_fields: target, domain, comparator, demonstrates {model=Model_SchemaInstruction}

# Problem solution instruction
[problem_sol_instruction_dn] problem_sol_instruction: display_name: Проблема и решение {model=Model_SchemaInstruction}
[problem_sol_instruction_ts] problem_sol_instruction: target_schema: ProblemSolution {model=Model_SchemaInstruction}
[problem_sol_instruction_pt] problem_sol_instruction: llm_prompt_template: Извлеки проблему и решение: problem_domain (проблема), solution_components (решение), alternative_solutions (альтернативы), keywords (термины) {model=Model_SchemaInstruction}
[problem_sol_instruction_ef] problem_sol_instruction: extraction_fields: problem_domain, solution_components, alternative_solutions, keywords {model=Model_SchemaInstruction}

# Limitations instruction
[limitations_instruction_dn] limitations_instruction: display_name: Ограничения и вызовы {model=Model_SchemaInstruction}
[limitations_instruction_ts] limitations_instruction: target_schema: LimitationsAndChallenges {model=Model_SchemaInstruction}
[limitations_instruction_pt] limitations_instruction: llm_prompt_template: Извлеки ограничения: target (объект), problem_domain (типы ограничений) {model=Model_SchemaInstruction}
[limitations_instruction_ef] limitations_instruction: extraction_fields: target, problem_domain {model=Model_SchemaInstruction}

# Functionality instruction
[functionality_instruction_dn] functionality_instruction: display_name: Функциональность {model=Model_SchemaInstruction}
[functionality_instruction_ts] functionality_instruction: target_schema: Functionality {model=Model_SchemaInstruction}
[functionality_instruction_pt] functionality_instruction: llm_prompt_template: Извлеки функциональность: system_terms (система), purpose_terms (функции), involves_components (зависимости) {model=Model_SchemaInstruction}
[functionality_instruction_ef] functionality_instruction: extraction_fields: system_terms, purpose_terms, involves_components {model=Model_SchemaInstruction}

# Capabilities instruction
[capabilities_instruction_dn] capabilities_instruction: display_name: Возможности {model=Model_SchemaInstruction}
[capabilities_instruction_ts] capabilities_instruction: target_schema: Capabilities {model=Model_SchemaInstruction}
[capabilities_instruction_pt] capabilities_instruction: llm_prompt_template: Извлеки возможности: target (объект), purpose_terms (типы возможностей), demonstrates (сценарии) {model=Model_SchemaInstruction}
[capabilities_instruction_ef] capabilities_instruction: extraction_fields: target, purpose_terms, demonstrates {model=Model_SchemaInstruction}

# Integration instruction
[integration_instruction_dn] integration_instruction: display_name: Интеграция систем {model=Model_SchemaInstruction}
[integration_instruction_ts] integration_instruction: target_schema: SystemIntegration {model=Model_SchemaInstruction}
[integration_instruction_pt] integration_instruction: llm_prompt_template: Извлеки интеграцию: target (основная система), comparator (интегрируемая), interfaces_terms (точки интеграции), process_category (метод) {model=Model_SchemaInstruction}
[integration_instruction_ef] integration_instruction: extraction_fields: target, comparator, interfaces_terms, process_category {model=Model_SchemaInstruction}

# Interaction instruction
[interaction_instruction_dn] interaction_instruction: display_name: Взаимодействие компонентов {model=Model_SchemaInstruction}
[interaction_instruction_ts] interaction_instruction: target_schema: ComponentInteraction {model=Model_SchemaInstruction}
[interaction_instruction_pt] interaction_instruction: llm_prompt_template: Извлеки взаимодействие: target (инициатор), comparator (цель), process_category (тип), involves_components (посредники) {model=Model_SchemaInstruction}
[interaction_instruction_ef] interaction_instruction: extraction_fields: target, comparator, process_category, involves_components {model=Model_SchemaInstruction}

# Usecase instruction
[usecase_instruction_dn] usecase_instruction: display_name: Сценарий использования {model=Model_SchemaInstruction}
[usecase_instruction_ts] usecase_instruction: target_schema: UseCase {model=Model_SchemaInstruction}
[usecase_instruction_pt] usecase_instruction: llm_prompt_template: Извлеки сценарий: domain (область), actors (участники), demonstrates (демонстрирует) {model=Model_SchemaInstruction}
[usecase_instruction_ef] usecase_instruction: extraction_fields: domain, actors, demonstrates {model=Model_SchemaInstruction}

# Implementation instruction
[implementation_instruction_dn] implementation_instruction: display_name: Реализация концепции {model=Model_SchemaInstruction}
[implementation_instruction_ts] implementation_instruction: target_schema: ConceptImplementation {model=Model_SchemaInstruction}
[implementation_instruction_pt] implementation_instruction: llm_prompt_template: Извлеки реализацию: concept_ref (концепт), technologies (технологии), key_features (особенности) {model=Model_SchemaInstruction}
[implementation_instruction_ef] implementation_instruction: extraction_fields: concept_ref, technologies, key_features {model=Model_SchemaInstruction}

# Code instruction
[code_instruction_dn] code_instruction: display_name: Фрагмент кода {model=Model_SchemaInstruction}
[code_instruction_ts] code_instruction: target_schema: CodeSnippet {model=Model_SchemaInstruction}
[code_instruction_pt] code_instruction: llm_prompt_template: Извлеки код: language (язык), illustrates (демонстрирует), input_types (входы), output_types (выходы), keywords (термины) {model=Model_SchemaInstruction}
[code_instruction_ef] code_instruction: extraction_fields: language, illustrates, input_types, output_types, keywords {model=Model_SchemaInstruction}

# Enum instruction
[enum_instruction_dn] enum_instruction: display_name: Перечисление/Список {model=Model_SchemaInstruction}
[enum_instruction_ts] enum_instruction: target_schema: Enumeration {model=Model_SchemaInstruction}
[enum_instruction_pt] enum_instruction: llm_prompt_template: Извлеки список: category (категория), items (элементы), keywords (термины) {model=Model_SchemaInstruction}
[enum_instruction_ef] enum_instruction: extraction_fields: category, items, keywords {model=Model_SchemaInstruction}

# Table instruction
[table_instruction_dn] table_instruction: display_name: Таблица/Матрица {model=Model_SchemaInstruction}
[table_instruction_ts] table_instruction: target_schema: TableAnalysis {model=Model_SchemaInstruction}
[table_instruction_pt] table_instruction: llm_prompt_template: Извлеки таблицу: rows (строки), columns (столбцы), values (значения), keywords (термины) {model=Model_SchemaInstruction}
[table_instruction_ef] table_instruction: extraction_fields: rows, columns, values, keywords {model=Model_SchemaInstruction}

# Advantage/Disadvantage instruction
[adv_disadv_instruction_dn] adv_disadv_instruction: display_name: Преимущества и недостатки {model=Model_SchemaInstruction}
[adv_disadv_instruction_ts] adv_disadv_instruction: target_schema: AdvantageDisadvantage {model=Model_SchemaInstruction}
[adv_disadv_instruction_pt] adv_disadv_instruction: llm_prompt_template: Извлеки преимущества и недостатки: target (объект), advantages (плюсы), disadvantages (минусы), keywords (термины) {model=Model_SchemaInstruction}
[adv_disadv_instruction_ef] adv_disadv_instruction: extraction_fields: target, advantages, disadvantages, keywords {model=Model_SchemaInstruction}
