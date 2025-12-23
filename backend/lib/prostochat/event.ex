defmodule Prostochat.Event do
  @moduledoc """
  Event structure for BSL events.

  Format: {id, base, type, value, actor, date, cause, model, session}
  """

  @type t :: %__MODULE__{
    id: String.t(),
    base: String.t(),
    type: String.t(),
    value: any(),
    actor: String.t(),
    date: String.t(),
    cause: String.t() | list(String.t()) | nil,
    model: String.t() | nil,
    session: String.t() | nil
  }

  defstruct [:id, :base, :type, :value, :actor, :date, :cause, :model, :session]

  @doc """
  Create a new event with auto-generated ID and timestamp.
  Cause is a LIST of event IDs (BSL spec: cause - список ID событий-причин).
  """
  def new(attrs) when is_map(attrs) do
    %__MODULE__{
      id: attrs[:id] || attrs["id"] || generate_id(),
      base: attrs[:base] || attrs["base"],
      type: attrs[:type] || attrs["type"],
      value: attrs[:value] || attrs["value"],
      actor: attrs[:actor] || attrs["actor"] || "system",
      date: attrs[:date] || attrs["date"] || now_iso(),
      cause: normalize_cause(attrs[:cause] || attrs["cause"]),
      model: attrs[:model] || attrs["model"],
      session: attrs[:session] || attrs["session"]
    }
  end

  @doc """
  Normalize cause to LIST format (BSL spec compliance).
  Handles: nil, string, list.
  Always returns a list (empty list for nil).
  """
  def normalize_cause(nil), do: []
  def normalize_cause([]), do: []
  def normalize_cause(causes) when is_list(causes) do
    causes
    |> Enum.filter(&is_binary/1)
    |> Enum.reject(&(&1 == ""))
  end
  def normalize_cause(cause) when is_binary(cause) and cause != "", do: [cause]
  def normalize_cause(_), do: []

  @doc """
  Get first cause from cause list (for backward compatibility).
  """
  def first_cause([first | _]), do: first
  def first_cause(_), do: nil

  @doc """
  Add cause to event's cause list (for auto_chain).
  """
  def add_cause(%__MODULE__{cause: causes} = event, new_cause) when is_binary(new_cause) do
    if new_cause in causes do
      event
    else
      %{event | cause: causes ++ [new_cause]}
    end
  end
  def add_cause(event, _), do: event

  @doc """
  Convert event to map for JSON serialization.
  """
  def to_map(%__MODULE__{} = event) do
    %{
      id: event.id,
      base: event.base,
      type: event.type,
      value: event.value,
      actor: event.actor,
      date: event.date,
      cause: event.cause,
      model: event.model,
      session: event.session
    }
  end

  @doc """
  Convert event to Mnesia record tuple.
  """
  def to_record(%__MODULE__{} = e) do
    {:events, e.id, e.base, e.type, e.value, e.actor, e.date, e.cause, e.model, e.session}
  end

  @doc """
  Convert Mnesia record to Event struct.
  """
  def from_record({:events, id, base, type, value, actor, date, cause, model, session}) do
    %__MODULE__{
      id: id,
      base: base,
      type: type,
      value: value,
      actor: actor,
      date: date,
      cause: cause,
      model: model,
      session: session
    }
  end

  @doc """
  Convert BSL text line to event.
  """
  def from_bsl(line, opts \\ []) do
    parent_base = Keyword.get(opts, :parent_base)
    actor = Keyword.get(opts, :actor, "system")
    session = Keyword.get(opts, :session)

    case parse_bsl_line(line) do
      {:ok, {nesting, type, value}} ->
        base = if nesting > 0 and parent_base, do: parent_base, else: type
        actual_type = if nesting > 0, do: type, else: "Individual"

        {:ok, new(%{
          base: base,
          type: actual_type,
          value: value,
          actor: actor,
          session: session
        })}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp parse_bsl_line(line) do
    # Count leading colons for nesting level
    nesting = count_leading_colons(line)
    content = String.trim_leading(line, ":")

    case String.split(content, ":", parts: 2) do
      [type, value] ->
        {:ok, {nesting, String.trim(type), parse_value(String.trim(value))}}
      _ ->
        {:error, :invalid_format}
    end
  end

  defp count_leading_colons(line) do
    line
    |> String.graphemes()
    |> Enum.take_while(&(&1 == ":"))
    |> length()
  end

  defp parse_value(value) do
    cond do
      value =~ ~r/^\d+$/ -> String.to_integer(value)
      value =~ ~r/^\d+\.\d+$/ -> String.to_float(value)
      value in ["true", "1"] -> true
      value in ["false", "0"] -> false
      true -> value
    end
  end

  defp generate_id do
    "evt_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
  end

  defp now_iso do
    DateTime.utc_now() |> DateTime.to_iso8601()
  end
end
