defmodule Prostochat.LLM.Client do
  @moduledoc """
  Unified LLM client supporting OpenRouter and Claude API.
  """
  alias Prostochat.Storage
  alias Prostochat.Event
  require Logger

  @doc """
  Send chat message to LLM and get response.
  Returns {:ok, %{text: text, events: [events]}}
  """
  def chat(message, session_id, opts \\ []) do
    provider = opts[:provider] || get_provider()

    context = build_context(session_id)
    system_prompt = build_system_prompt(context)

    case provider do
      :openrouter -> Prostochat.LLM.OpenRouter.chat(message, system_prompt, opts)
      :claude -> Prostochat.LLM.Claude.chat(message, system_prompt, opts)
      _ -> {:error, :unknown_provider}
    end
    |> process_response()
  end

  @doc "Get configured LLM provider"
  def get_provider do
    case Application.get_env(:prostochat, :llm_provider, "openrouter") do
      "claude" -> :claude
      _ -> :openrouter
    end
  end

  @doc "Build memory context from stored events"
  def build_context(session_id) do
    # Get recent session events
    session_events = Storage.get_by_session(session_id) |> Enum.take(-30)

    # Get all user-created individuals (shared memory)
    all_events = Storage.list()
    user_individuals = all_events
      |> Enum.filter(fn e ->
        not Storage.is_genesis_id?(e.id) and e.type == "Individual"
      end)
      |> Enum.take(-20)

    # Build context string
    context_parts = []

    # Session context
    session_context = if length(session_events) > 0 do
      events_str = session_events
        |> Enum.map(fn e -> "  #{e.type}: #{inspect(e.value)}" end)
        |> Enum.join("\n")
      "**Session #{session_id}**\n#{events_str}"
    end

    # Shared memory (individuals)
    memory_context = if length(user_individuals) > 0 do
      individuals = user_individuals
        |> Enum.group_by(& &1.base)
        |> Enum.map(fn {base, evts} ->
          props = evts
            |> Enum.map(fn e -> "  #{e.type}: #{inspect(e.value)}" end)
            |> Enum.join("\n")
          "**#{base}**\n#{props}"
        end)
        |> Enum.join("\n\n")
      "\n### Shared Memory (Individuals)\n#{individuals}"
    end

    [session_context, memory_context]
    |> Enum.reject(&is_nil/1)
    |> Enum.join("\n\n")
    |> case do
      "" -> "No previous context."
      ctx -> ctx
    end
  end

  @doc "Build the system prompt with BSL instructions (from boldsea-llm)"
  def build_system_prompt(context) do
    """
    You are a semantic memory assistant powered by Boldsea event graph system.
    Your memory is stored as events with full provenance.

    ## YOUR CAPABILITIES

    1. **Store Knowledge**: Extract semantic facts and store them as events.
    2. **Query Memory**: Use stored events to answer questions.
    3. **Generate UI**: Create View widgets for interactive data display.

    ## UNIFIED EVENT FORMAT (BSL)

    All events MUST use this format:
    ```
    {base, type, value, actor, model, cause}
    ```

    | Field | Description | Example |
    |-------|-------------|---------|
    | **base** | Subject of the event | "john", "Person", "Model Person" |
    | **type** | Type of value | "Individual", "name", "SetModel" |
    | **value** | The actual value | "John Smith", 35 |
    | **actor** | Who created | "user", "llm" |
    | **model** | Model reference | "Model Person", null |

    ## CRITICAL: SetModel is MANDATORY

    Every Individual MUST have a SetModel event:

    ```json
    {"base": "Person", "type": "Individual", "value": "ivan", "actor": "llm"},
    {"base": "ivan", "type": "SetModel", "value": "Model Person", "actor": "llm", "model": "Model Person"},
    {"base": "ivan", "type": "name", "value": "Иван", "actor": "llm", "model": "Model Person"}
    ```

    ## EVENT CREATION

    When users share information, create events in <events> tags:

    <events>
    [
      {"base": "Person", "type": "Individual", "value": "john", "actor": "llm"},
      {"base": "john", "type": "SetModel", "value": "Model Person", "actor": "llm", "model": "Model Person"},
      {"base": "john", "type": "name", "value": "John Smith", "actor": "llm", "model": "Model Person"}
    ]
    </events>

    ## VIEW WIDGETS - IMPORTANT

    Views are interactive UI widgets. When the user needs to input data, generate a FORM view.
    The form will create BSL events DIRECTLY without calling LLM again.

    ### Form View Structure (for data input)
    ```json
    <view>
    {
      "type": "form",
      "title": "Create Person",
      "mode": "create",           // REQUIRED: "create" or "edit"
      "concept": "Person",        // REQUIRED: the BSL concept
      "model": "Model Person",    // REQUIRED: the BSL model
      "target": null,             // For edit: individual ID. For create: null
      "fields": [
        {"name": "name", "label": "Name", "type": "text", "required": true},
        {"name": "age", "label": "Age", "type": "number"},
        {"name": "email", "label": "Email", "type": "text"}
      ],
      "actions": [
        {"label": "Create", "action": "submit", "primary": true},
        {"label": "Cancel", "action": "close"}
      ]
    }
    </view>
    ```

    ### Card View Structure (for display)
    ```json
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
    ```

    ### Action with Direct Event Creation
    Actions can create events directly without LLM:
    ```json
    {"label": "Approve", "action": "approve", "target": "task_123", "event": {"type": "status", "value": "approved"}}
    ```

    ## When to Use Forms vs Events

    1. **Use <events>** when YOU (the LLM) are extracting/creating data from the conversation
    2. **Use <view type="form">** when the USER needs to input structured data
       - The form submits directly to the event graph, no LLM round-trip needed

    ## MEMORY USAGE

    **CRITICAL**: Always use memory context in responses!
    1. Read "CURRENT MEMORY" section
    2. If memory has info about X, answer FROM MEMORY
    3. Start with "Из памяти:" when using stored facts

    ## CURRENT MEMORY

    #{context}

    ## Available Concepts (with Models)
    Person (Model Person), Task (Model Task), Organization (Model Organization),
    Document, Fragment, View, Term, Category, Classifier

    Remember:
    - Create SetModel for every Individual
    - Use memory to answer questions
    - Generate Form views for user data input (creates events directly!)
    - Generate Card views for data display
    - Store facts as events
    """
  end

  defp process_response({:ok, content}) do
    # Extract events
    events = extract_events(content)

    # Extract views
    views = extract_views(content)

    # Clean text
    text = content
      |> String.replace(~r/<events>[\s\S]*?<\/events>/, "")
      |> String.replace(~r/<view>[\s\S]*?<\/view>/, "")
      |> String.trim()

    {:ok, %{text: text, events: events, views: views}}
  end

  defp process_response({:error, reason}), do: {:error, reason}

  defp extract_events(content) do
    ~r/<events>([\s\S]*?)<\/events>/
    |> Regex.scan(content)
    |> Enum.flat_map(fn [_, json] ->
      case Jason.decode(String.trim(json)) do
        {:ok, events} when is_list(events) -> events
        _ -> []
      end
    end)
  end

  defp extract_views(content) do
    ~r/<view>([\s\S]*?)<\/view>/
    |> Regex.scan(content)
    |> Enum.map(fn [_, json] ->
      case Jason.decode(String.trim(json)) do
        {:ok, view} -> view
        _ -> nil
      end
    end)
    |> Enum.reject(&is_nil/1)
  end
end
