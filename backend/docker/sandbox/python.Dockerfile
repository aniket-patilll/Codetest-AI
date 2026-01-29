FROM python:3.11-slim

# Install common libraries for complex algorithmic/data questions
RUN pip install --no-cache-dir numpy pandas scipy

RUN useradd -m -s /bin/bash sandbox
USER sandbox
WORKDIR /home/sandbox

# No network access needed
