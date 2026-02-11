FROM gcc:latest

# Minimal C++ environment for sandboxed execution
RUN useradd -m -s /bin/bash sandbox
USER sandbox
WORKDIR /home/sandbox
