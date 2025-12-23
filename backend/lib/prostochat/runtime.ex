defmodule Prostochat.Runtime do
  @moduledoc """
  Runtime execution engine for Prostochat.

  Recalculates individual values using Default and SetValue restrictions
  from the associated model. Uses dependency graph + fixpoint iteration.

  ## Process

  1. Resolve concept and model for individual
  2. Load model fields with restrictions
  3. Apply Default values for missing fields
  4. Apply SetValue in dependency order until fixpoint
  5. Return generated events
  """

  require Logger
  alias Prostochat.{Storage, Event, Query}

  @default_max_iterations 25

  @doc """
  Recalculate an individual to fixpoint.

  ## Parameters

  - `individual_base` - The individual's base (e.g., "john")
  - `actor` - Actor performing the recalculation (default: "engine")
  - `opts` - Options: `:max_iterations` (default: 25)

  ## Returns

  `{:ok, generated_events}` or `{:error, reason}`
  """
  def recalc_individual(individual_base, actor \\ "engine", opts \\ [])
      when is_binary(individual_base) and is_binary(actor) do
    max_iter = Keyword.get(opts, :max_iterations, @default_max_iterations)

    Logger.info("[Runtime] Recalculating individual: #{individual_base}")

    with {:ok, concept} <- resolve_concept(individual_base),
         {:ok, model_name} <- resolve_model_name(individual_base, concept),
         {:ok, model_event} <- resolve_model_event(concept, model_name),
         {:ok, model_fields} <- load_model_fields(model_event) do

      Logger.debug("[Runtime] Found model: #{model_name} with #{length(model_fields)} fields")

      # Load current state
      state0 = load_current_state(individual_base, model_fields)

      # Apply defaults
      {state1, defaults_events} = apply_defaults(
        individual_base, actor, model_name, model_fields, state0
      )

      # Apply SetValue to fixpoint
      {_state2, setvalue_events} = apply_setvalues_fixpoint(
        individual_base, actor, model_name, model_fields, state1, max_iter
      )

      all_events = defaults_events ++ setvalue_events
      Logger.info("[Runtime] Generated #{length(all_events)} events for #{individual_base}")

      {:ok, all_events}
    else
      {:error, reason} ->
        Logger.warning("[Runtime] Error recalculating #{individual_base}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  # ============================================================
  # Resolve model / concept
  # ============================================================

  defp resolve_concept(individual_base) do
    # Find Individual event: Concept: Individual: individual_base
    events = Storage.list()

    ev = events
    |> Enum.filter(fn e -> e.type == "Individual" and e.value == individual_base end)
    |> Enum.max_by(& &1.date, fn -> nil end)

    if ev do
      {:ok, ev.base}
    else
      {:error, {:unknown_individual, individual_base}}
    end
  end

  defp resolve_model_name(individual_base, concept) do
    # Check for SetModel on the individual
    events = Storage.list(base: individual_base)

    set_model = events
    |> Enum.filter(fn e -> e.type == "SetModel" end)
    |> Enum.max_by(& &1.date, fn -> nil end)

    cond do
      set_model && is_binary(set_model.value) && set_model.value != "" ->
        {:ok, set_model.value}

      true ->
        # Default: "Model <Concept>"
        {:ok, "Model #{concept}"}
    end
  end

  defp resolve_model_event(concept, model_name) do
    events = Storage.list()

    # Look for: base=Concept, type=Model, value=model_name
    model_event = events
    |> Enum.filter(fn e ->
      e.type == "Model" and e.base == concept and e.value == model_name
    end)
    |> Enum.max_by(& &1.date, fn -> nil end)

    if model_event do
      {:ok, model_event}
    else
      # Fallback: any model with that value
      any_model = events
      |> Enum.filter(fn e -> e.type == "Model" and e.value == model_name end)
      |> Enum.max_by(& &1.date, fn -> nil end)

      if any_model do
        {:ok, any_model}
      else
        {:error, {:model_not_found, model_name}}
      end
    end
  end

  # ============================================================
  # Load model fields
  # ============================================================

  defp load_model_fields(model_event) do
    # Find Attribute/Relation events nested under model
    all_events = Storage.list()

    # Fields are events with cause containing model_event.id (cause is now a list)
    children = Enum.filter(all_events, fn e ->
      model_event.id in (e.cause || []) and e.type in ["Attribute", "Relation"]
    end)

    fields = Enum.map(children, fn field_event ->
      %{
        name: field_event.value,
        kind: field_event.type,
        event: field_event,
        restrictions: load_restrictions(field_event.id, all_events)
      }
    end)

    {:ok, fields}
  end

  defp load_restrictions(field_event_id, all_events) do
    # Restrictions are events with cause containing field_event_id (cause is now a list)
    restriction_events = Enum.filter(all_events, fn e ->
      field_event_id in (e.cause || [])
    end)

    Enum.reduce(restriction_events, %{}, fn e, acc ->
      key = e.type
      if is_binary(key) and key != "" do
        Map.put(acc, key, e.value)
      else
        acc
      end
    end)
  end

  # ============================================================
  # Load current state
  # ============================================================

  defp load_current_state(individual_base, model_fields) do
    events = Storage.list(base: individual_base)

    # Get latest value for each field
    latest = Enum.reduce(events, %{}, fn e, acc ->
      key = e.type
      prev = Map.get(acc, key)

      cond do
        is_nil(prev) -> Map.put(acc, key, e)
        e.date >= prev.date -> Map.put(acc, key, e)
        true -> acc
      end
    end)

    # Build state from model fields
    Enum.reduce(model_fields, %{}, fn f, acc ->
      case Map.get(latest, f.name) do
        nil -> Map.put(acc, f.name, nil)
        ev -> Map.put(acc, f.name, coerce_value(ev.value))
      end
    end)
  end

  defp coerce_value(nil), do: nil
  defp coerce_value(v) when is_number(v), do: v
  defp coerce_value(v) when is_binary(v) do
    s = String.trim(v)

    cond do
      s == "" -> nil
      s == "nil" or s == "null" -> nil
      true ->
        case Integer.parse(s) do
          {i, ""} -> i
          _ ->
            case Float.parse(s) do
              {f, ""} -> f
              _ -> s
            end
        end
    end
  end
  defp coerce_value(v), do: v

  # ============================================================
  # Apply defaults
  # ============================================================

  defp apply_defaults(individual_base, actor, model_name, model_fields, state) do
    Enum.reduce(model_fields, {state, []}, fn f, {st, acc_events} ->
      default = Map.get(f.restrictions, "Default")

      cond do
        is_nil(default) or default == "" ->
          {st, acc_events}

        # Already has value
        not is_nil(Map.get(st, f.name)) ->
          {st, acc_events}

        true ->
          context = %{state: st, input_value: nil}
          case Query.execute(default, context) do
            {:ok, value} ->
              value = coerce_value(value)

              if is_nil(value) do
                {st, acc_events}
              else
                {:ok, created} = Storage.append(%{
                  base: individual_base,
                  type: f.name,
                  value: to_string(value),
                  actor: actor,
                  model: model_name
                })

                {Map.put(st, f.name, value), acc_events ++ [Event.to_map(created)]}
              end

            {:error, _} ->
              {st, acc_events}
          end
      end
    end)
  end

  # ============================================================
  # Apply SetValue to fixpoint
  # ============================================================

  defp apply_setvalues_fixpoint(individual_base, actor, model_name, model_fields, state, max_iter) do
    # Build dependency graph
    graph = build_dependency_graph(model_fields)
    order = topo_order(graph, Enum.map(model_fields, & &1.name))

    iter_fixpoint(individual_base, actor, model_name, model_fields, state, order, max_iter, 0, [])
  end

  defp iter_fixpoint(_base, _actor, _model_name, _fields, state, _order, max_iter, iter, acc_events)
       when iter >= max_iter do
    Logger.warning("[Runtime] max_iterations=#{max_iter} reached")
    {state, acc_events}
  end

  defp iter_fixpoint(base, actor, model_name, model_fields, state, order, max_iter, iter, acc_events) do
    {state2, new_events, changed?} =
      Enum.reduce(order, {state, [], false}, fn field_name, {st, evs, changed} ->
        field = Enum.find(model_fields, fn f -> f.name == field_name end)

        if is_nil(field) do
          {st, evs, changed}
        else
          setvalue = Map.get(field.restrictions, "SetValue")
          condition = Map.get(field.restrictions, "Condition")

          cond do
            is_nil(setvalue) or setvalue == "" ->
              {st, evs, changed}

            # Has Condition - check it first
            condition && condition != "" ->
              context = %{state: st, input_value: nil}
              case Query.execute(condition, context) do
                {:ok, truthy} when truthy in [true, 1, "true", "1"] ->
                  apply_one_setvalue(base, actor, model_name, field, setvalue, st, evs, changed)
                _ ->
                  {st, evs, changed}
              end

            # No Condition - always apply
            true ->
              apply_one_setvalue(base, actor, model_name, field, setvalue, st, evs, changed)
          end
        end
      end)

    if changed? do
      iter_fixpoint(base, actor, model_name, model_fields, state2, order, max_iter, iter + 1, acc_events ++ new_events)
    else
      {state2, acc_events ++ new_events}
    end
  end

  defp apply_one_setvalue(base, actor, model_name, field, setvalue_expr, state, evs, changed) do
    context = %{state: state, input_value: nil}

    case Query.execute(setvalue_expr, context) do
      {:ok, value} ->
        value = coerce_value(value)
        old = Map.get(state, field.name)

        # Compare as strings to detect changes
        old_str = String.trim(to_string(old || ""))
        new_str = String.trim(to_string(value || ""))

        if old_str == new_str do
          {state, evs, changed}
        else
          {:ok, created} = Storage.append(%{
            base: base,
            type: field.name,
            value: to_string(value),
            actor: actor,
            model: model_name
          })

          Logger.debug("[Runtime] SetValue: #{base}.#{field.name} = #{value}")
          {Map.put(state, field.name, value), evs ++ [Event.to_map(created)], true}
        end

      {:error, _} ->
        {state, evs, changed}
    end
  end

  # ============================================================
  # Dependency graph
  # ============================================================

  defp build_dependency_graph(model_fields) do
    Enum.reduce(model_fields, %{}, fn f, acc ->
      deps = Query.extract_field_refs(Map.get(f.restrictions, "SetValue", "")) ++
             Query.extract_field_refs(Map.get(f.restrictions, "Condition", ""))

      Map.put(acc, f.name, Enum.uniq(deps))
    end)
  end

  # Topological sort using Kahn's algorithm
  defp topo_order(graph, nodes) do
    # Calculate in-degrees
    indeg = Enum.reduce(nodes, %{}, fn n, acc ->
      Map.put(acc, n, 0)
    end)

    indeg = Enum.reduce(nodes, indeg, fn n, acc ->
      deps = Map.get(graph, n, [])
      Map.update(acc, n, 0, fn v -> v + length(deps) end)
    end)

    # Start with nodes that have no dependencies
    q = :queue.from_list(Enum.filter(nodes, fn n -> Map.get(indeg, n, 0) == 0 end))
    {order, _, _} = topo_kahn(graph, indeg, q, [])

    # Handle cycles: append remaining nodes
    if length(order) != length(nodes) do
      rest = Enum.reject(nodes, fn n -> n in order end)
      order ++ rest
    else
      order
    end
  end

  defp topo_kahn(graph, indeg, q, acc) do
    case :queue.out(q) do
      {{:value, n}, q2} ->
        {indeg2, q3} =
          Enum.reduce(Map.keys(graph), {indeg, q2}, fn m, {ind, qq} ->
            deps = Map.get(graph, m, [])

            if n in deps do
              ind2 = Map.update(ind, m, 0, &(&1 - 1))
              if Map.get(ind2, m, 0) == 0 do
                {ind2, :queue.in(m, qq)}
              else
                {ind2, qq}
              end
            else
              {ind, qq}
            end
          end)

        topo_kahn(graph, indeg2, q3, acc ++ [n])

      {:empty, _} ->
        {acc, indeg, q}
    end
  end
end
