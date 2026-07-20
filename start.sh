#!/bin/bash

# Start docker
docker compose up -d

# Create a new tmux session named 'dev-env' in the background
tmux new-session -d -s dev-env

# Tab 1: Web
tmux rename-window 'Web'
tmux send-keys 'cd apps/web/ && pnpm dev' C-m

# Tab 2: API
tmux new-window -n 'API'
tmux send-keys 'cd services/api/ && pnpm dev' C-m

# Tab 3: AI Service
tmux new-window -n 'AI'
# Note: Added 'python main.py' as a placeholder to actually start the AI server
tmux send-keys 'cd services/ai-service/ && source .venv/bin/activate && python main.py' C-m 

# Attach to the session so you can see it
tmux attach-session -t dev-env
