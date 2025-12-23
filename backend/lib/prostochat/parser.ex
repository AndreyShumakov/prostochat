defmodule Prostochat.Parser do
  @moduledoc """
  BSL (Boldsea Semantic Language) parser.
  Parses BSL text into event structures.

  cause is a LIST of event IDs (BSL spec compliance).
  Chain through causes must lead to genesis.

  Genesis format support:
  [ID] Base: Type: Value {cause=X, model=Y}
  """
  alias Prostochat.Event

  @doc """
  Parse genesis BSL text with explicit IDs and metadata.
  Format: [ID] Base: Type: Value {cause=X, model=Y}
  """
  def parse_genesis(text, actor \\ "System") do
    text
    |> String.split("\n")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == "" or String.starts_with?(&1, "#")))
    |> Enum.reduce([], fn line, events ->
      case parse_genesis_line(line) do
        {:ok, id, base, type, value, metadata} ->
          # Parse cause - can be comma-separated list
          cause_str = Map.get(metadata, "cause", id)
          cause_list = parse_cause_list(cause_str)

          event_data = %{
            "id" => id,
            "base" => base,
            "type" => type,
            "value" => value,
            "actor" => actor,
            "cause" => cause_list,
            "model" => Map.get(metadata, "model", "Event")
          }
          event = Event.new(event_data)
          events ++ [Event.to_map(event)]
        :error ->
          events
      end
    end)
  end

  # Parse cause string into list (supports comma-separated values)
  defp parse_cause_list(nil), do: []
  defp parse_cause_list(cause_str) when is_binary(cause_str) do
    cause_str
    |> String.split(",")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
  end
  defp parse_cause_list(causes) when is_list(causes), do: causes
  defp parse_cause_list(_), do: []

  @doc """
  Parse genesis line: [ID] Base: Type: Value {cause=X, model=Y}
  """
  def parse_genesis_line(line) do
    # Extract [ID] prefix
    id_regex = ~r/^\[([^\]]+)\]\s*/
    {id, rest} = case Regex.run(id_regex, line) do
      [full_match, id] ->
        {id, String.replace_prefix(line, full_match, "")}
      nil ->
        {nil, line}
    end

    # Extract {key=value, ...} metadata suffix
    meta_regex = ~r/\s*\{([^}]+)\}\s*$/
    {metadata, content} = case Regex.run(meta_regex, rest) do
      [full_match, meta_str] ->
        meta = parse_metadata(meta_str)
        {meta, String.replace_suffix(rest, full_match, "") |> String.trim()}
      nil ->
        {%{}, String.trim(rest)}
    end

    # Parse BSL content: Base: Type: Value
    parts = String.split(content, ":", parts: 3) |> Enum.map(&String.trim/1)

    case {id, parts} do
      {id, [base, type, value]} when id != nil ->
        {:ok, id, base, type, value, metadata}
      _ ->
        :error
    end
  end

  defp parse_metadata(meta_str) do
    meta_str
    |> String.split(",")
    |> Enum.map(&String.trim/1)
    |> Enum.reduce(%{}, fn pair, acc ->
      case String.split(pair, "=", parts: 2) do
        [key, value] ->
          Map.put(acc, String.trim(key), String.trim(value))
        _ ->
          acc
      end
    end)
  end

  @doc """
  Parse and store genesis events.
  These events have explicit IDs and form the core ontology foundation.
  """
  def parse_and_store_genesis(text, actor \\ "System") do
    events = parse_genesis(text, actor)

    stored = Enum.map(events, fn event_map ->
      case Prostochat.Storage.append(event_map) do
        {:ok, event} -> Event.to_map(event)
        {:error, _} -> nil
      end
    end)
    |> Enum.reject(&is_nil/1)

    {:ok, stored}
  end

  @doc """
  Load genesis.bsl from priv directory if storage is empty.
  Called at application startup.
  """
  def load_genesis_if_empty do
    case Prostochat.Storage.count() do
      0 ->
        genesis_path = Path.join(:code.priv_dir(:prostochat), "genesis.bsl")
        if File.exists?(genesis_path) do
          case File.read(genesis_path) do
            {:ok, content} ->
              {:ok, events} = parse_and_store_genesis(content, "System")
              IO.puts("Loaded #{length(events)} genesis events from genesis.bsl")
              {:ok, events}
            {:error, reason} ->
              IO.puts("Failed to read genesis.bsl: #{inspect(reason)}")
              {:error, reason}
          end
        else
          IO.puts("genesis.bsl not found at #{genesis_path}")
          {:error, :not_found}
        end
      count ->
        IO.puts("Storage already has #{count} events, skipping genesis load")
        {:ok, []}
    end
  end

  @doc """
  Parse BSL text and return list of event maps.
  """
  def parse(text, actor \\ "system", session \\ nil) do
    lines = text
    |> String.split("\n")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == "" or String.starts_with?(&1, "#")))

    # State: {events, level_parents, models_map}
    # level_parents: %{0 => parent_id, 1 => parent_id, ...} - tracks parent at each nesting level
    # models_map tracks SetModel for each individual: %{"john" => "Model Person"}
    {events, _, _} = Enum.reduce(lines, {[], %{}, %{}}, fn line, {events, level_parents, models} ->
      case parse_line(line) do
        {:ok, 0, base, type, value} ->
          # Root level: Base: Type: Value
          actual_type = type || infer_type(value)

          # Infer model for root level events
          model = infer_model(base, actual_type, value, models)

          # Infer cause list (BSL spec: cause is a list of event IDs)
          cause_list = infer_cause_list(events, base, actual_type, value)

          event_data = %{
            "base" => base,
            "type" => actual_type,
            "value" => value,
            "actor" => actor,
            "session" => session,
            "cause" => cause_list,
            "model" => model
          }

          event = Event.new(event_data)

          # Track SetModel for this individual
          new_models = if actual_type == "SetModel" do
            Map.put(models, base, value)
          else
            models
          end

          # Set this event as parent for level 0, clear deeper levels
          new_level_parents = %{0 => event.id}

          {events ++ [Event.to_map(event)], new_level_parents, new_models}

        {:ok, nesting, nil, type, value} ->
          # Nested: : Type: Value (uses parent base)
          # Get parent from the previous nesting level
          parent_id = Map.get(level_parents, nesting - 1)
          parent_base = get_parent_base(events, parent_id)

          # Get model from SetModel tracking or infer
          model = Map.get(models, parent_base) || infer_model(parent_base, type, value, models)

          # For nested events, cause is a list containing the parent event
          cause_list = if parent_id, do: [parent_id], else: []

          event_data = %{
            "base" => parent_base,
            "type" => type,
            "value" => value,
            "actor" => actor,
            "session" => session,
            "cause" => cause_list,
            "model" => model
          }

          event = Event.new(event_data)

          # Track SetModel
          new_models = if type == "SetModel" do
            Map.put(models, parent_base, value)
          else
            models
          end

          # Update parent at this nesting level (for deeper nested events)
          new_level_parents = Map.put(level_parents, nesting, event.id)

          {events ++ [Event.to_map(event)], new_level_parents, new_models}

        :error ->
          {events, level_parents, models}
      end
    end)

    events
  end

  @doc """
  Parse BSL text and store events.
  Returns {:ok, stored_events} or {:error, reason}.
  """
  def parse_and_store(text, actor \\ "system", session \\ nil) do
    events = parse(text, actor, session)

    stored = Enum.map(events, fn event_map ->
      case Prostochat.Storage.append(event_map) do
        {:ok, event} -> Event.to_map(event)
        {:error, _} -> nil
      end
    end)
    |> Enum.reject(&is_nil/1)

    {:ok, stored}
  end

  # Private functions

  defp infer_type(value) do
    cond do
      String.starts_with?(value, "Model ") -> "Model"
      String.match?(value, ~r/^[a-z_]/) -> "Individual"
      true -> "Instance"
    end
  end

  # Infer model based on event type and context
  defp infer_model(base, type, value, models) do
    cond do
      # SetModel event: model is the value itself
      type == "SetModel" ->
        value

      # Individual event: model is "Model <Concept>"
      type == "Individual" ->
        "Model #{base}"

      # Model event: model is "Model_<Concept>" or "Event"
      type == "Model" ->
        "Event"

      # Instance event: model is "Event"
      type == "Instance" ->
        "Event"

      # Property events: use tracked model or infer from base
      true ->
        Map.get(models, base) || "Model #{base}"
    end
  end

  defp parse_line(line) do
    # Count leading colons for nesting
    nesting = line |> String.graphemes() |> Enum.take_while(&(&1 == ":")) |> length()
    content = String.trim_leading(line, ":") |> String.trim()

    # BSL format: Base: Type: Value (3 parts for root) or Type: Value (2 parts for nested)
    parts = String.split(content, ":", parts: 3) |> Enum.map(&String.trim/1)

    case {nesting, parts} do
      # Root level: Base: Type: Value
      {0, [base, type, value]} ->
        {:ok, 0, base, type, value}
      # Root level without explicit type: Base: Value
      {0, [base, value]} ->
        {:ok, 0, base, nil, value}
      # Nested: Type: Value
      {n, [type, value]} when n > 0 ->
        {:ok, n, nil, type, value}
      _ ->
        :error
    end
  end

  defp get_parent_base(events, parent_id) do
    case Enum.find(events, fn e -> e.id == parent_id or e["id"] == parent_id end) do
      %{base: base} -> base
      %{"base" => base} -> base
      _ -> "Unknown"
    end
  end

  # Infer cause list for event (BSL spec: cause is a list of event IDs)
  # Chain must lead to genesis
  defp infer_cause_list(events, base, type, _value) do
    cause = case type do
      "Individual" ->
        # Link to Concept Instance
        concept_evt = Enum.find(events, fn e ->
          get_field(e, :base) == "Concept" and
          get_field(e, :type) == "Instance" and
          get_field(e, :value) == base
        end)
        if concept_evt, do: get_field(concept_evt, :id), else: "Concept"

      "Model" ->
        # Link to Concept Instance or genesis Model
        concept_evt = Enum.find(events, fn e ->
          get_field(e, :base) == "Concept" and
          get_field(e, :type) == "Instance" and
          get_field(e, :value) == base
        end)
        if concept_evt, do: get_field(concept_evt, :id), else: "Model"

      "Instance" ->
        # Link to genesis Instance
        "Instance"

      "SetModel" ->
        # Link to Individual
        individual_evt = Enum.find(events, fn e ->
          get_field(e, :type) == "Individual" and
          get_field(e, :value) == base
        end)
        if individual_evt, do: get_field(individual_evt, :id), else: "Individual"

      _ ->
        # For property events - link to SetModel or Individual
        set_model_evt = events
        |> Enum.reverse()
        |> Enum.find(fn e ->
          get_field(e, :base) == base and get_field(e, :type) == "SetModel"
        end)

        if set_model_evt do
          get_field(set_model_evt, :id)
        else
          individual_evt = Enum.find(events, fn e ->
            get_field(e, :type) == "Individual" and get_field(e, :value) == base
          end)
          if individual_evt, do: get_field(individual_evt, :id), else: "Event"
        end
    end

    # Return as list
    if cause, do: [cause], else: []
  end

  # Helper to get field from event map (handles both atom and string keys)
  defp get_field(event, field) when is_atom(field) do
    event[field] || event[Atom.to_string(field)]
  end
end
