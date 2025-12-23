defmodule Prostochat.Query do
  @moduledoc """
  BSL Query executor for Prostochat.

  Evaluates BSL expressions and queries against the event graph.

  ## Expression Syntax

  - `$.field` - access field value (nil if missing)
  - `$$.field` - access field value (nil-safe)
  - `$Value` - current input value
  - `$CurrentActor` - current actor
  - `$CurrentIndividual` - current individual base
  - `$(...query...)` - BSL query

  ## Query Operators (BSL spec)

  - `$EQ` - equals (==)
  - `$NE` - not equals (!=)
  - `$GT` - greater than (>)
  - `$LT` - less than (<)
  - `$GE` - greater or equals (>=)
  - `$LE` - less or equals (<=)
  - `$OR` - logical OR

  ## Indexing

  - `[0]` - first element
  - `[-1]` - last element
  - `[n]` - nth element

  ## JS-like Operators

  - `&&`, `||`, `!` - logical operators
  - `==`, `===`, `!=`, `!==` - equality
  - `>`, `<`, `>=`, `<=` - comparison
  - `? :` - ternary operator
  - `isNaN(x)` - check if not a number
  """

  require Logger

  @doc """
  Execute a BSL expression or query.

  ## Parameters

  - `expr` - Expression string
  - `context` - Map with `:state`, `:input_value`, `:current_actor`, `:current_individual`

  ## Returns

  `{:ok, result}` or `{:error, reason}`
  """
  def execute(expr, context \\ %{})

  def execute(nil, _context), do: {:ok, nil}
  def execute("", _context), do: {:ok, nil}

  def execute(expr, context) when is_binary(expr) do
    e = String.trim(expr)

    cond do
      e == "" ->
        {:ok, nil}

      # BSL query: $(...) or $$...
      String.starts_with?(e, "$(") ->
        execute_bsl_query(e, context)

      # Literal values
      e in ["true", "1"] ->
        {:ok, true}

      e in ["false", "0"] ->
        {:ok, false}

      e == "null" or e == "nil" ->
        {:ok, nil}

      # Quoted string
      String.starts_with?(e, "\"") and String.ends_with?(e, "\"") ->
        {:ok, String.slice(e, 1..-2//1)}

      # Number
      match?({_, ""}, Integer.parse(e)) ->
        {num, _} = Integer.parse(e)
        {:ok, num}

      match?({_, ""}, Float.parse(e)) ->
        {num, _} = Float.parse(e)
        {:ok, num}

      # JS-like expression with field references
      String.contains?(e, "$.") or String.contains?(e, "$Value") or
      String.contains?(e, "&&") or String.contains?(e, "||") or
      String.contains?(e, "?") ->
        eval_js_expr(e, context)

      # Simple field reference
      String.starts_with?(e, "$.") ->
        field = String.trim_leading(e, "$.")
        state = Map.get(context, :state, %{})
        {:ok, Map.get(state, field)}

      # Just return the expression as-is (literal)
      true ->
        {:ok, e}
    end
  end

  def execute(value, _context), do: {:ok, value}

  @doc """
  Execute BSL query against event graph.

  Query format: $($EQ.$Base("Person"), $EQ.name("John"))
  With property access: $($EQ.$Base("Person")).name
  With indexing: $($EQ.$Base("Person"))[0].name
  """
  def execute_bsl_query(query, context) do
    Logger.debug("[Query] Executing BSL query: #{query}")

    # Check for property access after query: $(...).property or $(...)[index].property
    {query_part, accessor_chain} = split_query_and_accessors(query)

    # Parse query: $(conditions...)
    case parse_query(query_part) do
      {:ok, conditions} ->
        events = Prostochat.Storage.list()
        results = filter_events_by_conditions(events, conditions, context)

        # Apply accessor chain (indexing and property access)
        final_result = apply_accessor_chain(results, accessor_chain, events)
        {:ok, final_result}

      {:error, reason} ->
        {:error, reason}
    end
  end

  # Split query into query part and accessor chain
  # E.g., "$($EQ.$Base("Person"))[0].name" -> {"$($EQ.$Base("Person"))", ["[0]", ".name"]}
  defp split_query_and_accessors(query) do
    # Find the closing parenthesis of the query
    case Regex.run(~r/^(\$\([^)]+\))(.*)$/, query) do
      [_, query_part, rest] when rest != "" ->
        # Parse accessor chain: [0], [-1], .property
        accessors = parse_accessor_chain(rest)
        {query_part, accessors}

      _ ->
        {query, []}
    end
  end

  # Parse accessor chain like "[0].name.age" into [{:index, 0}, {:property, "name"}, {:property, "age"}]
  defp parse_accessor_chain(str) do
    str
    |> String.trim()
    |> do_parse_accessors([])
    |> Enum.reverse()
  end

  defp do_parse_accessors("", acc), do: acc
  defp do_parse_accessors(str, acc) do
    cond do
      # Index accessor: [0], [-1], [n]
      String.starts_with?(str, "[") ->
        case Regex.run(~r/^\[(-?\d+)\](.*)$/, str) do
          [_, index_str, rest] ->
            index = String.to_integer(index_str)
            do_parse_accessors(rest, [{:index, index} | acc])
          _ ->
            acc
        end

      # Property accessor: .property
      String.starts_with?(str, ".") ->
        case Regex.run(~r/^\.(\w+)(.*)$/, str) do
          [_, property, rest] ->
            do_parse_accessors(rest, [{:property, property} | acc])
          _ ->
            acc
        end

      # Skip unknown characters
      true ->
        acc
    end
  end

  # Apply accessor chain to results
  defp apply_accessor_chain(results, [], _events), do: results

  defp apply_accessor_chain(results, [{:index, index} | rest], events) when is_list(results) do
    item = if index >= 0 do
      Enum.at(results, index)
    else
      Enum.at(results, index)  # Elixir supports negative indexing
    end

    apply_accessor_chain(item, rest, events)
  end

  defp apply_accessor_chain(individual_base, [{:property, property} | rest], events) when is_binary(individual_base) do
    # Get property value for individual
    value = get_property_value(individual_base, property, events)
    apply_accessor_chain(value, rest, events)
  end

  defp apply_accessor_chain(results, [{:property, property} | rest], events) when is_list(results) do
    # Get property for each individual in list
    values = Enum.map(results, fn base ->
      get_property_value(base, property, events)
    end)
    apply_accessor_chain(values, rest, events)
  end

  defp apply_accessor_chain(result, _, _events), do: result

  # Get property value for an individual
  defp get_property_value(individual_base, property, events) do
    # Find latest event for this property
    events
    |> Enum.filter(fn e -> e.base == individual_base and e.type == property end)
    |> Enum.max_by(fn e -> e.date end, fn -> nil end)
    |> case do
      nil -> nil
      event -> event.value
    end
  end

  # Parse BSL query into conditions
  defp parse_query(query) do
    # Extract content from $(...)
    case Regex.run(~r/^\$\((.+)\)$/, String.trim(query)) do
      [_, content] ->
        conditions = parse_conditions(content)
        {:ok, conditions}

      nil ->
        {:error, "Invalid query format: #{query}"}
    end
  end

  # Parse comma-separated conditions
  defp parse_conditions(content) do
    # Split by comma, respecting parentheses
    parts = split_conditions(content)

    Enum.map(parts, fn part ->
      cond do
        # $OR(...) - parse nested conditions
        String.starts_with?(String.trim(part), "$OR(") ->
          case Regex.run(~r/\$OR\((.+)\)/, part) do
            [_, inner] ->
              inner_conditions = parse_conditions(inner)
              {:or_conditions, inner_conditions}
            _ -> {:unknown, part}
          end

        # $EQ.$Base("Value")
        String.contains?(part, "$EQ.$Base") ->
          case Regex.run(~r/\$EQ\.\$Base\("([^"]+)"\)/, part) do
            [_, value] -> {:base_eq, value}
            _ -> {:unknown, part}
          end

        # $EQ.$Model("Value")
        String.contains?(part, "$EQ.$Model") ->
          case Regex.run(~r/\$EQ\.\$Model\("([^"]+)"\)/, part) do
            [_, value] -> {:model_eq, value}
            _ -> {:unknown, part}
          end

        # $EQ.$Actor("Value")
        String.contains?(part, "$EQ.$Actor") ->
          case Regex.run(~r/\$EQ\.\$Actor\("([^"]+)"\)/, part) do
            [_, value] -> {:actor_eq, value}
            _ -> {:unknown, part}
          end

        # $EQ.field("value") or $EQ.field(number)
        String.contains?(part, "$EQ.") ->
          case Regex.run(~r/\$EQ\.(\w+)\(("?)([^"]+)\2\)/, part) do
            [_, field, _, value] -> {:field_eq, field, value}
            _ -> {:unknown, part}
          end

        # $NE.field("value")
        String.contains?(part, "$NE.") ->
          case Regex.run(~r/\$NE\.(\w+)\(("?)([^"]+)\2\)/, part) do
            [_, field, _, value] -> {:field_ne, field, value}
            _ -> {:unknown, part}
          end

        # $GT.field(value) - greater than
        String.contains?(part, "$GT.") ->
          case Regex.run(~r/\$GT\.(\w+)\(("?)([^"]+)\2\)/, part) do
            [_, field, _, value] -> {:field_gt, field, parse_numeric(value)}
            _ -> {:unknown, part}
          end

        # $LT.field(value) - less than
        String.contains?(part, "$LT.") ->
          case Regex.run(~r/\$LT\.(\w+)\(("?)([^"]+)\2\)/, part) do
            [_, field, _, value] -> {:field_lt, field, parse_numeric(value)}
            _ -> {:unknown, part}
          end

        # $GE.field(value) - greater or equal
        String.contains?(part, "$GE.") ->
          case Regex.run(~r/\$GE\.(\w+)\(("?)([^"]+)\2\)/, part) do
            [_, field, _, value] -> {:field_ge, field, parse_numeric(value)}
            _ -> {:unknown, part}
          end

        # $LE.field(value) - less or equal
        String.contains?(part, "$LE.") ->
          case Regex.run(~r/\$LE\.(\w+)\(("?)([^"]+)\2\)/, part) do
            [_, field, _, value] -> {:field_le, field, parse_numeric(value)}
            _ -> {:unknown, part}
          end

        true ->
          {:unknown, part}
      end
    end)
  end

  # Parse numeric value from string
  defp parse_numeric(value) when is_binary(value) do
    case Integer.parse(value) do
      {num, ""} -> num
      _ ->
        case Float.parse(value) do
          {num, ""} -> num
          _ -> value
        end
    end
  end
  defp parse_numeric(value), do: value

  # Split by comma, respecting parentheses depth
  defp split_conditions(content) do
    {parts, current, _depth} =
      content
      |> String.graphemes()
      |> Enum.reduce({[], "", 0}, fn char, {parts, current, depth} ->
        cond do
          char == "(" -> {parts, current <> char, depth + 1}
          char == ")" -> {parts, current <> char, max(depth - 1, 0)}
          char == "," and depth == 0 -> {parts ++ [String.trim(current)], "", 0}
          true -> {parts, current <> char, depth}
        end
      end)

    if current != "", do: parts ++ [String.trim(current)], else: parts
  end

  # Filter events by conditions
  defp filter_events_by_conditions(events, conditions, _context) do
    # Group events by base to get individuals
    individuals_map = Enum.group_by(events, & &1.base)

    # For each individual, check if all conditions match
    matching_bases =
      individuals_map
      |> Enum.filter(fn {_base, base_events} ->
        # Skip deleted individuals (BSL: compensating events instead of deletion)
        not is_deleted_events?(base_events) and
        Enum.all?(conditions, fn condition ->
          check_condition(condition, base_events)
        end)
      end)
      |> Enum.map(fn {base, _events} -> base end)

    matching_bases
  end

  # ============================================================
  # Delete handling (BSL: compensating events)
  # ============================================================
  #
  # An individual is considered deleted if it has a "delete" or "deleted"
  # type event with truthy value (e.g., "1", "true", "deleted")
  #
  @doc """
  Check if an individual is deleted (has compensating delete event).

  BSL spec: Events are never physically deleted, only marked with
  compensating "delete" events.
  """
  def is_deleted?(individual_base) when is_binary(individual_base) do
    events = Prostochat.Storage.list(base: individual_base)
    is_deleted_events?(events)
  end

  def is_deleted?(events) when is_list(events) do
    is_deleted_events?(events)
  end

  defp is_deleted_events?(events) do
    # Find latest delete/deleted event
    delete_event = events
    |> Enum.filter(fn e -> e.type in ["delete", "deleted", "Delete"] end)
    |> Enum.max_by(fn e -> e.date end, fn -> nil end)

    case delete_event do
      nil -> false
      %{value: value} -> value in ["1", "true", "deleted", true, 1]
    end
  end

  @doc """
  Mark an individual as deleted by creating a compensating event.

  Returns `{:ok, event}` or `{:error, reason}`.
  """
  def mark_deleted(individual_base, actor \\ "system") when is_binary(individual_base) do
    Prostochat.Storage.append(%{
      base: individual_base,
      type: "deleted",
      value: "1",
      actor: actor
    })
  end

  @doc """
  Restore a deleted individual by creating a compensating event.

  Returns `{:ok, event}` or `{:error, reason}`.
  """
  def restore_deleted(individual_base, actor \\ "system") when is_binary(individual_base) do
    Prostochat.Storage.append(%{
      base: individual_base,
      type: "deleted",
      value: "0",
      actor: actor
    })
  end

  # Check single condition against individual's events
  defp check_condition({:base_eq, value}, events) do
    Enum.any?(events, fn e -> e.base == value end)
  end

  defp check_condition({:model_eq, value}, events) do
    Enum.any?(events, fn e -> e.model == value end)
  end

  defp check_condition({:actor_eq, value}, events) do
    Enum.any?(events, fn e -> e.actor == value end)
  end

  defp check_condition({:field_eq, field, value}, events) do
    Enum.any?(events, fn e -> e.type == field and to_string(e.value) == to_string(value) end)
  end

  defp check_condition({:field_ne, field, value}, events) do
    event = Enum.find(events, fn e -> e.type == field end)
    event == nil or to_string(event.value) != to_string(value)
  end

  defp check_condition({:field_gt, field, value}, events) do
    event = Enum.find(events, fn e -> e.type == field end)
    event != nil and compare_values(event.value, value) == :gt
  end

  defp check_condition({:field_lt, field, value}, events) do
    event = Enum.find(events, fn e -> e.type == field end)
    event != nil and compare_values(event.value, value) == :lt
  end

  defp check_condition({:field_ge, field, value}, events) do
    event = Enum.find(events, fn e -> e.type == field end)
    event != nil and compare_values(event.value, value) in [:gt, :eq]
  end

  defp check_condition({:field_le, field, value}, events) do
    event = Enum.find(events, fn e -> e.type == field end)
    event != nil and compare_values(event.value, value) in [:lt, :eq]
  end

  defp check_condition({:or_conditions, conditions}, events) do
    Enum.any?(conditions, fn cond -> check_condition(cond, events) end)
  end

  defp check_condition({:unknown, _}, _events), do: true

  # Compare two values, returning :gt, :lt, or :eq
  defp compare_values(a, b) do
    a_num = to_number(a)
    b_num = to_number(b)

    cond do
      a_num > b_num -> :gt
      a_num < b_num -> :lt
      true -> :eq
    end
  end

  defp to_number(value) when is_number(value), do: value
  defp to_number(value) when is_binary(value) do
    case Float.parse(value) do
      {num, _} -> num
      :error -> 0
    end
  end
  defp to_number(_), do: 0

  @doc """
  Evaluate JS-like expression.
  """
  def eval_js_expr(expr, context) do
    state = Map.get(context, :state, %{})
    input_value = Map.get(context, :input_value)

    # Translate JS to Elixir
    translated = translate_js_expr(expr, state, input_value)

    try do
      {result, _binding} = Code.eval_string(
        translated,
        [
          state: state,
          value: input_value,
          isNaN: fn v -> not is_number(v) end
        ],
        __ENV__
      )

      {:ok, result}
    rescue
      err ->
        Logger.debug("[Query] Expression error: #{Exception.message(err)} in: #{translated}")
        {:error, Exception.message(err)}
    end
  end

  defp translate_js_expr(expr, _state, _input_value) do
    e = expr
    |> String.replace("undefined", "nil")
    |> String.replace("null", "nil")
    |> String.replace("&&", " and ")
    |> String.replace("||", " or ")
    |> String.replace("===", "==")
    |> String.replace("!==", "!=")
    |> String.replace(~r/\bisNaN\s*\(/, "isNaN.(")
    |> String.replace("$Value", "value")
    |> String.replace("$CurrentActor", ~s|Map.get(state, "_actor")|)
    |> String.replace("$CurrentIndividual", ~s|Map.get(state, "_individual")|)

    # Replace $.field and $$.field with Map.get(state, "field")
    e = Regex.replace(~r/\$\$?\.([A-Za-z_][A-Za-z0-9_]*)/, e, fn _m, name ->
      ~s|Map.get(state, "#{name}")|
    end)

    # Translate ternary operator
    translate_ternary(e)
  end

  defp translate_ternary(expr) do
    case split_ternary(expr) do
      nil -> expr
      {cond_expr, then_expr, else_expr} ->
        "if #{translate_ternary(cond_expr)} do #{translate_ternary(then_expr)} else #{translate_ternary(else_expr)} end"
    end
  end

  defp split_ternary(expr) do
    {q_pos, c_pos} = find_ternary_positions(expr)

    if q_pos && c_pos do
      cond_expr = String.slice(expr, 0, q_pos) |> String.trim()
      then_expr = String.slice(expr, q_pos + 1, c_pos - q_pos - 1) |> String.trim()
      else_expr = String.slice(expr, c_pos + 1, String.length(expr) - c_pos - 1) |> String.trim()
      {cond_expr, then_expr, else_expr}
    else
      nil
    end
  end

  defp find_ternary_positions(expr) do
    chars = String.to_charlist(expr)

    {q_pos, c_pos, _depth, _i} =
      Enum.reduce(chars, {nil, nil, 0, 0}, fn ch, {q, c, depth, i} ->
        depth2 = case ch do
          ?( -> depth + 1
          ?) -> max(depth - 1, 0)
          _ -> depth
        end

        q2 = cond do
          q == nil and depth == 0 and ch == ?? -> i
          true -> q
        end

        c2 = cond do
          q2 != nil and c == nil and depth == 0 and ch == ?: -> i
          true -> c
        end

        {q2, c2, depth2, i + 1}
      end)

    {q_pos, c_pos}
  end

  @doc """
  Extract field references from expression.
  Returns list of field names referenced via $.field or $$.field
  """
  def extract_field_refs(expr) when is_binary(expr) do
    Regex.scan(~r/\$\$?\.([A-Za-z_][A-Za-z0-9_]*)/, expr, capture: :all_but_first)
    |> List.flatten()
    |> Enum.uniq()
  end

  def extract_field_refs(_), do: []
end
