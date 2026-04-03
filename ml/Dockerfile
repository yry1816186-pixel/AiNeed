FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security.
RUN groupadd -r aiuser && useradd -r -g aiuser -u 1000 aiuser

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# IDM-VTON custom modules import einops but the legacy requirements file omits it.
RUN pip install --no-cache-dir einops

ENV HOME=/home/aiuser
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV YOLO_CONFIG_DIR=/tmp/Ultralytics

COPY . .

# Create directories and set ownership
RUN mkdir -p /app/models /app/data/indices && \
    mkdir -p /home/aiuser /tmp/matplotlib /tmp/Ultralytics && \
    chown -R aiuser:aiuser /home/aiuser /tmp/matplotlib /tmp/Ultralytics && \
    chown -R aiuser:aiuser /app

# Switch to non-root user
USER aiuser

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["python", "-m", "uvicorn", "services.ai_service:app", "--host", "0.0.0.0", "--port", "8001"]
