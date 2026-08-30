#!/bin/bash
# enterprise-ai-agent-platform/scripts/restore-db.sh
# Database restore script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_FILE=${1}
DATABASE_URL=${DATABASE_URL:-"postgresql://user:pass@localhost:5432/aiagent"}

echo -e "${GREEN}🔄 Starting database restore...${NC}"

# Validate backup file
if [ -z "${BACKUP_FILE}" ]; then
    echo -e "${RED}Error: Please provide backup file path${NC}"
    echo "Usage: ./restore-db.sh <backup-file>"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Parse database URL
DB_HOST=$(echo ${DATABASE_URL} | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo ${DATABASE_URL} | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo ${DATABASE_URL} | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo ${DATABASE_URL} | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo ${DATABASE_URL} | sed -n 's/.*:\([^@]*\)@.*/\1/p')

echo -e "${YELLOW}Restoring database: ${DB_NAME} from ${BACKUP_FILE}${NC}"

# Confirm restore
read -p "Are you sure you want to restore the database? This will overwrite current data. (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Restore cancelled.${NC}"
    exit 1
fi

# Drop existing connections
echo -e "${YELLOW}Terminating existing connections...${NC}"
export PGPASSWORD=${DB_PASSWORD}
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
" 2>/dev/null || true

# Drop and recreate database
echo -e "${YELLOW}Recreating database...${NC}"
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
echo -e "${YELLOW}Restoring data...${NC}"
if [[ ${BACKUP_FILE} == *.dump ]]; then
    pg_restore -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} \
        --clean \
        --if-exists \
        --no-owner \
        --verbose \
        ${BACKUP_FILE}
elif [[ ${BACKUP_FILE} == *.sql.gz ]]; then
    gunzip -c ${BACKUP_FILE} | psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}
elif [[ ${BACKUP_FILE} == *.sql ]]; then
    psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} < ${BACKUP_FILE}
else
    echo -e "${RED}Error: Unsupported backup format${NC}"
    exit 1
fi

unset PGPASSWORD

# Restore Redis if backup exists
REDIS_BACKUP=$(ls -t /var/backups/ai-agent-platform/redis_*.rdb 2>/dev/null | head -1)
if [ -n "${REDIS_BACKUP}" ] && command -v redis-cli &>/dev/null; then
    echo -e "${YELLOW}Restoring Redis...${NC}"
    sudo systemctl stop redis
    sudo cp ${REDIS_BACKUP} /var/lib/redis/dump.rdb
    sudo chown redis:redis /var/lib/redis/dump.rdb
    sudo systemctl start redis
fi

# Restore MongoDB if backup exists
MONGO_BACKUP=$(ls -t /var/backups/ai-agent-platform/mongodb_*.tar.gz 2>/dev/null | head -1)
if [ -n "${MONGO_BACKUP}" ] && command -v mongorestore &>/dev/null; then
    echo -e "${YELLOW}Restoring MongoDB...${NC}"
    TEMP_DIR=$(mktemp -d)
    tar -xzf ${MONGO_BACKUP} -C ${TEMP_DIR}
    mongorestore --drop ${TEMP_DIR}
    rm -rf ${TEMP_DIR}
fi

echo -e "${GREEN}✅ Restore completed successfully!${NC}"