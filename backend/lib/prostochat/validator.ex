defmodule Prostochat.Validator do
  @moduledoc """
  BSL Validator - validates events against model restrictions.

  Implements validation rules from BSL_SPECIFICATION_COMPLETE.md:
  - Required: обязательность заполнения
  - Multiple: множественность значений
  - DataType: тип данных (Numeric, Boolean, Text, DateTime, EnumType, etc.)
  - Range: диапазон значений для Relation
  - ValueCondition: валидация значения выражением
  - Unique: уникальность среди индивидов концепта
  - UniqueIdentifier: глобальная уникальность
  - Immutable: запрет изменения
  - Permission: права доступа актора

  ## Usage

      case Prostochat.Validator.validate_event(event) do
        :ok -> # event is valid
        {:error, errors} -> # list of validation errors
      end
  """

  require Logger
  alias Prostochat.{Storage, Query}

  @type validation_error :: %{
    type: String.t(),
    code: String.t(),
    message: String.t(),
    field: String.t() | nil
  }

  # Error codes matching BSL spec
  @error_codes %{
    required: "VALUE_005",
    datatype: "VALUE_001",
    range: "VALUE_001",
    value_condition: "VALUE_002",
    unique: "VALUE_003",
    unique_identifier: "VALUE_003",
    multiple: "VALUE_004",
    immutable: "SEMANTIC_005",
    permission: "SEMANTIC_008"
  }

  @doc """
  Validate an event before storing.

  Returns :ok or {:error, [validation_error]}.
  """
  def validate_event(event_data) when is_map(event_data) do
    base = event_data[:base] || event_data["base"]
    type = event_data[:type] || event_data["type"]
    value = event_data[:value] || event_data["value"]
    actor = event_data[:actor] || event_data["actor"]
    model_name = event_data[:model] || event_data["model"]

    # Skip validation for system/genesis events
    if actor in ["System", "genesis"] or is_system_type?(type) do
      :ok
    else
      # Load model restrictions for this field
      case get_field_restrictions(base, type, model_name) do
        {:ok, restrictions} ->
          errors = []
          |> validate_required(restrictions, value, type)
          |> validate_datatype(restrictions, value, type)
          |> validate_range(restrictions, value, type)
          |> validate_value_condition(restrictions, value, base, type)
          |> validate_unique(restrictions, value, base, type)
          |> validate_unique_identifier(restrictions, value, type)
          |> validate_multiple(restrictions, value, base, type)
          |> validate_immutable(restrictions, value, base, type)
          |> validate_permission(restrictions, actor, type)

          if Enum.empty?(errors) do
            :ok
          else
            {:error, errors}
          end

        {:error, :no_model} ->
          # No model found - skip validation
          :ok
      end
    end
  end

  @doc """
  Validate an individual against its model.

  Returns {:ok, []} or {:error, [validation_error]}.
  """
  def validate_individual(individual_base) do
    with {:ok, concept} <- get_concept(individual_base),
         {:ok, model_name} <- get_model_name(individual_base, concept),
         {:ok, model_fields} <- get_model_fields(concept, model_name) do

      # Get current state
      state = get_individual_state(individual_base)

      # Validate required fields
      errors = Enum.flat_map(model_fields, fn field ->
        restrictions = field.restrictions
        value = Map.get(state, field.name)

        []
        |> validate_required(restrictions, value, field.name)
      end)

      if Enum.empty?(errors) do
        {:ok, []}
      else
        {:error, errors}
      end
    else
      {:error, reason} -> {:error, [%{type: "Error", code: "SEMANTIC_006", message: "#{inspect(reason)}", field: nil}]}
    end
  end

  @doc """
  Check if cause graph is acyclic (I2, W2).

  Returns :ok or {:error, :cycle_detected}.
  """
  def check_acyclicity(event_id) do
    check_acyclicity_recursive(event_id, MapSet.new())
  end

  defp check_acyclicity_recursive(nil, _visited), do: :ok
  defp check_acyclicity_recursive([], _visited), do: :ok
  defp check_acyclicity_recursive(event_id, visited) when is_binary(event_id) do
    if MapSet.member?(visited, event_id) do
      {:error, :cycle_detected}
    else
      case Storage.get(event_id) do
        {:ok, event} ->
          new_visited = MapSet.put(visited, event_id)
          causes = event.cause || []

          Enum.reduce_while(causes, :ok, fn cause_id, _acc ->
            case check_acyclicity_recursive(cause_id, new_visited) do
              :ok -> {:cont, :ok}
              error -> {:halt, error}
            end
          end)

        {:error, :not_found} ->
          :ok  # Genesis event or external reference
      end
    end
  end
  defp check_acyclicity_recursive(causes, visited) when is_list(causes) do
    Enum.reduce_while(causes, :ok, fn cause_id, _acc ->
      case check_acyclicity_recursive(cause_id, visited) do
        :ok -> {:cont, :ok}
        error -> {:halt, error}
      end
    end)
  end

  # ============================================================
  # Validation functions
  # ============================================================

  defp validate_required(errors, restrictions, value, field) do
    required = Map.get(restrictions, "Required")

    if required in ["1", 1, true, "true"] and is_empty?(value) do
      errors ++ [%{
        type: "Value Error",
        code: @error_codes.required,
        message: "Field '#{field}' is required",
        field: field
      }]
    else
      errors
    end
  end

  defp validate_datatype(errors, restrictions, value, field) do
    datatype = Map.get(restrictions, "DataType")

    if datatype && not is_empty?(value) do
      case validate_datatype_value(datatype, value) do
        :ok -> errors
        {:error, message} ->
          errors ++ [%{
            type: "Type Error",
            code: @error_codes.datatype,
            message: "Field '#{field}': #{message}",
            field: field
          }]
      end
    else
      errors
    end
  end

  defp validate_datatype_value("Numeric", value) do
    cond do
      is_number(value) -> :ok
      is_binary(value) && Regex.match?(~r/^-?\d+(\.\d+)?$/, value) -> :ok
      true -> {:error, "expected numeric value"}
    end
  end

  defp validate_datatype_value("Boolean", value) do
    if value in [true, false, "true", "false", "1", "0", 1, 0] do
      :ok
    else
      {:error, "expected boolean value"}
    end
  end

  defp validate_datatype_value("DateTime", value) do
    case DateTime.from_iso8601(to_string(value)) do
      {:ok, _, _} -> :ok
      {:error, _} ->
        case Date.from_iso8601(to_string(value)) do
          {:ok, _} -> :ok
          {:error, _} -> {:error, "expected ISO8601 date/time"}
        end
    end
  end

  defp validate_datatype_value("EnumType", _value) do
    # EnumType validation requires AttributeValue - handled separately
    :ok
  end

  defp validate_datatype_value(_datatype, _value), do: :ok

  defp validate_range(errors, restrictions, value, field) do
    range = Map.get(restrictions, "Range")

    if range && not is_empty?(value) do
      # Check if value is an individual of the specified concept
      events = Storage.list()
      valid = Enum.any?(events, fn e ->
        e.type == "Individual" and e.base == range and e.value == to_string(value)
      end)

      if valid do
        errors
      else
        errors ++ [%{
          type: "Type Error",
          code: @error_codes.range,
          message: "Field '#{field}': value must be an individual of '#{range}'",
          field: field
        }]
      end
    else
      errors
    end
  end

  defp validate_value_condition(errors, restrictions, value, base, field) do
    condition = Map.get(restrictions, "ValueCondition")

    if condition && not is_empty?(value) do
      state = get_individual_state(base)
      context = %{state: state, input_value: value}

      case Query.execute(condition, context) do
        {:ok, result} when result in [true, 1, "true", "1"] ->
          errors

        {:ok, _} ->
          errors ++ [%{
            type: "Value Error",
            code: @error_codes.value_condition,
            message: "Field '#{field}': value does not satisfy condition '#{condition}'",
            field: field
          }]

        {:error, _} ->
          errors  # Skip validation on expression error
      end
    else
      errors
    end
  end

  defp validate_unique(errors, restrictions, value, base, field) do
    unique = Map.get(restrictions, "Unique")

    if unique in ["1", 1, true, "true"] and not is_empty?(value) do
      # Get concept for this individual
      case get_concept(base) do
        {:ok, concept} ->
          # Find all individuals of this concept with same field value
          events = Storage.list()
          duplicates = events
          |> Enum.filter(fn e ->
            e.type == field and e.value == to_string(value) and e.base != base
          end)
          |> Enum.filter(fn e ->
            # Check if this event belongs to same concept
            ind = Enum.find(events, fn i -> i.type == "Individual" and i.value == e.base end)
            ind && ind.base == concept
          end)

          if Enum.empty?(duplicates) do
            errors
          else
            errors ++ [%{
              type: "Value Error",
              code: @error_codes.unique,
              message: "Field '#{field}': value '#{value}' is not unique",
              field: field
            }]
          end

        {:error, _} ->
          errors
      end
    else
      errors
    end
  end

  defp validate_unique_identifier(errors, restrictions, value, field) do
    unique_id = Map.get(restrictions, "UniqueIdentifier")

    if unique_id in ["1", 1, true, "true"] and not is_empty?(value) do
      # Check global uniqueness
      events = Storage.list()
      duplicates = Enum.filter(events, fn e ->
        e.type == field and e.value == to_string(value)
      end)

      if length(duplicates) <= 1 do  # Allow 1 for the current event
        errors
      else
        errors ++ [%{
          type: "Value Error",
          code: @error_codes.unique_identifier,
          message: "Field '#{field}': value '#{value}' is not globally unique",
          field: field
        }]
      end
    else
      errors
    end
  end

  defp validate_multiple(errors, restrictions, value, base, field) do
    multiple = Map.get(restrictions, "Multiple")

    if multiple in ["0", 0, false, "false"] and not is_empty?(value) do
      # Check if there are already values for this field
      events = Storage.list(base: base)
      existing = Enum.filter(events, fn e -> e.type == field end)

      if length(existing) > 0 do
        errors ++ [%{
          type: "Value Error",
          code: @error_codes.multiple,
          message: "Field '#{field}': multiple values not allowed",
          field: field
        }]
      else
        errors
      end
    else
      errors
    end
  end

  defp validate_immutable(errors, restrictions, value, base, field) do
    immutable = Map.get(restrictions, "Immutable")

    if immutable in ["1", 1, true, "true"] and not is_empty?(value) do
      # Check if field already has a value
      events = Storage.list(base: base)
      existing = Enum.find(events, fn e -> e.type == field end)

      if existing do
        errors ++ [%{
          type: "Semantic Error",
          code: @error_codes.immutable,
          message: "Field '#{field}': cannot modify immutable field",
          field: field
        }]
      else
        errors
      end
    else
      errors
    end
  end

  defp validate_permission(errors, restrictions, actor, field) do
    permission = Map.get(restrictions, "Permission")

    if permission && actor do
      # Check if actor has permission
      allowed_actors = String.split(permission, ",") |> Enum.map(&String.trim/1)

      if actor in allowed_actors or "admin" in get_actor_roles(actor) do
        errors
      else
        errors ++ [%{
          type: "Semantic Error",
          code: @error_codes.permission,
          message: "Field '#{field}': actor '#{actor}' does not have permission",
          field: field
        }]
      end
    else
      errors
    end
  end

  # ============================================================
  # Helper functions
  # ============================================================

  defp is_system_type?(type) do
    type in ["Instance", "Model", "Individual", "SetModel", "Attribute", "Relation", "Role"]
  end

  defp is_empty?(nil), do: true
  defp is_empty?(""), do: true
  defp is_empty?([]), do: true
  defp is_empty?(_), do: false

  defp get_field_restrictions(base, field_type, model_name) do
    events = Storage.list()

    # Find model event
    model = Enum.find(events, fn e ->
      e.type == "Model" and e.value == model_name
    end)

    if model do
      # Find field in model
      field_event = Enum.find(events, fn e ->
        e.type in ["Attribute", "Relation"] and
        e.value == field_type and
        model.id in (e.cause || [])
      end)

      if field_event do
        # Load restrictions
        restrictions = events
        |> Enum.filter(fn e -> field_event.id in (e.cause || []) end)
        |> Enum.reduce(%{}, fn e, acc ->
          if e.type not in ["Attribute", "Relation", "Role"] do
            Map.put(acc, e.type, e.value)
          else
            acc
          end
        end)

        {:ok, restrictions}
      else
        {:ok, %{}}
      end
    else
      {:error, :no_model}
    end
  end

  defp get_concept(individual_base) do
    events = Storage.list()

    case Enum.find(events, fn e -> e.type == "Individual" and e.value == individual_base end) do
      nil -> {:error, :not_found}
      event -> {:ok, event.base}
    end
  end

  defp get_model_name(individual_base, concept) do
    events = Storage.list(base: individual_base)

    case Enum.find(events, fn e -> e.type == "SetModel" end) do
      nil -> {:ok, "Model #{concept}"}
      event -> {:ok, event.value}
    end
  end

  defp get_model_fields(concept, model_name) do
    events = Storage.list()

    model = Enum.find(events, fn e ->
      e.type == "Model" and e.base == concept and e.value == model_name
    end)

    if model do
      fields = events
      |> Enum.filter(fn e ->
        e.type in ["Attribute", "Relation"] and model.id in (e.cause || [])
      end)
      |> Enum.map(fn field ->
        restrictions = events
        |> Enum.filter(fn e -> field.id in (e.cause || []) end)
        |> Enum.reduce(%{}, fn e, acc -> Map.put(acc, e.type, e.value) end)

        %{name: field.value, kind: field.type, restrictions: restrictions}
      end)

      {:ok, fields}
    else
      {:error, :model_not_found}
    end
  end

  defp get_individual_state(individual_base) do
    events = Storage.list(base: individual_base)

    Enum.reduce(events, %{}, fn e, acc ->
      prev = Map.get(acc, e.type)
      if is_nil(prev) or e.date >= prev.date do
        Map.put(acc, e.type, e.value)
      else
        acc
      end
    end)
  end

  defp get_actor_roles(actor) do
    events = Storage.list()

    events
    |> Enum.filter(fn e -> e.type == "Role" and e.base == actor end)
    |> Enum.map(fn e -> e.value end)
  end
end
