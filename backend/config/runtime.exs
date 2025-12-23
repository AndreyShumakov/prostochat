import Config

# Runtime configuration - read at application start, not compile time
config :prostochat,
  port: String.to_integer(System.get_env("PORT") || "3081"),
  host: System.get_env("PROD_HOST") || "localhost",
  mnesia_dir: System.get_env("MNESIA_DIR") || "./mnesia",
  openrouter_api_key: System.get_env("OPENROUTER_API_KEY"),
  claude_api_key: System.get_env("CLAUDE_API_KEY"),
  llm_provider: System.get_env("LLM_PROVIDER") || "openrouter",
  llm_model: System.get_env("LLM_MODEL") || "anthropic/claude-3.5-sonnet"
