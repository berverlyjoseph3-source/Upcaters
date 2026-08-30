# enterprise-ai-agent-platform/Makefile
.PHONY: help install dev build test lint clean docker-build docker-up docker-down migrate seed deploy staging production

# Colors for output
GREEN := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
RED := $(shell tput -Txterm setaf 1)
RESET := $(shell tput -Txterm sgr0)

help: ## Show this help message
@echo ''
@echo '${GREEN}AI Agent Platform - Makefile Commands${RESET}'
@echo ''
@fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\\$$//' | sed -e 's/##//' | awk -F':' '{ printf "${YELLOW}%-25s${RESET} %s\n", $$1, $$2 }'

# ============================================
# Development Commands
# ============================================

install: ## Install all dependencies
@echo "${GREEN}Installing dependencies...${RESET}"
cd apps/api && npm ci
cd apps/frontend && npm ci
@echo "${GREEN}Dependencies installed${RESET}"

dev: ## Start development servers
@echo "${GREEN}Starting development servers...${RESET}"
@make -j2 dev-api dev-frontend

dev-api: ## Start API in development mode
@echo "${GREEN}Starting API server...${RESET}"
cd apps/api && npm run dev

dev-frontend: ## Start frontend in development mode
@echo "${GREEN}Starting frontend server...${RESET}"
cd apps/frontend && npm run dev

dev-docker: ## Start all services with Docker Compose
@echo "${GREEN}Starting Docker Compose services...${RESET}"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
@echo "${GREEN}Services started. API: http://localhost:3000, Frontend: http://localhost:3001${RESET}"

dev-logs: ## View Docker Compose logs
docker-compose logs -f

# ============================================
# Build Commands
# ============================================

build: ## Build all applications
@echo "${GREEN}Building applications...${RESET}"
@make build-api build-frontend

build-api: ## Build API
@echo "${GREEN}Building API...${RESET}"
cd apps/api && npm run build

build-frontend: ## Build frontend
@echo "${GREEN}Building frontend...${RESET}"
cd apps/frontend && npm run build

build-docker: ## Build Docker images
@echo "${GREEN}Building Docker images...${RESET}"
docker build -t ai-agent-platform/api:latest -f apps/api/Dockerfile ./apps/api
docker build -t ai-agent-platform/worker:latest -f apps/api/Dockerfile.worker ./apps/api
docker build -t ai-agent-platform/frontend:latest -f apps/frontend/Dockerfile ./apps/frontend

# ============================================
# Testing Commands
# ============================================

test: ## Run all tests
@echo "${GREEN}Running tests...${RESET}"
@make test-api test-frontend

test-api: ## Run API tests
@echo "${GREEN}Running API tests...${RESET}"
cd apps/api && npm test

test-frontend: ## Run frontend tests
@echo "${GREEN}Running frontend tests...${RESET}"
cd apps/frontend && npm test

test-coverage: ## Run tests with coverage
@echo "${GREEN}Running tests with coverage...${RESET}"
cd apps/api && npm run test:coverage
cd apps/frontend && npm run test:coverage

test-integration: ## Run integration tests
@echo "${GREEN}Running integration tests...${RESET}"
cd apps/api && npm run test:integration

test-load: ## Run load tests with k6
@echo "${GREEN}Running load tests...${RESET}"
k6 run tests/load/spike-test.js

lint: ## Run linters
@echo "${GREEN}Running linters...${RESET}"
cd apps/api && npm run lint
cd apps/frontend && npm run lint

format: ## Format code
@echo "${GREEN}Formatting code...${RESET}"
cd apps/api && npm run format
cd apps/frontend && npm run format

# ============================================
# Database Commands
# ============================================

migrate: ## Run database migrations
@echo "${GREEN}Running database migrations...${RESET}"
cd apps/api && npx prisma migrate deploy

migrate-dev: ## Create a new migration
@echo "${GREEN}Creating new migration...${RESET}"
cd apps/api && npx prisma migrate dev --name $(name)

generate: ## Generate Prisma client
@echo "${GREEN}Generating Prisma client...${RESET}"
cd apps/api && npx prisma generate

seed: ## Seed database
@echo "${GREEN}Seeding database...${RESET}"
cd apps/api && npx prisma db seed

studio: ## Open Prisma Studio
@echo "${GREEN}Opening Prisma Studio...${RESET}"
cd apps/api && npx prisma studio

reset-db: ## Reset database
@echo "${RED}Resetting database...${RESET}"
cd apps/api && npx prisma migrate reset --force

# ============================================
# Docker Commands
# ============================================

docker-up: ## Start Docker Compose services
@echo "${GREEN}Starting Docker Compose services...${RESET}"
docker-compose up -d

docker-down: ## Stop Docker Compose services
@echo "${GREEN}Stopping Docker Compose services...${RESET}"
docker-compose down

docker-down-volumes: ## Stop Docker Compose services and remove volumes
@echo "${RED}Stopping services and removing volumes...${RESET}"
docker-compose down -v

docker-logs: ## View Docker Compose logs
docker-compose logs -f

docker-clean: ## Remove all Docker containers, images, and volumes
@echo "${RED}Cleaning Docker resources...${RESET}"
docker system prune -af --volumes

# ============================================
# Deployment Commands
# ============================================

deploy-staging: ## Deploy to staging environment
@echo "${GREEN}Deploying to staging...${RESET}"
./scripts/deploy.sh staging

deploy-production: ## Deploy to production environment
@echo "${RED}Deploying to production...${RESET}"
./scripts/deploy.sh production

deploy-helm: ## Deploy using Helm
@echo "${GREEN}Deploying with Helm...${RESET}"
helm upgrade --install ai-agent-platform ./helm/ai-agent-platform \
--namespace ai-agent-platform \
--create-namespace \
--values ./helm/ai-agent-platform/values-prod.yaml \
--wait

deploy-terraform: ## Deploy infrastructure with Terraform
@echo "${GREEN}Deploying infrastructure with Terraform...${RESET}"
cd terraform && terraform init && terraform apply -auto-approve

# ============================================
# Utility Commands
# ============================================

clean: ## Clean build artifacts
@echo "${GREEN}Cleaning build artifacts...${RESET}"
rm -rf apps/api/dist
rm -rf apps/frontend/dist
rm -rf apps/api/coverage
rm -rf apps/frontend/coverage

logs-api: ## View API logs
@echo "${GREEN}Viewing API logs...${RESET}"
cd apps/api && tail -f logs/combined.log

logs-worker: ## View worker logs
@echo "${GREEN}Viewing worker logs...${RESET}"
cd apps/api && tail -f logs/worker.log

status: ## Check service status
@echo "${GREEN}Service status:${RESET}"
@echo "API: http://localhost:3000/health"
@echo "Frontend: http://localhost:3001"
@echo "Prisma Studio: http://localhost:5555"
@echo "MailHog: http://localhost:8025"

env: ## Show environment configuration
@echo "${GREEN}Environment configuration:${RESET}"
@echo "NODE_ENV: ${NODE_ENV:-development}"
@echo "API_URL: ${API_URL:-http://localhost:3000}"
@echo "APP_URL: ${APP_URL:-http://localhost:3001}"

version: ## Show version information
@echo "${GREEN}AI Agent Platform${RESET}"
@echo "Version: 1.0.0"
@echo "Node: $(shell node --version)"
@echo "npm: $(shell npm --version)"
@echo "Docker: $(shell docker --version)"
@echo "kubectl: $(shell kubectl version --client -o json | jq -r .clientVersion.gitVersion)"
@echo "Helm: $(shell helm version --short)"

# ============================================
# Security Commands
# ============================================

audit: ## Run security audit
@echo "${GREEN}Running security audit...${RESET}"
cd apps/api && npm audit
cd apps/frontend && npm audit

security-scan: ## Run security scan with Trivy
@echo "${GREEN}Running security scan...${RESET}"
trivy fs --severity HIGH,CRITICAL --exit-code 1 .

# ============================================
# Backup Commands
# ============================================

backup: ## Backup database
@echo "${GREEN}Backing up database...${RESET}"
./scripts/backup-db.sh

restore: ## Restore database
@echo "${RED}Restoring database...${RESET}"
./scripts/restore-db.sh $(FILE)

# ============================================
# Default target
# ============================================

.DEFAULT_GOAL := help