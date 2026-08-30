# Enterprise AI Agent Platform

[![CI/CD Pipeline](https://github.com/your-org/ai-agent-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/ai-agent-platform/actions/workflows/ci.yml)
[![Code Coverage](https://codecov.io/gh/your-org/ai-agent-platform/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/ai-agent-platform)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

## Overview

The **Enterprise AI Agent Platform** is a production-ready SaaS application that orchestrates 7 specialized AI agents from a central "Ultimate AI Agent". The platform integrates with real external services (email, drive, calendar, social, tasks, web) and enforces tiered pricing plans with hard usage limits per tier.

---

## Architecture

```
[User / Client App]
│
▼
[API Gateway + Auth Layer]  ←── JWT + OAuth2 + API Key management
│
▼
[Ultimate AI Agent — Central Orchestrator]
│
├──► Email Agent        (Gmail / Outlook)
├──► Drive Agent        (Google Drive / OneDrive / SharePoint)
├──► Content Agent      (GPT-4, Claude, Gemini)
├──► Social Agent       (LinkedIn, Instagram, Facebook, X)
├──► Calendar Agent     (Google Calendar / Outlook Calendar)
├──► Web Agent          (Perplexity, Brave Search, OpenWeatherMap)
└──► Task Agent         (Google Tasks, Asana, Monday.com)
│
▼
[Shared Memory Layer]  ←── Redis + PostgreSQL + MongoDB
│
▼
[Usage Metering Engine]  ←── Tracks tokens, API calls, actions
│
▼
[Billing & Plan Enforcement]  ←── Stripe integration
│
▼
[Admin Dashboard]  ←── Full platform analytics, user management
```

---

## Features

### 🤖 7 Specialized AI Agents

- **Email Agent** — Gmail integration with smart replies, labeling, and classification
- **Drive Agent** — Google Drive file management, search, and sharing
- **Content Agent** — Text, image, and video generation with GPT-4, Claude, Gemini
- **Social Agent** — Multi-platform posting to LinkedIn, Instagram, Facebook, X
- **Calendar Agent** — Smart scheduling, meeting management, availability coordination
- **Web Agent** — Web search, research, weather, and data extraction
- **Task Agent** — Task management across Google Tasks, Asana, Monday.com

### 💳 Tiered Pricing Plans

| Plan         | Price      | AI Actions    | API Calls      | Features                                     |
|--------------|------------|---------------|----------------|----------------------------------------------|
| FREE         | $0/month   | 50/month      | 100/month      | Basic agents, community support              |
| STARTER      | $29/month  | 500/month     | 2,000/month    | Drive, Social, Task agents                   |
| PROFESSIONAL | $99/month  | 2,500/month   | 15,000/month   | Image generation, API access                 |
| ENTERPRISE   | $499/month | Unlimited     | Unlimited      | Video generation, White-label, SLA           |

### 🔐 Security Features

- JWT authentication with refresh tokens
- OAuth2 for Google, LinkedIn, Facebook, X
- API key authentication (PROFESSIONAL+)
- Rate limiting (100/1000 req/min)
- Role-based access control (Admin, Support, User)
- Encrypted secrets with AES-256-GCM

### 📊 Monitoring & Analytics

- Real-time usage dashboards
- Cost analysis and forecasting
- Audit logs for compliance
- Prometheus metrics + Grafana dashboards
- Sentry error tracking

---

## Tech Stack

| Layer          | Technology                                          |
|----------------|-----------------------------------------------------|
| Backend        | Node.js + Express + TypeScript                      |
| Frontend       | React 18 + TypeScript + TailwindCSS                 |
| Database       | PostgreSQL + Redis + MongoDB                        |
| AI Models      | OpenAI GPT-4, Anthropic Claude, Google Gemini       |
| Auth           | JWT + OAuth2                                        |
| Payments       | Stripe                                              |
| Queue          | BullMQ                                              |
| Infrastructure | Docker + Kubernetes + Terraform (AWS)               |
| CI/CD          | GitHub Actions                                      |

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ai-agent-platform.git
cd ai-agent-platform

# Copy environment variables
cp apps/api/.env.example apps/api/.env
cp apps/frontend/.env.example apps/frontend/.env

# Install dependencies
cd apps/api && npm install
cd ../frontend && npm install

# Set up database
cd ../api
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Start development servers
npm run dev  # API on port 3000
cd ../frontend && npm run dev  # Frontend on port 3001
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Kubernetes

```bash
# Deploy to Kubernetes
cd helm
helm upgrade --install ai-agent-platform ./ai-agent-platform \
  --namespace ai-agent-platform \
  --create-namespace \
  --values ./ai-agent-platform/values-prod.yaml
```

---

## API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Refresh token
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Agent Execution

```bash
# Execute agent
POST /api/agent/execute
{
  "input": "Send an email to john@example.com saying Hello",
  "sessionId": "session_123"
}

# Stream agent response (SSE)
POST /api/agent/stream
{
  "input": "What's the weather in New York?",
  "sessionId": "session_123"
}
```

### Usage & Billing

```bash
# Get usage statistics
GET /api/usage/stats

# Get billing summary
GET /api/billing/summary

# Create checkout session
POST /api/billing/create-checkout
{
  "planId": "PROFESSIONAL",
  "interval": "month"
}
```

---

## Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aiagent
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/aiagent

# JWT
JWT_SECRET=your_jwt_secret_32_chars_min
JWT_REFRESH_SECRET=your_refresh_secret_32_chars_min
ENCRYPTION_KEY=32_byte_hex_key

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
FACEBOOK_APP_ID=...
TWITTER_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SENDGRID_API_KEY=SG...
FROM_EMAIL=noreply@aiagentplatform.com
```

---

## Deployment

### AWS Deployment with Terraform

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Manual Deployment

```bash
# Build images
docker build -t ai-agent-platform/api ./apps/api
docker build -t ai-agent-platform/frontend ./apps/frontend

# Push to registry
docker tag ai-agent-platform/api ghcr.io/your-org/api:latest
docker push ghcr.io/your-org/api:latest

# Deploy with Helm
helm upgrade --install ai-agent-platform ./helm/ai-agent-platform \
  --values ./helm/ai-agent-platform/values-prod.yaml
```

---

## Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run load tests (k6)
k6 run tests/load/spike-test.js

# Run E2E tests
npm run test:e2e
```

---

## Monitoring

- **Health checks:** https://api.aiagentplatform.com/health
- **Metrics:** https://api.aiagentplatform.com/health/metrics
- **Grafana:** https://monitoring.aiagentplatform.com
- **Sentry:** Error tracking dashboard

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Proprietary — All rights reserved

---

## Support

- **Documentation:** https://docs.aiagentplatform.com
- **Email:** support@aiagentplatform.com
- **Slack:** https://slack.aiagentplatform.com

---

## Contributors

- AI Agent Platform Team

---

## Acknowledgments

- [OpenAI](https://openai.com) for GPT-4 API
- [Anthropic](https://anthropic.com) for Claude API
- [Google](https://ai.google.dev) for Gemini API
- [Stripe](https://stripe.com) for payment processing
# Upcater
