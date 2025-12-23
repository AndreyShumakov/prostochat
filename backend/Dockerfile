# Build stage
FROM elixir:1.15-alpine AS builder

RUN apk add --no-cache build-base git

WORKDIR /app

# Install hex and rebar
RUN mix local.hex --force && mix local.rebar --force

# Copy mix files
COPY mix.exs ./
RUN mix deps.get --only prod
RUN MIX_ENV=prod mix deps.compile

# Copy source
COPY config config/
COPY lib lib/
COPY priv priv/

# Compile and build release
RUN MIX_ENV=prod mix compile
RUN MIX_ENV=prod mix release

# Runtime stage
FROM alpine:3.18

RUN apk add --no-cache libstdc++ openssl ncurses-libs curl

WORKDIR /app

# Copy release
COPY --from=builder /app/_build/prod/rel/prostochat ./

# Create Mnesia directory
RUN mkdir -p /app/mnesia

ENV PORT=3081
ENV MNESIA_DIR=/app/mnesia

EXPOSE 3081

CMD ["bin/prostochat", "start"]
