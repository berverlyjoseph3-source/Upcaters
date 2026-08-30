#!/bin/sh
# enterprise-ai-agent-platform/apps/api/docker-entrypoint.sh

set -e

echo "Starting API container..."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed database if needed
if [ "$NODE_ENV" = "development" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

# Execute the main command
exec "$@"