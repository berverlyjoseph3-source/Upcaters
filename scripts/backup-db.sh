#!/bin/bash
# enterprise-ai-agent-platform/scripts/backup-db.sh
# Database backup script

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/var/backups/ai-agent-platform"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE_URL=${DATABASE_URL:-"postgresql://user:pass@localhost:5432/aiagent"}

echo -e "${GREEN}🔄 Starting database backup...${NC}"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Parse database URL
DB_HOST=$(echo ${DATABASE_URL} | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo ${DATABASE_URL} | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo ${DATABASE_URL} | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo ${DATABASE_URL} | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo ${DATABASE_URL} | sed -n 's/.*:\([^@]*\)@.*/\1/p')

echo -e "${YELLOW}Backing up database: ${DB_NAME}${NC}"

# Perform backup using pg_dump
export PGPASSWORD=${DB_PASSWORD}
pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} \
    --format=custom \
    --compress=9 \
    --file=${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump

unset PGPASSWORD

# Create a compressed SQL backup as well
export PGPASSWORD=${DB_PASSWORD}
pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} \
    --format=plain \
    --inserts \
    --compress=9 \
    --file=${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz

unset PGPASSWORD

# Backup Redis if needed
if command -v redis-cli &>/dev/null; then
    echo -e "${YELLOW}Backing up Redis...${NC}"
    REDIS_PASSWORD=${REDIS_PASSWORD:-""}
    if [ -n "${REDIS_PASSWORD}" ]; then
        redis-cli --pass ${REDIS_PASSWORD} SAVE
    else
        redis-cli SAVE
    fi
    cp /var/lib/redis/dump.rdb ${BACKUP_DIR}/redis_${TIMESTAMP}.rdb
fi

# Backup MongoDB if needed
if command -v mongodump &>/dev/null; then
    echo -e "${YELLOW}Backing up MongoDB...${NC}"
    mongodump --out ${BACKUP_DIR}/mongodb_${TIMESTAMP}
    tar -czf ${BACKUP_DIR}/mongodb_${TIMESTAMP}.tar.gz -C ${BACKUP_DIR} mongodb_${TIMESTAMP}
    rm -rf ${BACKUP_DIR}/mongodb_${TIMESTAMP}
fi

# Upload to S3 if configured
if [ -n "${AWS_S3_BACKUP_BUCKET}" ] && command -v aws &>/dev/null; then
    echo -e "${YELLOW}Uploading backups to S3...${NC}"
    aws s3 sync ${BACKUP_DIR} s3://${AWS_S3_BACKUP_BUCKET}/backups/$(date +%Y/%m/%d)/ \
        --exclude "*" \
        --include "${DB_NAME}_${TIMESTAMP}*" \
        --include "redis_${TIMESTAMP}*" \
        --include "mongodb_${TIMESTAMP}*"
fi

# Clean up old backups
echo -e "${YELLOW}Cleaning up backups older than ${RETENTION_DAYS} days...${NC}"
find ${BACKUP_DIR} -name "*.dump" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "*.rdb" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "Backup location: ${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"
echo -e "Backup size: $(du -h ${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump | cut -f1)"