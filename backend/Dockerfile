FROM python:3.11-slim-bookworm
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.prod.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.prod.txt
COPY server.py .
COPY company_logo.jpeg .
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8001/api/auth/me || exit 1
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
