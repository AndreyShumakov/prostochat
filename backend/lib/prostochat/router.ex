defmodule Prostochat.Router do
  @moduledoc """
  HTTP API router for Prostochat.
  """
  use Plug.Router
  require Logger

  alias Prostochat.{Storage, Event, Query, Runtime, Dataflow}
  alias Prostochat.LLM.Client, as: LLM

  plug Plug.Logger
  plug CORSPlug,
    origin: [
      "http://localhost:3080",
      "http://localhost:3081",
      "http://127.0.0.1:3080",
      "https://chat.prostodoska.ru",
      "https://adminchat.prostodoska.ru",
      "http://chat.prostodoska.ru",
      "http://adminchat.prostodoska.ru"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    headers: ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    credentials: true
  plug :fetch_query_params
  plug Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason
  plug :match
  plug :dispatch

  # CORS preflight
  options _ do
    conn
    |> send_resp(204, "")
  end

  # Health check
  get "/health" do
    send_json(conn, 200, %{status: "ok", events: Storage.count()})
  end

  # === API Routes ===

  # Get all events (supports ?since= query parameter)
  get "/api/events" do
    events = case conn.query_params["since"] do
      nil ->
        Storage.list()
      since ->
        Storage.get_since(since)
    end
    |> Enum.map(&Event.to_map/1)

    send_json(conn, 200, events)
  end

  # Get events with filters
  get "/api/events/filter" do
    opts = [
      session: conn.query_params["session"],
      base: conn.query_params["base"],
      type: conn.query_params["type"],
      actor: conn.query_params["actor"]
    ] |> Enum.reject(fn {_, v} -> is_nil(v) end)

    events = Storage.list(opts) |> Enum.map(&Event.to_map/1)
    send_json(conn, 200, events)
  end

  # Get events since timestamp
  get "/api/events/since/:since" do
    events = Storage.get_since(since) |> Enum.map(&Event.to_map/1)
    send_json(conn, 200, events)
  end

  # Create event
  post "/api/events" do
    case Storage.append(conn.body_params) do
      {:ok, event} -> send_json(conn, 201, Event.to_map(event))
      {:error, reason} -> send_json(conn, 400, %{error: inspect(reason)})
    end
  end

  # Batch create events (skip duplicates)
  post "/api/events/batch" do
    events = conn.body_params["events"] || []
    results = events
    |> Enum.reject(fn e ->
      case Storage.get(e["id"]) do
        {:ok, _} -> true
        {:error, :not_found} -> false
      end
    end)
    |> Enum.map(fn e ->
      case Storage.append(e) do
        {:ok, event} -> Event.to_map(event)
        {:error, _} -> nil
      end
    end)
    |> Enum.reject(&is_nil/1)

    send_json(conn, 201, %{created: length(results), events: results})
  end

  # Sync endpoint - receive events from frontend, send new ones
  post "/api/sync" do
    client_events = conn.body_params["events"] || []
    last_sync = conn.body_params["lastSync"]

    # Store client events (skip system events and duplicates)
    # System events = genesis + bootstrap + thesaurus (loaded from BSL files)
    stored = client_events
    |> Enum.reject(fn e -> Storage.is_system_id?(e["id"]) end)
    |> Enum.reject(fn e ->
      # Skip if already exists
      case Storage.get(e["id"]) do
        {:ok, _} -> true
        {:error, :not_found} -> false
      end
    end)
    |> Enum.map(fn e ->
      case Storage.append(e) do
        {:ok, event} -> Event.to_map(event)
        {:error, _} -> nil
      end
    end)
    |> Enum.reject(&is_nil/1)

    # Get new events from server (ALL events including system)
    # Frontend needs to receive system events from backend
    # But frontend won't send system events back (filtered on frontend side)
    new_events = if last_sync do
      Storage.get_since(last_sync)
      |> Enum.map(&Event.to_map/1)
    else
      Storage.list()
      |> Enum.map(&Event.to_map/1)
    end

    send_json(conn, 200, %{
      stored: length(stored),
      newEvents: new_events,
      serverTime: DateTime.utc_now() |> DateTime.to_iso8601()
    })
  end

  # Load/Parse BSL text and create events (alias for /api/parse)
  post "/api/load" do
    text = conn.body_params["text"] || ""
    actor = conn.body_params["actor"] || "system"
    session = conn.body_params["session"]

    events = parse_bsl_text(text, actor, session)

    # Store parsed events
    stored = Enum.map(events, fn e ->
      case Storage.append(e) do
        {:ok, event} -> Event.to_map(event)
        {:error, _} -> nil
      end
    end) |> Enum.reject(&is_nil/1)

    send_json(conn, 201, %{count: length(stored), events: stored})
  end

  # Parse BSL text and create events
  post "/api/parse" do
    text = conn.body_params["text"] || ""
    actor = conn.body_params["actor"] || "user"
    session = conn.body_params["session"]

    events = parse_bsl_text(text, actor, session)

    # Store parsed events
    stored = Enum.map(events, fn e ->
      case Storage.append(e) do
        {:ok, event} -> Event.to_map(event)
        {:error, _} -> nil
      end
    end) |> Enum.reject(&is_nil/1)

    send_json(conn, 201, %{parsed: length(stored), events: stored})
  end

  # Get statistics
  get "/api/stats" do
    send_json(conn, 200, Storage.stats())
  end

  # Get genesis events
  get "/api/genesis" do
    events = Storage.list()
      |> Enum.filter(fn e -> Storage.is_genesis_id?(e.id) end)
      |> Enum.map(&Event.to_map/1)
    send_json(conn, 200, events)
  end

  # Export events as BSL text
  get "/api/export/bsl" do
    events = Storage.list()
    |> Enum.reject(fn e -> Storage.is_genesis_id?(e.id) end)
    |> Enum.sort_by(& &1.date)

    bsl_text = events_to_bsl(events)

    conn
    |> put_resp_content_type("text/plain")
    |> send_resp(200, bsl_text)
  end

  # Chat with LLM
  post "/api/chat" do
    message = conn.body_params["message"]
    session = conn.body_params["session"] || "default"
    provider = case conn.body_params["provider"] do
      "claude" -> :claude
      "openrouter" -> :openrouter
      _ -> nil
    end

    opts = if provider, do: [provider: provider], else: []

    case LLM.chat(message, session, opts) do
      {:ok, result} ->
        # Store LLM-generated events
        for event_data <- result.events || [] do
          Storage.append(Map.put(event_data, "session", session))
        end

        send_json(conn, 200, %{
          text: result.text,
          events: result.events || [],
          views: result.views || []
        })

      {:error, :no_api_key} ->
        send_json(conn, 400, %{error: "API key not configured"})

      {:error, reason} ->
        send_json(conn, 500, %{error: inspect(reason)})
    end
  end

  # === Query API ===

  # Execute BSL query
  post "/api/query" do
    query = conn.body_params["query"] || ""
    context = conn.body_params["context"] || %{}

    case Query.execute(query, context) do
      {:ok, result} ->
        send_json(conn, 200, %{result: result})
      {:error, reason} ->
        send_json(conn, 400, %{error: inspect(reason)})
    end
  end

  # === Delete API (BSL compensating events) ===

  # Mark individual as deleted (soft delete via compensating event)
  post "/api/delete" do
    individual = conn.body_params["individual"]
    actor = conn.body_params["actor"] || "system"

    if is_nil(individual) or individual == "" do
      send_json(conn, 400, %{error: "individual is required"})
    else
      case Query.mark_deleted(individual, actor) do
        {:ok, event} ->
          send_json(conn, 200, %{
            deleted: true,
            individual: individual,
            event: Event.to_map(event)
          })
        {:error, reason} ->
          send_json(conn, 400, %{error: inspect(reason)})
      end
    end
  end

  # Restore deleted individual (soft restore via compensating event)
  post "/api/restore" do
    individual = conn.body_params["individual"]
    actor = conn.body_params["actor"] || "system"

    if is_nil(individual) or individual == "" do
      send_json(conn, 400, %{error: "individual is required"})
    else
      case Query.restore_deleted(individual, actor) do
        {:ok, event} ->
          send_json(conn, 200, %{
            restored: true,
            individual: individual,
            event: Event.to_map(event)
          })
        {:error, reason} ->
          send_json(conn, 400, %{error: inspect(reason)})
      end
    end
  end

  # Check if individual is deleted
  get "/api/deleted/:individual" do
    is_deleted = Query.is_deleted?(individual)
    send_json(conn, 200, %{individual: individual, deleted: is_deleted})
  end

  # === Runtime API ===

  # Recalculate individual (apply Default/SetValue to fixpoint)
  post "/api/runtime/recalc" do
    individual = conn.body_params["individual"]
    actor = conn.body_params["actor"] || "engine"

    if is_nil(individual) or individual == "" do
      send_json(conn, 400, %{error: "individual is required"})
    else
      case Runtime.recalc_individual(individual, actor) do
        {:ok, events} ->
          send_json(conn, 200, %{
            individual: individual,
            generated: length(events),
            events: events
          })
        {:error, reason} ->
          send_json(conn, 400, %{error: inspect(reason)})
      end
    end
  end

  # === Dataflow API ===

  # Execute one dataflow step
  post "/api/dataflow/step" do
    case Dataflow.execute_step() do
      {:ok, events} ->
        send_json(conn, 200, %{
          generated: length(events),
          events: events
        })
      {:error, reason} ->
        send_json(conn, 500, %{error: inspect(reason)})
    end
  end

  # Execute dataflow to fixpoint
  post "/api/dataflow/fixpoint" do
    max_iter = conn.body_params["maxIterations"] || 100

    case Dataflow.execute_to_fixpoint(max_iterations: max_iter) do
      {:ok, iterations, events} ->
        send_json(conn, 200, %{
          fixpoint: true,
          iterations: iterations,
          generated: length(events),
          events: events
        })
      {:error, :max_iterations_reached, events} ->
        send_json(conn, 200, %{
          fixpoint: false,
          iterations: max_iter,
          generated: length(events),
          events: events,
          warning: "Max iterations reached"
        })
      {:error, reason, events} ->
        send_json(conn, 500, %{
          error: inspect(reason),
          events: events
        })
    end
  end

  # Execute incremental dataflow for specific events
  post "/api/dataflow/incremental" do
    events = conn.body_params["events"] || []

    case Dataflow.execute_incremental(events) do
      {:ok, new_events} ->
        send_json(conn, 200, %{
          generated: length(new_events),
          events: new_events
        })
      {:error, reason} ->
        send_json(conn, 500, %{error: inspect(reason)})
    end
  end

  # List all guards
  get "/api/dataflow/guards" do
    guards = Dataflow.list_guards()
    send_json(conn, 200, %{count: length(guards), guards: guards})
  end

  # List active guards
  get "/api/dataflow/guards/active" do
    guards = Dataflow.list_active_guards()
    send_json(conn, 200, %{count: length(guards), guards: guards})
  end

  # === Admin Routes ===

  # Serve admin interface
  get "/admin" do
    send_file(conn, 200, admin_path("index.html"))
  end

  get "/admin/*path" do
    file_path = admin_path(Enum.join(path, "/"))
    if File.exists?(file_path) do
      send_file(conn, 200, file_path)
    else
      send_file(conn, 200, admin_path("index.html"))
    end
  end

  # Catch all
  match _ do
    send_resp(conn, 404, "Not found")
  end

  # Helpers

  defp send_json(conn, status, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(data))
  end

  defp admin_path(file) do
    Path.join([:code.priv_dir(:prostochat), "static", "admin", file])
  end

  # Parse BSL text into events
  # Format: Base: Type: Value (with nesting via leading colons)
  defp parse_bsl_text(text, actor, session) do
    lines = String.split(text, "\n")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == "" or String.starts_with?(&1, "#")))

    {events, _} = Enum.reduce(lines, {[], nil}, fn line, {events, parent_id} ->
      case parse_bsl_line(line) do
        {:ok, 0, base, type, value} ->
          # Root level: Base: Type: Value
          actual_type = type || infer_type(value)

          event_data = %{
            "base" => base,
            "type" => actual_type,
            "value" => value,
            "actor" => actor,
            "session" => session,
            "cause" => nil
          }

          event = Event.new(event_data)
          {events ++ [Event.to_map(event)], event.id}

        {:ok, _nesting, nil, type, value} ->
          # Nested: : Type: Value (uses parent base)
          parent_base = get_parent_base(events, parent_id)

          event_data = %{
            "base" => parent_base,
            "type" => type,
            "value" => value,
            "actor" => actor,
            "session" => session,
            "cause" => parent_id
          }

          event = Event.new(event_data)
          {events ++ [Event.to_map(event)], parent_id}

        :error ->
          {events, parent_id}
      end
    end)

    events
  end

  defp infer_type(value) do
    cond do
      String.starts_with?(value, "Model ") -> "Model"
      String.match?(value, ~r/^[a-z_]/) -> "Individual"
      true -> "Instance"
    end
  end

  defp parse_bsl_line(line) do
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
    case Enum.find(events, fn e -> e.id == parent_id end) do
      %{base: base} -> base
      %{"base" => base} -> base
      _ -> "Unknown"
    end
  end

  # Convert events to BSL text format
  defp events_to_bsl(events) do
    # Group by base for better readability
    grouped = Enum.group_by(events, & &1.base)

    grouped
    |> Enum.map(fn {base, evts} ->
      evts
      |> Enum.map(fn e ->
        value = format_bsl_value(e.value)
        "#{e.base}: #{e.type}: #{value}"
      end)
      |> Enum.join("\n")
    end)
    |> Enum.join("\n\n")
  end

  defp format_bsl_value(value) when is_binary(value), do: value
  defp format_bsl_value(value) when is_number(value), do: to_string(value)
  defp format_bsl_value(value) when is_boolean(value), do: to_string(value)
  defp format_bsl_value(value) when is_list(value), do: Jason.encode!(value)
  defp format_bsl_value(value) when is_map(value), do: Jason.encode!(value)
  defp format_bsl_value(nil), do: ""
  defp format_bsl_value(value), do: inspect(value)
end
