// enterprise-ai-agent-platform/apps/api/ecosystem.config.js
// PM2 configuration for production deployment

module.exports = {
  apps: [
    {
      name: 'ai-agent-api',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/ai-agent/api-error.log',
      out_file: '/var/log/ai-agent/api-out.log',
      log_file: '/var/log/ai-agent/combined.log',
      time: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      merge_logs: true,
      instances: 2,
      node_args: '--max-old-space-size=512'
    },
    {
      name: 'ai-agent-worker',
      script: 'dist/queues/worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/ai-agent/worker-error.log',
      out_file: '/var/log/ai-agent/worker-out.log',
      log_file: '/var/log/ai-agent/worker-combined.log',
      time: true,
      kill_timeout: 30000,
      shutdown_with_message: true,
      merge_logs: true
    },
    {
      name: 'ai-agent-cron',
      script: 'dist/cron/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/ai-agent/cron-error.log',
      out_file: '/var/log/ai-agent/cron-out.log',
      time: true,
      merge_logs: true
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['api1.aiagentplatform.com', 'api2.aiagentplatform.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/ai-agent-platform.git',
      path: '/var/www/ai-agent-platform',
      'post-deploy': 'cd apps/api && npm ci && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
      'pre-deploy': 'git fetch --all',
      'pre-deploy-local': 'echo "Starting deployment..."',
      env: {
        NODE_ENV: 'production'
      }
    },
    staging: {
      user: 'deploy',
      host: 'staging.aiagentplatform.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/ai-agent-platform.git',
      path: '/var/www/ai-agent-platform-staging',
      'post-deploy': 'cd apps/api && npm ci && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};