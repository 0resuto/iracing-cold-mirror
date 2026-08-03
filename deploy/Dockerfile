FROM python:3.11-slim

WORKDIR /app

# Create unprivileged user
RUN useradd -m -u 1000 appuser

COPY pyproject.toml ./
RUN pip install --no-cache-dir . 2>/dev/null || true

COPY . .
RUN pip install --no-cache-dir .

COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown -R appuser:appuser /app /entrypoint.sh

USER appuser

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]

