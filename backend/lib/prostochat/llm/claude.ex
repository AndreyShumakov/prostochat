defmodule Prostochat.LLM.Claude do
  @moduledoc """
  Anthropic Claude API client.
  """
  require Logger

  @api_url "https://api.anthropic.com/v1/messages"

  def chat(message, system_prompt, opts \\ []) do
    api_key = opts[:api_key] || Application.get_env(:prostochat, :claude_api_key)
    model = opts[:model] || "claude-3-5-sonnet-20241022"

    if is_nil(api_key) or api_key == "" do
      {:error, :no_api_key}
    else
      send_request(message, system_prompt, api_key, model)
    end
  end

  defp send_request(message, system_prompt, api_key, model) do
    body = %{
      "model" => model,
      "max_tokens" => 4096,
      "system" => system_prompt,
      "messages" => [
        %{"role" => "user", "content" => message}
      ]
    }

    headers = [
      {"content-type", "application/json"},
      {"x-api-key", api_key},
      {"anthropic-version", "2023-06-01"}
    ]

    Logger.info("Sending request to Claude API (#{model})...")

    case Req.post(@api_url, json: body, headers: headers, receive_timeout: 60_000) do
      {:ok, %{status: 200, body: response}} ->
        content = get_in(response, ["content", Access.at(0), "text"]) || ""
        Logger.info("Claude response received, length: #{String.length(content)}")
        {:ok, content}

      {:ok, %{status: status, body: resp_body}} ->
        Logger.error("Claude API error: #{status} - #{inspect(resp_body)}")
        {:error, {:api_error, status, resp_body}}

      {:error, reason} ->
        Logger.error("Claude request failed: #{inspect(reason)}")
        {:error, reason}
    end
  end
end
