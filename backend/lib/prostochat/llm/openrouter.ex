defmodule Prostochat.LLM.OpenRouter do
  @moduledoc """
  OpenRouter API client.
  """
  require Logger

  @api_url "https://openrouter.ai/api/v1/chat/completions"

  def chat(message, system_prompt, opts \\ []) do
    api_key = opts[:api_key] || Application.get_env(:prostochat, :openrouter_api_key)
    model = opts[:model] || Application.get_env(:prostochat, :llm_model, "anthropic/claude-3.5-sonnet")

    if is_nil(api_key) or api_key == "" do
      {:error, :no_api_key}
    else
      send_request(message, system_prompt, api_key, model)
    end
  end

  defp send_request(message, system_prompt, api_key, model) do
    body = %{
      "model" => model,
      "messages" => [
        %{"role" => "system", "content" => system_prompt},
        %{"role" => "user", "content" => message}
      ],
      "max_tokens" => 4096,
      "temperature" => 0.7
    }

    headers = [
      {"content-type", "application/json"},
      {"authorization", "Bearer #{api_key}"},
      {"http-referer", "http://localhost:3080"},
      {"x-title", "Prostochat"}
    ]

    Logger.info("Sending request to OpenRouter (#{model})...")

    case Req.post(@api_url, json: body, headers: headers, receive_timeout: 60_000) do
      {:ok, %{status: 200, body: response}} ->
        content = get_in(response, ["choices", Access.at(0), "message", "content"]) || ""
        Logger.info("OpenRouter response received, length: #{String.length(content)}")
        {:ok, content}

      {:ok, %{status: status, body: resp_body}} ->
        Logger.error("OpenRouter API error: #{status} - #{inspect(resp_body)}")
        {:error, {:api_error, status, resp_body}}

      {:error, reason} ->
        Logger.error("OpenRouter request failed: #{inspect(reason)}")
        {:error, reason}
    end
  end
end
