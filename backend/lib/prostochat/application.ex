defmodule Prostochat.Application do
  @moduledoc """
  OTP Application for Prostochat.
  Starts Mnesia, HTTP server, and other services.
  """
  use Application
  require Logger

  @impl true
  def start(_type, _args) do
    port = Application.get_env(:prostochat, :port, 3081)
    host = Application.get_env(:prostochat, :host, "localhost")

    # Initialize Mnesia before starting supervision tree
    init_mnesia()

    children = [
      # Event storage GenServer
      Prostochat.Storage,
      # HTTP server
      {Plug.Cowboy, scheme: :http, plug: Prostochat.Router, options: [port: port, ip: {0, 0, 0, 0}]}
    ]

    opts = [strategy: :one_for_one, name: Prostochat.Supervisor]

    Logger.info("Starting Prostochat on port #{port}")
    Logger.info("Admin interface: http://#{host}:#{port}/admin")
    Logger.info("API endpoint: http://#{host}:#{port}/api")
    Logger.info("Health check: http://#{host}:#{port}/health")

    Supervisor.start_link(children, opts)
  end

  defp init_mnesia do
    # Set Mnesia directory
    mnesia_dir = Application.get_env(:prostochat, :mnesia_dir, './mnesia')
    :application.set_env(:mnesia, :dir, String.to_charlist(mnesia_dir))

    # Create schema if doesn't exist
    case :mnesia.create_schema([node()]) do
      :ok -> Logger.info("Mnesia schema created")
      {:error, {_, {:already_exists, _}}} -> Logger.debug("Mnesia schema exists")
      {:error, reason} -> Logger.warning("Mnesia schema error: #{inspect(reason)}")
    end

    # Start Mnesia
    :ok = :mnesia.start()
    Logger.info("Mnesia started")

    # Create tables
    create_tables()
  end

  defp create_tables do
    # Events table - main storage (ram_copies - data loaded from BSL on restart)
    case :mnesia.create_table(:events, [
      attributes: [:id, :base, :type, :value, :actor, :date, :cause, :model, :session],
      ram_copies: [node()],
      type: :set
    ]) do
      {:atomic, :ok} ->
        Logger.info("Events table created")
      {:aborted, {:already_exists, :events}} ->
        Logger.debug("Events table exists")
      {:aborted, reason} ->
        Logger.warning("Events table error: #{inspect(reason)}")
        # Fallback: try to just use the existing table
        :ok
    end

    # Wait for tables with longer timeout
    case :mnesia.wait_for_tables([:events], 10_000) do
      :ok -> :ok
      {:timeout, _} -> Logger.warning("Timeout waiting for tables")
      {:error, reason} -> Logger.error("Table wait error: #{inspect(reason)}")
    end
  end
end
