FROM nginx:alpine

# Copy static files
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Default environment variables (non-sensitive only)
# API keys are passed via docker-compose at runtime
ENV PROD_HOST=prostodoska.ru
ENV LLM_PROVIDER=openrouter
ENV LLM_MODEL=anthropic/claude-3.5-sonnet

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
