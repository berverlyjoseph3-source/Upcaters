#!/bin/bash
# enterprise-ai-agent-platform/scripts/migrate-db.sh
# Database migration script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
MIGRATION_DIR="./apps/api/prisma/migrations"

echo -e "${GREEN}🔄 Starting database migration for ${ENVIRONMENT} environment...${NC}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'development', 'staging', or 'production'${NC}"
    exit 1
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    echo -e "${YELLOW}Loading environment variables from .env.${ENVIRONMENT}${NC}"
    export $(grep -v '^#' .env.${ENVIRONMENT} | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL}" ]; then
    echo -e "${RED}Error: DATABASE_URL is not set${NC}"
    exit 1
fi

# Navigate to API directory
cd apps/api

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm ci
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# Run migrations
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}Running migrations in production mode...${NC}"
    npx prisma migrate deploy
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo -e "${YELLOW}Running migrations in staging mode...${NC}"
    npx prisma migrate deploy
else
    echo -e "${YELLOW}Creating new migration...${NC}"
    read -p "Enter migration name: " MIGRATION_NAME
    npx prisma migrate dev --name ${MIGRATION_NAME}
fi

# Seed database if needed
if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${YELLOW}Seeding database...${NC}"
    npx prisma db seed
fi

# Verify migration
echo -e "${YELLOW}Verifying migration...${NC}"
npx prisma validate

echo -e "${GREEN}✅ Migration completed successfully!${NC}"

# Print migration status
echo -e "\n${YELLOW}Migration status:${NC}"
npx prisma migrate status