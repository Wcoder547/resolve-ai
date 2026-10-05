# ResolveAI Production Deployment Guide

This document outlines the step-by-step process for deploying the complete ResolveAI stack (Next.js Frontend, Node.js API, Python AI Service, PostgreSQL, Redis) onto a single AWS EC2 instance. 

---

## 1. Architecture Overview
- **Server:** Single AWS EC2 Instance (Ubuntu)
- **Reverse Proxy:** Caddy (handles automatic SSL/TLS via Let's Encrypt and routes traffic to internal containers).
- **Frontend:** Next.js (Standalone Docker container, routed via `resolveai.vynuro.tech`).
- **Backend API:** Node.js / Express / Prisma (Docker container, routed via `api.resolveai.vynuro.tech`).
- **AI Service:** Python / FastAPI (Docker container, internal only).
- **Databases:** PostgreSQL (pgvector) and Redis (internal only).

---

## 2. Infrastructure & DNS Setup

### AWS EC2 Setup
1. Launch an Ubuntu EC2 instance (e.g., `t3.medium` or larger recommended for building Next.js and Prisma).
2. Attach a Security Group that allows inbound traffic on:
   - Port `22` (SSH)
   - Port `80` (HTTP - required for Let's Encrypt)
   - Port `443` (HTTPS)
3. Connect to the instance via SSH.

### Domain Configuration
In your domain registrar (e.g., Cloudflare, Namecheap), create two `A` records pointing to the public IP of your EC2 instance:
1. `resolveai.vynuro.tech` -> `16.176.71.200`
2. `api.resolveai.vynuro.tech` -> `16.176.71.200`

---

## 3. Server Provisioning

SSH into your EC2 instance using your `.pem` key:

```bash
ssh -i "resolveai.pem" ubuntu@ec2-16-176-71-200.ap-southeast-2.compute.amazonaws.com
```

Once inside the server, run the following commands to install Docker and clone the repository:

```bash
# Update system and install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose-v2 git -y

# Add ubuntu user to docker group (so you don't need sudo)
sudo usermod -aG docker ubuntu
newgrp docker

# Clone the repository
git clone https://github.com/Wcoder547/resolve-ai.git
cd resolve-ai
```

---

## 4. Environment Variables

Create the `.env.production` file on the server. Do **not** commit this file to version control.
This single file is passed to all containers via `env_file: - .env.production` in Docker Compose.

```bash
nano .env.production
```

**Required Variables:**
```env
# Application
ENVIRONMENT="production"
FRONTEND_URL="https://resolveai.vynuro.tech"
API_URL="https://api.resolveai.vynuro.tech"
CORS_ORIGIN="https://resolveai.vynuro.tech"

# Databases (Ensure strong passwords!)
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="your_secure_password"
POSTGRES_DB="resolveai_prod"
DATABASE_URL="postgresql://postgres:your_secure_password@postgres:5432/resolveai_prod?schema=public"
REDIS_URL="redis://redis:6379"

# AI Service
AI_SERVICE_URL="http://ai-service:8000"
LLM_PROVIDER="groq" # or openai, anthropic
GROQ_API_KEY="gsk_..."

# Security / JWT
JWT_ACCESS_SECRET="your_long_secure_random_string"
JWT_REFRESH_SECRET="your_long_secure_random_string"
INTEGRATION_SECRET_ENCRYPTION_KEY="32_character_secure_string_here!!"

# Email / Resend
RESEND_API_KEY="re_..."
EMAIL_FROM="hello@resolveai.vynuro.tech"

# Cloudflare R2 Storage (For uploads)
R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_access_key"
R2_SECRET_ACCESS_KEY="your_secret_key"
R2_BUCKET_NAME="resolveai-uploads"
R2_PUBLIC_URL="https://pub-xxxx.r2.dev"
```

---

## 5. Deployment Execution

The project includes a robust bash script that automatically backs up the database, pulls the latest code, runs security checks, and builds/starts the Docker containers.

To deploy or update the stack, run:
```bash
ENV_FILE=.env.production ./scripts/ops/deploy-production.sh
```

### What this script does:
1. Creates a `.sql.gz` backup of the PostgreSQL database in `./backups`.
2. Runs a `git reset --hard origin/main` to pull the latest code.
3. Validates that security variables (like JWT secrets) are safely set.
4. Builds all images using `docker compose build`.
5. Starts the stack (`postgres`, `redis`, `api-migrate`, `api`, `web`, `ai-service`, `caddy`).
6. Runs a health check against the API.

---

## 6. Common Gotchas & Troubleshooting

### 1. Caddy Configuration Not Reloading
If you update the `caddy/Caddyfile` (e.g., to add a new subdomain) and run the deployment script, **Caddy will not automatically restart** because the config file is mounted as a volume.
**Fix:** Manually restart Caddy after deployment.
```bash
docker restart resolveai_caddy_prod
```

### 2. Prisma 7 "url property no longer supported" Error
Prisma 7 removes support for `url = env("DATABASE_URL")` directly in `schema.prisma`. It requires a `prisma.config.ts` file. 
Ensure that `prisma.config.ts` is explicitly copied into the Docker container in `services/api/Dockerfile`, otherwise the `api-migrate` container will immediately crash with Error Code P1012.

### 3. NPM/PNPM Lockfile Caching in Docker
If the `api` or `web` container build fails with `ERR_PNPM_OUTDATED_LOCKFILE` or `Cannot read properties of null (reading 'edgesOut')`, it's due to lockfile version mismatching inside the Docker build context.
**Fix:** The Dockerfiles are configured to use `npm install -g npm@12.2.0 && npm install --legacy-peer-deps` to bypass strict lockfile validation and peer dependency conflicts during deployment.

### 4. Next.js Typescript Errors Blocking Build
By default, Next.js will crash the `npm run build` command if it detects any TypeScript or ESLint errors, bringing down the entire deployment. 
**Fix:** `apps/web/next.config.ts` is configured with `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` to ensure minor UI typing mistakes don't block critical production deployments.

### 5. Seeing Container Logs
If a specific service is failing or restarting, check its logs:
```bash
docker logs resolveai_api_prod --tail 100 -f
docker logs resolveai_web_prod --tail 100 -f
docker logs resolveai_caddy_prod --tail 100 -f
```
