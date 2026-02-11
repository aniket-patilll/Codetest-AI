FROM openjdk:17-jdk-slim

# Minimal Java environment for sandboxed execution
RUN useradd -m -s /bin/bash sandbox
USER sandbox
WORKDIR /home/sandbox
