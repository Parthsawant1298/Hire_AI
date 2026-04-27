# Use a stable Python version for AI libraries
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
# We use a specific order to ensure stability with InsightFace
RUN pip install --no-cache-dir numpy==1.26.4
RUN pip install --no-cache-dir onnxruntime
RUN pip install --no-cache-dir insightface --no-deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the service code
COPY . .

# Create a startup script to run both services
RUN echo '#!/bin/bash\n\
python voice_service.py & \n\
python face_service.py & \n\
wait -n \n\
exit $?' > /app/start.sh && chmod +x /app/start.sh

# Expose the unified port
EXPOSE 8080

# Health check using the gateway endpoint
HEALTHCHECK --interval=30s --timeout=30s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the unified gateway
CMD ["python", "ai_gateway.py"]
