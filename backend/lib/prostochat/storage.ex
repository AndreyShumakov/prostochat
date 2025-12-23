defmodule Prostochat.Storage do
  @moduledoc """
  Mnesia-based event storage for Prostochat.
  Implements BSL event graph with unified genesis events.
  """
  use GenServer
  alias Prostochat.Event
  require Logger

  # Genesis events - unified with frontend
  # Format: {id, base, type, value, model, cause, actor}
  @genesis_events [
    # === ROOT BOOTSTRAP ===
    {"Event", "Event", "Event", "Event", "Event", "Event", "System"},
    {"Delete", "Event", "Instance", "Delete", "Event", "Event", "System"},
    {"Instance", "Event", "Instance", "Instance", "Event", "Delete", "System"},
    {"Actor", "Event", "Instance", "Actor", "Event", "Event", "System"},
    {"Concept", "Event", "Instance", "Concept", "Event", "Actor", "System"},
    {"Model", "Event", "Instance", "Model", "Event", "Concept", "System"},
    {"Individual", "Event", "Instance", "Individual", "Event", "Model", "System"},
    {"Attribute", "Event", "Instance", "Attribute", "Event", "Individual", "System"},
    {"Relation", "Event", "Instance", "Relation", "Event", "Attribute", "System"},
    {"Role", "Event", "Instance", "Role", "Event", "Relation", "System"},
    {"Restriction", "Event", "Instance", "Restriction", "Event", "Role", "System"},

    # === RESTRICTIONS ===
    {"Domain", "Restriction", "Individual", "Domain", "Event", "Restriction", "System"},
    {"DataType", "Restriction", "Individual", "DataType", "Event", "Domain", "System"},
    {"Range", "Restriction", "Individual", "Range", "Event", "DataType", "System"},
    {"Required", "Restriction", "Individual", "Required", "Event", "Range", "System"},
    {"Multiple", "Restriction", "Individual", "Multiple", "Event", "Required", "System"},
    {"Immutable", "Restriction", "Individual", "Immutable", "Event", "Multiple", "System"},

    # === DATA TYPES ===
    {"BasicType", "DataType", "Individual", "BasicType", "Event", "DataType", "System"},
    {"TextType", "DataType", "Individual", "TextType", "Event", "BasicType", "System"},
    {"Numeric", "DataType", "Individual", "Numeric", "Event", "TextType", "System"},
    {"EnumType", "DataType", "Individual", "EnumType", "Event", "Numeric", "System"},
    {"Boolean", "DataType", "Individual", "Boolean", "Event", "EnumType", "System"},
    {"Expression", "DataType", "Individual", "Expression", "Event", "Boolean", "System"},
    {"DateTime", "DataType", "Individual", "DateTime", "Event", "Expression", "System"},
    {"Duration", "DataType", "Individual", "Duration", "Event", "DateTime", "System"},
    {"PDFType", "DataType", "Individual", "PDFType", "Event", "Duration", "System"},

    # === MORE RESTRICTIONS ===
    {"AttributeValue", "Restriction", "Individual", "AttributeValue", "Event", "Immutable", "System"},
    {"Condition", "Restriction", "Individual", "Condition", "Event", "AttributeValue", "System"},
    {"ValueCondition", "Restriction", "Individual", "ValueCondition", "Event", "Condition", "System"},
    {"Permission", "Restriction", "Individual", "Permission", "Event", "ValueCondition", "System"},
    {"SetValue", "Restriction", "Individual", "SetValue", "Event", "Permission", "System"},
    {"Unique", "Restriction", "Individual", "Unique", "Event", "SetValue", "System"},
    {"UniqueIdentifier", "Restriction", "Individual", "UniqueIdentifier", "Event", "Unique", "System"},
    {"SetRange", "Restriction", "Individual", "SetRange", "Event", "UniqueIdentifier", "System"},
    {"Default", "Restriction", "Individual", "Default", "Event", "SetRange", "System"},
    {"Cardinality", "Restriction", "Individual", "Cardinality", "Event", "Default", "System"},
    {"Mutable", "Restriction", "Individual", "Mutable", "Event", "Cardinality", "System"},

    # === META MODELS ===
    {"Model_Event", "Event", "Model", "Model_Event", "Event", "Event", "System"},
    {"Model_Entity", "Entity", "Model", "Model_Entity", "Event", "Entity", "System"},
    {"Model_Actor", "Actor", "Model", "Model_Actor", "Event", "Actor", "System"},
    {"Model_Relation", "Relation", "Model", "Model_Relation", "Event", "Relation", "System"},
    {"Model_Datatype", "DataType", "Model", "Model_Datatype", "Event", "DataType", "System"},
    {"Model_Attribute", "Attribute", "Model", "Model_Attribute", "Event", "Attribute", "System"},
    {"Model_Role", "Role", "Model", "Model_Role", "Event", "Role", "System"},

    # === SYSTEM ACTORS ===
    {"system", "Actor", "Individual", "system", "Event", "Actor", "System"},
    {"engine", "Actor", "Individual", "engine", "Event", "system", "System"},
    {"guest", "Actor", "Individual", "guest", "Event", "engine", "System"},

    # === SYSTEM ATTRIBUTES ===
    {"CreateIndividual", "Attribute", "Individual", "CreateIndividual", "Event", "Attribute", "System"},
    {"SetEntity", "Attribute", "Individual", "SetEntity", "Event", "CreateIndividual", "System"},
    {"SetModel", "Attribute", "Individual", "SetModel", "Event", "SetEntity", "System"},
    {"SetLabel", "Attribute", "Individual", "SetLabel", "Event", "SetModel", "System"},
    {"Apply", "Attribute", "Individual", "Apply", "Event", "SetLabel", "System"},
    {"delete", "Attribute", "Individual", "deleted", "Event", "Apply", "System"},

    # === DELETED DATATYPE ===
    {"deleted", "DataType", "Numeric", "deleted", "Event", "deleted", "System"},

    # === SYSTEM RELATIONS ===
    {"NewIndividual", "Relation", "Individual", "NewIndividual", "Event", "Relation", "System"},
    {"EditIndividual", "Relation", "Individual", "EditIndividual", "Event", "NewIndividual", "System"},

    # === SYSTEM ROLES ===
    {"Admin", "Role", "Individual", "Admin", "Event", "Role", "System"},
    {"Owner", "Role", "Individual", "Owner", "Event", "Admin", "System"},

    # === ENTITY: VOCABULARY ===
    {"Vocabulary", "Entity", "Instance", "Vocabulary", "Event", "Entity", "System"},
    {"Model_Vocabulary", "Model", "Model", "Model_Vocabulary", "Event", "Vocabulary", "System"},

    # === MORE RELATIONS ===
    {"Attributes", "Relation", "Individual", "Attributes", "Event", "EditIndividual", "System"},
    {"Relations", "Relation", "Individual", "Relations", "Event", "Attributes", "System"},

    # === DESCRIPTION ATTRIBUTE ===
    {"Description", "Attribute", "Individual", "Description", "Event", "delete", "System"},

    # === MORE RELATIONS ===
    {"Roles", "Relation", "Individual", "Roles", "Event", "Relations", "System"},

    # === ENTITY: APPLICATION ===
    {"Application", "Entity", "Instance", "Application", "Event", "Vocabulary", "System"},
    {"Model_Application", "Model", "Model", "Model_Application", "Event", "Application", "System"},

    # === APPLICATION ATTRIBUTES ===
    {"Icon", "Attribute", "Individual", "Icon", "Event", "Model_Application", "System"},

    # === MORE RELATIONS ===
    {"Models", "Relation", "Individual", "Models", "Event", "Icon", "System"},
    {"Vocabularies", "Relation", "Individual", "Vocabularies", "Event", "Models", "System"},

    # === ENTITY: ORGANIZATION ===
    {"Organization", "Entity", "Instance", "Organization", "Event", "Application", "System"},
    {"OrganizationModel", "Organization", "Model", "OrganizationModel", "Event", "Organization", "System"},
    {"ThisOrganization", "Organization", "Individual", "ThisOrganization", "OrganizationModel", "Organization", "System"},

    # === VOCABULARY INDIVIDUALS ===
    {"SystemProperties", "Vocabulary", "Individual", "SystemProperties", "Model_Vocabulary", "Vocabulary", "System"},
    {"ViewProperties", "Vocabulary", "Individual", "View Properties", "Model_Vocabulary", "SystemProperties", "system"},

    # === ENTITY: VIEW ===
    {"View", "Entity", "Instance", "View", "Event", "Organization", "system"},
    {"Model_View", "View", "Model", "Model_View", "Event", "View", "system"},

    # === VIEW RELATIONS ===
    {"ViewLink", "Relation", "Individual", "ViewLink", "Event", "Vocabularies", "system"},
    {"IndividualID", "Relation", "Individual", "IndividualID", "Event", "ViewLink", "system"},

    # === VIEW ATTRIBUTES ===
    {"EntityPage", "Attribute", "Individual", "EntityPage", "Event", "Description", "system"},
    {"ViewIndividual", "Attribute", "Individual", "ViewIndividual", "Event", "EntityPage", "system"},
    {"Include", "Attribute", "Individual", "Include", "Event", "ViewIndividual", "system"},
    {"Exclude", "Attribute", "Individual", "Exclude", "Event", "Include", "system"},
    {"ViewEntity", "Attribute", "Individual", "ViewEntity", "Event", "Exclude", "system"},
    {"ViewMode", "Attribute", "Individual", "ViewMode", "Event", "ViewEntity", "system"},
    {"Control", "Attribute", "Individual", "Control", "Event", "ViewMode", "system"},
    {"Value", "Attribute", "Individual", "Value", "Event", "Control", "system"},
    {"Title", "Attribute", "Individual", "Title", "Event", "Value", "system"},
    {"Block", "Attribute", "Individual", "Block", "Event", "Title", "system"},
    {"ControlType", "Attribute", "Individual", "ControlType", "Event", "Block", "system"},

    # === MARKDOWN DATATYPE ===
    {"MarkdownType", "DataType", "Individual", "MarkdownType", "Event", "PDFType", "system"},

    # === VIEW ACTOR ===
    {"view", "Actor", "Individual", "view", "Event", "guest", "system"},

    # === ROLES VOCABULARY ===
    {"RolesVoc", "Vocabulary", "Individual", "RolesVoc", "Model_Vocabulary", "ViewProperties", "system"},

    # === MORE ROLES ===
    {"admin", "Role", "Individual", "admin", "Event", "Owner", "system"},
    {"manager", "Role", "Individual", "manager", "Event", "admin", "system"},

    # === ORGANIZATION APP ===
    {"OrganizationApp", "Application", "Individual", "Organization App", "Model_Application", "Application", "system"},

    # === SEMANTIC SCHEMA ENTITIES ===
    {"Schema", "Entity", "Instance", "Schema", "Event", "View", "system"},
    {"SchemaInstruction", "Entity", "Instance", "SchemaInstruction", "Event", "Schema", "system"},
    {"Term", "Entity", "Instance", "Term", "Event", "SchemaInstruction", "system"},
    {"Fragment", "Entity", "Instance", "Fragment", "Event", "Term", "system"},

    # === SCHEMA MODELS ===
    {"Model_Schema", "Schema", "Model", "Model_Schema", "Event", "Schema", "system"},
    {"Model_SchemaInstruction", "SchemaInstruction", "Model", "Model_SchemaInstruction", "Event", "SchemaInstruction", "system"},
    {"Model_Term", "Term", "Model", "Model_Term", "Event", "Term", "system"},
    {"Model_Fragment", "Fragment", "Model", "Model_Fragment", "Event", "Fragment", "system"},

    # === SCHEMA INSTRUCTION ATTRIBUTES ===
    {"display_name", "Attribute", "Individual", "display_name", "Event", "ControlType", "system"},
    {"model_identifier", "Attribute", "Individual", "model_identifier", "Event", "display_name", "system"},
    {"llm_prompt_template", "Attribute", "Individual", "llm_prompt_template", "Event", "model_identifier", "system"},
    {"extraction_fields", "Attribute", "Individual", "extraction_fields", "Event", "llm_prompt_template", "system"},

    # === BASIC UNIVERSAL SCHEMAS - SchemaInstruction Individuals ===
    {"def_instruction", "SchemaInstruction", "Individual", "def_instruction", "Model_SchemaInstruction", "SchemaInstruction", "system"},
    {"comp_instruction", "SchemaInstruction", "Individual", "comp_instruction", "Model_SchemaInstruction", "def_instruction", "system"},
    {"causal_instruction", "SchemaInstruction", "Individual", "causal_instruction", "Model_SchemaInstruction", "comp_instruction", "system"},
    {"context_instruction", "SchemaInstruction", "Individual", "context_instruction", "Model_SchemaInstruction", "causal_instruction", "system"},
    {"example_instruction", "SchemaInstruction", "Individual", "example_instruction", "Model_SchemaInstruction", "context_instruction", "system"},

    # === ARCHITECTURAL-TECHNICAL SCHEMAS ===
    {"arch_comp_instruction", "SchemaInstruction", "Individual", "arch_comp_instruction", "Model_SchemaInstruction", "example_instruction", "system"},
    {"tech_proc_instruction", "SchemaInstruction", "Individual", "tech_proc_instruction", "Model_SchemaInstruction", "arch_comp_instruction", "system"},
    {"algorithm_instruction", "SchemaInstruction", "Individual", "algorithm_instruction", "Model_SchemaInstruction", "tech_proc_instruction", "system"},

    # === CONCEPTUAL SCHEMAS ===
    {"concept_model_instruction", "SchemaInstruction", "Individual", "concept_model_instruction", "Model_SchemaInstruction", "algorithm_instruction", "system"},
    {"principle_instruction", "SchemaInstruction", "Individual", "principle_instruction", "Model_SchemaInstruction", "concept_model_instruction", "system"},

    # === PROBLEM-ORIENTED SCHEMAS ===
    {"problem_sol_instruction", "SchemaInstruction", "Individual", "problem_sol_instruction", "Model_SchemaInstruction", "principle_instruction", "system"},
    {"limitations_instruction", "SchemaInstruction", "Individual", "limitations_instruction", "Model_SchemaInstruction", "problem_sol_instruction", "system"},

    # === FUNCTIONAL SCHEMAS ===
    {"functionality_instruction", "SchemaInstruction", "Individual", "functionality_instruction", "Model_SchemaInstruction", "limitations_instruction", "system"},
    {"capabilities_instruction", "SchemaInstruction", "Individual", "capabilities_instruction", "Model_SchemaInstruction", "functionality_instruction", "system"},

    # === INTEGRATION SCHEMAS ===
    {"integration_instruction", "SchemaInstruction", "Individual", "integration_instruction", "Model_SchemaInstruction", "capabilities_instruction", "system"},
    {"interaction_instruction", "SchemaInstruction", "Individual", "interaction_instruction", "Model_SchemaInstruction", "integration_instruction", "system"},

    # === APPLIED SCHEMAS ===
    {"usecase_instruction", "SchemaInstruction", "Individual", "usecase_instruction", "Model_SchemaInstruction", "interaction_instruction", "system"},
    {"implementation_instruction", "SchemaInstruction", "Individual", "implementation_instruction", "Model_SchemaInstruction", "usecase_instruction", "system"},
    {"code_instruction", "SchemaInstruction", "Individual", "code_instruction", "Model_SchemaInstruction", "implementation_instruction", "system"},
    {"enum_instruction", "SchemaInstruction", "Individual", "enum_instruction", "Model_SchemaInstruction", "code_instruction", "system"},
    {"table_instruction", "SchemaInstruction", "Individual", "table_instruction", "Model_SchemaInstruction", "enum_instruction", "system"},
    {"adv_disadv_instruction", "SchemaInstruction", "Individual", "adv_disadv_instruction", "Model_SchemaInstruction", "table_instruction", "system"},

    # === SCHEMA MODELS (for Fragment extraction) ===
    # Basic Universal
    {"Definition", "Schema", "Model", "Definition", "Model_Schema", "def_instruction", "system"},
    {"Comparison", "Schema", "Model", "Comparison", "Model_Schema", "comp_instruction", "system"},
    {"CausalRelation", "Schema", "Model", "CausalRelation", "Model_Schema", "causal_instruction", "system"},
    {"ApplicationContext", "Schema", "Model", "ApplicationContext", "Model_Schema", "context_instruction", "system"},
    {"ExampleSchema", "Schema", "Model", "Example", "Model_Schema", "example_instruction", "system"},

    # Architectural-Technical
    {"ArchitecturalComponent", "Schema", "Model", "ArchitecturalComponent", "Model_Schema", "arch_comp_instruction", "system"},
    {"TechnicalProcess", "Schema", "Model", "TechnicalProcess", "Model_Schema", "tech_proc_instruction", "system"},
    {"Algorithm", "Schema", "Model", "Algorithm", "Model_Schema", "algorithm_instruction", "system"},

    # Conceptual
    {"ConceptualModel", "Schema", "Model", "ConceptualModel", "Model_Schema", "concept_model_instruction", "system"},
    {"Principle", "Schema", "Model", "Principle", "Model_Schema", "principle_instruction", "system"},

    # Problem-Oriented
    {"ProblemSolution", "Schema", "Model", "ProblemSolution", "Model_Schema", "problem_sol_instruction", "system"},
    {"LimitationsAndChallenges", "Schema", "Model", "LimitationsAndChallenges", "Model_Schema", "limitations_instruction", "system"},

    # Functional
    {"Functionality", "Schema", "Model", "Functionality", "Model_Schema", "functionality_instruction", "system"},
    {"Capabilities", "Schema", "Model", "Capabilities", "Model_Schema", "capabilities_instruction", "system"},

    # Integration
    {"SystemIntegration", "Schema", "Model", "SystemIntegration", "Model_Schema", "integration_instruction", "system"},
    {"ComponentInteraction", "Schema", "Model", "ComponentInteraction", "Model_Schema", "interaction_instruction", "system"},

    # Applied
    {"UseCase", "Schema", "Model", "UseCase", "Model_Schema", "usecase_instruction", "system"},
    {"ConceptImplementation", "Schema", "Model", "ConceptImplementation", "Model_Schema", "implementation_instruction", "system"},
    {"CodeSnippet", "Schema", "Model", "CodeSnippet", "Model_Schema", "code_instruction", "system"},
    {"Enumeration", "Schema", "Model", "Enumeration", "Model_Schema", "enum_instruction", "system"},
    {"TableAnalysis", "Schema", "Model", "TableAnalysis", "Model_Schema", "table_instruction", "system"},
    {"AdvantageDisadvantage", "Schema", "Model", "AdvantageDisadvantage", "Model_Schema", "adv_disadv_instruction", "system"},

    # === SCHEMA RELATION ATTRIBUTES (for model fields) ===
    {"term", "Relation", "Individual", "term", "Event", "IndividualID", "system"},
    {"includes", "Relation", "Individual", "includes", "Event", "term", "system"},
    {"target", "Relation", "Individual", "target", "Event", "includes", "system"},
    {"comparator", "Relation", "Individual", "comparator", "Event", "target", "system"},
    {"criterion", "Relation", "Individual", "criterion", "Event", "comparator", "system"},
    {"advantage", "Relation", "Individual", "advantage", "Event", "criterion", "system"},
    {"cause_rel", "Relation", "Individual", "cause", "Event", "advantage", "system"},
    {"effect", "Relation", "Individual", "effect", "Event", "cause_rel", "system"},
    {"domain", "Relation", "Individual", "domain", "Event", "effect", "system"},
    {"illustrates", "Relation", "Individual", "illustrates", "Event", "domain", "system"},
    {"system_terms", "Relation", "Individual", "system_terms", "Event", "illustrates", "system"},
    {"purpose_terms", "Relation", "Individual", "purpose_terms", "Event", "system_terms", "system"},
    {"interfaces_terms", "Relation", "Individual", "interfaces_terms", "Event", "purpose_terms", "system"},
    {"pattern_terms", "Relation", "Individual", "pattern_terms", "Event", "interfaces_terms", "system"},
    {"input_types", "Relation", "Individual", "input_types", "Event", "pattern_terms", "system"},
    {"output_types", "Relation", "Individual", "output_types", "Event", "input_types", "system"},
    {"process_category", "Relation", "Individual", "process_category", "Event", "output_types", "system"},
    {"involves_components", "Relation", "Individual", "involves_components", "Event", "process_category", "system"},
    {"demonstrates", "Relation", "Individual", "demonstrates", "Event", "involves_components", "system"},
    {"problem_domain", "Relation", "Individual", "problem_domain", "Event", "demonstrates", "system"},
    {"solution_components", "Relation", "Individual", "solution_components", "Event", "problem_domain", "system"},
    {"alternative_solutions", "Relation", "Individual", "alternative_solutions", "Event", "solution_components", "system"},
    {"actors", "Relation", "Individual", "actors", "Event", "alternative_solutions", "system"},
    {"concept_ref", "Relation", "Individual", "concept_ref", "Event", "actors", "system"},
    {"technologies", "Relation", "Individual", "technologies", "Event", "concept_ref", "system"},
    {"key_features", "Relation", "Individual", "key_features", "Event", "technologies", "system"},
    {"language", "Relation", "Individual", "language", "Event", "key_features", "system"},
    {"keywords", "Relation", "Individual", "keywords", "Event", "language", "system"},
    {"category", "Relation", "Individual", "category", "Event", "keywords", "system"},
    {"items", "Relation", "Individual", "items", "Event", "category", "system"},
    {"rows", "Relation", "Individual", "rows", "Event", "items", "system"},
    {"columns", "Relation", "Individual", "columns", "Event", "rows", "system"},
    {"values", "Relation", "Individual", "values", "Event", "columns", "system"},
    {"advantages", "Relation", "Individual", "advantages", "Event", "values", "system"},
    {"disadvantages", "Relation", "Individual", "disadvantages", "Event", "advantages", "system"},

    # === ADDITIONAL ENTITIES: Author, Document, Classifier, Category ===
    {"Author", "Entity", "Instance", "Author", "Event", "Fragment", "system"},
    {"Document", "Entity", "Instance", "Document", "Event", "Author", "system"},
    {"Classifier", "Entity", "Instance", "Classifier", "Event", "Document", "system"},
    {"Category", "Entity", "Instance", "Category", "Event", "Classifier", "system"},

    # === MODELS FOR NEW ENTITIES ===
    {"Model_Author", "Author", "Model", "Model_Author", "Event", "Author", "system"},
    {"Model_Document", "Document", "Model", "Model_Document", "Event", "Document", "system"},
    {"Model_Classifier", "Classifier", "Model", "Model_Classifier", "Event", "Classifier", "system"},
    {"Model_Category", "Category", "Model", "Model_Category", "Event", "Category", "system"},

    # === THESAURUS ATTRIBUTES (for Model Term) ===
    {"definition", "Attribute", "Individual", "definition", "Event", "extraction_fields", "system"},
    {"synonym", "Attribute", "Individual", "synonym", "Event", "definition", "system"},
    {"importance", "Attribute", "Individual", "importance", "Event", "synonym", "system"},

    # === THESAURUS RELATIONS (for Model Term) ===
    {"broader", "Relation", "Individual", "broader", "Event", "disadvantages", "system"},
    {"related", "Relation", "Individual", "related", "Event", "broader", "system"},

    # === DOCUMENT RELATIONS ===
    {"author", "Relation", "Individual", "author", "Event", "related", "system"},
    {"source", "Relation", "Individual", "source", "Event", "author", "system"},
    {"belongs_to", "Relation", "Individual", "belongs_to", "Event", "source", "system"},

    # === CLASSIFIER RELATIONS (for Model Category) ===
    {"classifier", "Relation", "Individual", "classifier", "Event", "belongs_to", "system"}
  ]

  # Client API

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @doc "Append a new event"
  def append(event_data) when is_map(event_data) do
    GenServer.call(__MODULE__, {:append, event_data})
  end

  @doc "Get event by ID"
  def get(id) do
    case :mnesia.dirty_read(:events, id) do
      [record] -> {:ok, Event.from_record(record)}
      [] -> {:error, :not_found}
    end
  end

  @doc "List all events with optional filters"
  def list(opts \\ []) do
    try do
      :mnesia.dirty_match_object({:events, :_, :_, :_, :_, :_, :_, :_, :_, :_})
      |> Enum.map(&Event.from_record/1)
      |> filter_events(opts)
      |> Enum.sort_by(& &1.date)
    rescue
      _ -> []
    catch
      :exit, _ -> []
    end
  end

  @doc "Get events since timestamp"
  def get_since(since) when is_binary(since) do
    list()
    |> Enum.filter(fn e -> e.date > since end)
    |> Enum.sort_by(& &1.date)
  end

  @doc "Get events by session"
  def get_by_session(session_id) do
    list(session: session_id)
  end

  @doc "Get event count"
  def count do
    try do
      :mnesia.table_info(:events, :size)
    rescue
      _ -> 0
    catch
      :exit, _ -> 0
    end
  end

  @doc "Get statistics"
  def stats do
    events = list()
    %{
      total: length(events),
      concepts: events |> Enum.filter(&(&1.type == "Instance" and &1.base == "Concept")) |> length(),
      individuals: events |> Enum.filter(&(&1.type == "Individual")) |> length(),
      models: events |> Enum.filter(&(&1.type == "Model")) |> length(),
      by_actor: events |> Enum.group_by(& &1.actor) |> Enum.map(fn {k, v} -> {k, length(v)} end) |> Map.new()
    }
  end

  @doc "Clear all events"
  def clear do
    :mnesia.clear_table(:events)
    :ok
  end

  @doc "Get genesis events list"
  def genesis_events, do: @genesis_events

  @doc "Check if ID is genesis"
  def is_genesis_id?(id) do
    Enum.any?(@genesis_events, fn {evt_id, _, _, _, _, _, _} -> evt_id == id end)
  end

  @doc "Check if ID is a system ID (genesis, bootstrap, or thesaurus)"
  def is_system_id?(nil), do: false
  def is_system_id?(id) when is_binary(id) do
    is_genesis_id?(id) or
    String.starts_with?(id, "bootstrap_") or
    String.starts_with?(id, "thesaurus_")
  end
  def is_system_id?(_), do: false

  # GenServer callbacks

  @impl true
  def init(_opts) do
    # Wait for Mnesia table to be ready
    :mnesia.wait_for_tables([:events], 30_000)

    # With ram_copies, table is empty after restart - always load
    # Check if table is empty (no events yet)
    current_count = count()

    if current_count == 0 do
      # Fresh start - load all initial data
      # Try to load genesis from BSL file first, fallback to hardcoded
      case load_genesis_from_bsl() do
        {:ok, _} -> :ok
        {:error, _} -> load_genesis()  # Fallback to hardcoded genesis
      end
      load_bsl_file("bootstrap.bsl")
      load_bsl_file("thesaurus.bsl")
      Logger.info("Initial data loaded: #{count()} events total")
    else
      # Data already exists (shouldn't happen with ram_copies unless hot reload)
      Logger.info("Data already present: #{current_count} events, skipping load")
    end

    {:ok, %{}}
  end

  @impl true
  def handle_call({:append, event_data}, _from, state) do
    # Apply auto_chain rule (W3) before creating event
    event_data_with_chain = apply_auto_chain(event_data)
    event = Event.new(event_data_with_chain)

    # Validate acyclicity (I2, W2) before storing
    case check_cause_acyclicity(event) do
      :ok ->
        record = Event.to_record(event)
        case :mnesia.dirty_write(record) do
          :ok -> {:reply, {:ok, event}, state}
          error -> {:reply, {:error, error}, state}
        end

      {:error, :cycle_detected} ->
        Logger.warning("[Storage] Cycle detected in cause graph for event #{event.id}")
        {:reply, {:error, :cycle_detected}, state}
    end
  end

  # ============================================================
  # Auto-chain rule (W3) implementation
  # ============================================================
  #
  # BSL spec W3: When creating event e with key=(model, base) from actor a:
  # 1. Find previous events: Prev := { e' ∈ H | model(e')=model ∧ base(e')=base ∧ actor(e')=a }
  # 2. If Prev non-empty, find max element e_max by date
  # 3. Add e_max to cause list of e
  #
  defp apply_auto_chain(event_data) when is_map(event_data) do
    base = event_data[:base] || event_data["base"]
    model = event_data[:model] || event_data["model"]
    actor = event_data[:actor] || event_data["actor"]
    current_cause = event_data[:cause] || event_data["cause"] || []

    # Skip auto_chain for system/genesis events
    if actor in ["System", "genesis"] or is_nil(base) or is_nil(actor) do
      event_data
    else
      # Find previous events with same (model, base, actor)
      prev_event = find_previous_event(base, model, actor)

      case prev_event do
        nil ->
          event_data

        %Event{id: prev_id} ->
          # Add prev_id to cause list if not already present
          cause_list = normalize_cause_to_list(current_cause)
          if prev_id in cause_list do
            event_data
          else
            updated_cause = cause_list ++ [prev_id]
            # Update event_data with new cause
            event_data
            |> Map.put(:cause, updated_cause)
            |> Map.put("cause", updated_cause)
          end
      end
    end
  end

  # Find previous event with same (base, model, actor), return latest by date
  defp find_previous_event(base, model, actor) do
    try do
      :mnesia.dirty_match_object({:events, :_, :_, :_, :_, :_, :_, :_, :_, :_})
      |> Enum.map(&Event.from_record/1)
      |> Enum.filter(fn e ->
        e.base == base and
        e.model == model and
        e.actor == actor
      end)
      |> Enum.max_by(& &1.date, fn -> nil end)
    rescue
      _ -> nil
    catch
      :exit, _ -> nil
    end
  end

  # ============================================================
  # Cause graph acyclicity check (I2, W2)
  # ============================================================
  #
  # BSL spec I2, W2: Cause graph must be acyclic (DAG).
  # Check that adding this event doesn't create a cycle.
  #
  defp check_cause_acyclicity(%Event{id: new_id, cause: causes}) when is_list(causes) do
    # If no causes, no cycle possible
    if Enum.empty?(causes) do
      :ok
    else
      # Check if any cause chain leads back to new_id
      check_acyclicity_recursive(causes, MapSet.new([new_id]))
    end
  end
  defp check_cause_acyclicity(_), do: :ok

  defp check_acyclicity_recursive([], _visited), do: :ok
  defp check_acyclicity_recursive([cause_id | rest], visited) do
    cond do
      # If we've seen this ID before in this path, cycle detected
      MapSet.member?(visited, cause_id) ->
        {:error, :cycle_detected}

      true ->
        # Get event and check its causes
        case :mnesia.dirty_read(:events, cause_id) do
          [record] ->
            event = Event.from_record(record)
            event_causes = event.cause || []
            new_visited = MapSet.put(visited, cause_id)

            # Recursively check this cause's causes
            case check_acyclicity_recursive(event_causes, new_visited) do
              :ok -> check_acyclicity_recursive(rest, visited)
              error -> error
            end

          [] ->
            # Cause not found (genesis or external) - ok, continue
            check_acyclicity_recursive(rest, visited)
        end
    end
  end

  # Private functions

  defp filter_events(events, opts) do
    events
    |> filter_by(:session, opts[:session])
    |> filter_by(:base, opts[:base])
    |> filter_by(:type, opts[:type])
    |> filter_by(:actor, opts[:actor])
  end

  defp filter_by(events, _field, nil), do: events
  defp filter_by(events, field, value) do
    Enum.filter(events, &(Map.get(&1, field) == value))
  end

  # Timestamp offsets to ensure proper ordering: genesis < bootstrap < thesaurus
  @genesis_offset 0           # 0ms - genesis events first
  @bootstrap_offset 1_000_000  # 1000s - bootstrap after genesis
  @thesaurus_offset 2_000_000  # 2000s - thesaurus after bootstrap

  # Load genesis events from genesis.bsl file
  # Uses explicit IDs and metadata from BSL format: [ID] Base: Type: Value {cause=X, model=Y}
  defp load_genesis_from_bsl do
    file_path = Application.app_dir(:prostochat, "priv/genesis.bsl")

    case File.read(file_path) do
      {:ok, content} ->
        Logger.info("Loading genesis from genesis.bsl...")

        events = Prostochat.Parser.parse_genesis(content, "System")

        stored_count = events
          |> Enum.with_index()
          |> Enum.reduce(0, fn {event_map, index}, count ->
            # Genesis events keep their explicit IDs
            genesis_date = DateTime.from_unix!(@genesis_offset + index, :millisecond) |> DateTime.to_iso8601()

            # Ensure cause is a list
            cause_raw = event_map[:cause] || event_map["cause"]
            cause_list = normalize_cause_to_list(cause_raw)

            event = %Event{
              id: event_map[:id] || event_map["id"],
              base: event_map[:base] || event_map["base"],
              type: event_map[:type] || event_map["type"],
              value: event_map[:value] || event_map["value"],
              model: event_map[:model] || event_map["model"] || "Event",
              cause: cause_list,
              actor: event_map[:actor] || event_map["actor"] || "System",
              date: genesis_date,
              session: nil
            }
            record = Event.to_record(event)
            case :mnesia.dirty_write(record) do
              :ok -> count + 1
              _ -> count
            end
          end)

        Logger.info("Genesis from BSL loaded: #{stored_count} events")
        {:ok, stored_count}

      {:error, :enoent} ->
        Logger.info("genesis.bsl not found, using hardcoded genesis")
        {:error, :not_found}

      {:error, reason} ->
        Logger.warning("genesis.bsl read error: #{inspect(reason)}")
        {:error, reason}
    end
  end

  # Load genesis events from unified definition (fallback)
  # Each event gets a sequential timestamp to preserve order
  defp load_genesis do
    Logger.info("Loading genesis events...")

    @genesis_events
    |> Enum.with_index()
    |> Enum.each(fn {{id, base, type, value, model, cause, actor}, index} ->
      # Each event gets unique timestamp: 0ms, 1ms, 2ms, ...
      genesis_date = DateTime.from_unix!(@genesis_offset + index, :millisecond) |> DateTime.to_iso8601()

      # Convert cause to list (BSL spec compliance)
      cause_list = if is_binary(cause) and cause != "", do: [cause], else: []

      event = %Event{
        id: id,
        base: base,
        type: type,
        value: value,
        model: model,
        cause: cause_list,
        actor: actor,
        date: genesis_date,
        session: nil
      }
      :mnesia.dirty_write(Event.to_record(event))
    end)

    Logger.info("Genesis loaded: #{count()} events")
  end

  # Load BSL file from priv directory if exists
  # Uses direct Mnesia write (not GenServer.call) because this runs during init
  # Events get STABLE IDs based on content hash to prevent duplicates across restarts
  defp load_bsl_file(filename) do
    file_path = Application.app_dir(:prostochat, "priv/#{filename}")
    prefix = filename |> String.replace(".bsl", "") |> String.replace(".", "_")

    # Use appropriate timestamp offset based on file type
    time_offset = cond do
      String.contains?(filename, "bootstrap") -> @bootstrap_offset
      String.contains?(filename, "thesaurus") -> @thesaurus_offset
      true -> @bootstrap_offset  # default for other BSL files
    end

    case File.read(file_path) do
      {:ok, content} ->
        Logger.info("Loading #{filename}...")
        # Parse BSL and store with stable IDs
        events = Prostochat.Parser.parse(content, "system", nil)

        # First pass: create ID mapping (random ID -> stable ID)
        id_mapping = events
          |> Enum.with_index()
          |> Enum.reduce(%{}, fn {event_map, index}, acc ->
            old_id = event_map[:id] || event_map["id"]
            stable_id = generate_stable_id(prefix, event_map, index)
            Map.put(acc, old_id, stable_id)
          end)

        # Second pass: store events with updated cause references
        stored_count = events
          |> Enum.with_index()
          |> Enum.reduce(0, fn {event_map, index}, count ->
            stable_id = generate_stable_id(prefix, event_map, index)

            # Update cause references using ID mapping (cause is now a list)
            old_cause = event_map[:cause] || event_map["cause"] || []
            updated_cause_list = remap_causes_list(old_cause, id_mapping)

            # Create event with stable ID and updated causes
            event = %Event{
              id: stable_id,
              base: event_map[:base] || event_map["base"],
              type: event_map[:type] || event_map["type"],
              value: event_map[:value] || event_map["value"],
              actor: event_map[:actor] || event_map["actor"] || "system",
              date: DateTime.from_unix!(time_offset + index, :millisecond) |> DateTime.to_iso8601(),
              cause: updated_cause_list,
              model: event_map[:model] || event_map["model"],
              session: event_map[:session] || event_map["session"]
            }
            record = Event.to_record(event)
            case :mnesia.dirty_write(record) do
              :ok -> count + 1
              _ -> count
            end
          end)
        Logger.info("#{filename} loaded: #{stored_count} events")
      {:error, :enoent} ->
        Logger.debug("#{filename} not found, skipping")
      {:error, reason} ->
        Logger.warning("#{filename} read error: #{inspect(reason)}")
    end
  end

  # Normalize cause to list format (BSL spec compliance)
  defp normalize_cause_to_list(nil), do: []
  defp normalize_cause_to_list([]), do: []
  defp normalize_cause_to_list(causes) when is_list(causes) do
    causes
    |> Enum.filter(&is_binary/1)
    |> Enum.reject(&(&1 == ""))
  end
  defp normalize_cause_to_list(cause) when is_binary(cause) and cause != "", do: [cause]
  defp normalize_cause_to_list(_), do: []

  # Remap cause IDs from random to stable (cause is a list)
  defp remap_causes_list(causes, id_mapping) when is_list(causes) do
    causes
    |> Enum.map(fn cause -> Map.get(id_mapping, cause, cause) end)
    |> Enum.filter(&is_binary/1)
    |> Enum.reject(&(&1 == ""))
  end
  defp remap_causes_list(cause, id_mapping) when is_binary(cause) do
    [Map.get(id_mapping, cause, cause)]
  end
  defp remap_causes_list(_, _), do: []

  # Generate stable ID based on event content (same content = same ID)
  defp generate_stable_id(prefix, event_map, index) do
    # Create deterministic hash from base + type + value + index
    base = event_map[:base] || event_map["base"]
    type = event_map[:type] || event_map["type"]
    value = event_map[:value] || event_map["value"]
    content = "#{base}:#{type}:#{value}:#{index}"
    hash = :crypto.hash(:md5, content) |> Base.encode16(case: :lower) |> String.slice(0, 8)
    "#{prefix}_#{hash}"
  end
end
