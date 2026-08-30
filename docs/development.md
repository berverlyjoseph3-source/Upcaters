# Development Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Performance Optimization](#performance-optimization)
8. [Security Guidelines](#security-guidelines)

---

## Getting Started

### Prerequisites

```bash
# Required versions
Node.js: 20.x or higher
npm: 10.x or higher
PostgreSQL: 15.x or higher
Redis: 7.x or higher
MongoDB: 7.x or higher
Docker: 24.x or higher (optional)
```

### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/ai-agent-platform.git
cd ai-agent-platform

# Copy environment files
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

### Using Docker Compose for Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

---

## Project Structure

```
apps/
├── api/                          # Backend API
│   ├── src/
│   │   ├── agents/               # AI Agents
│   │   │   ├── core/             # Base classes, interfaces
│   │   │   ├── orchestrator/     # Central orchestrator
│   │   │   ├── email/            # Email agent
│   │   │   ├── drive/            # Drive agent
│   │   │   ├── content/          # Content agent
│   │   │   ├── social/           # Social agent
│   │   │   ├── calendar/         # Calendar agent
│   │   │   ├── web/              # Web agent
│   │   │   └── task/             # Task agent
│   │   ├── auth/                 # Authentication
│   │   ├── billing/              # Stripe integration
│   │   ├── services/             # Business logic
│   │   ├── routes/               # API routes
│   │   ├── controllers/          # Request handlers
│   │   ├── middleware/           # Express middleware
│   │   ├── queues/               # BullMQ queues
│   │   ├── cron/                 # Scheduled jobs
│   │   ├── utils/                # Utilities
│   │   └── types/                # TypeScript types
│   ├── prisma/                   # Database schema
│   ├── tests/                    # Test files
│   └── package.json
│
└── frontend/                     # Frontend React app
    ├── src/
    │   ├── pages/                # Page components
    │   ├── components/           # Reusable components
    │   ├── hooks/                # Custom React hooks
    │   ├── store/                # Zustand stores
    │   ├── services/             # API services
    │   ├── types/                # TypeScript types
    │   └── utils/                # Utilities
    ├── public/                   # Static assets
    └── package.json
```

---

## Development Workflow

### Branch Strategy

```
main                # Production
├── staging         # Staging
├── develop         # Development
│   ├── feature/*   # New features
│   ├── fix/*       # Bug fixes
│   └── release/*   # Release preparation
```

### Creating a Feature

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Make changes, commit
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Convention

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Testing
- chore: Maintenance

Examples:
feat(email): add email classification tool
fix(auth): resolve token expiration issue
```

---

## Coding Standards

### TypeScript

```typescript
// ✅ Good: Explicit typing
interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

async function getUser(id: string): Promise<User | null> {
  return await prisma.user.findUnique({ where: { id } });
}

// ❌ Bad: Using any
function processData(data: any): any {
  return data;
}
```

### Error Handling

```typescript
// ✅ Good: Try-catch with specific errors
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error({ error }, 'Operation failed');
  if (error instanceof ValidationError) {
    return { success: false, error: 'Invalid input' };
  }
  return { success: false, error: 'Internal server error' };
}

// ❌ Bad: Empty catch block
try {
  await riskyOperation();
} catch (e) {}
```

### Logging

```typescript
// ✅ Good: Structured logging
logger.info({ userId, action: 'email_sent' }, 'Email sent successfully');
logger.error({ error, userId }, 'Failed to send email');

// ❌ Bad: Plain console.log
console.log('Email sent');
```

### Async/Await

```typescript
// ✅ Good: Proper async/await
async function fetchData() {
  const [user, posts] = await Promise.all([
    getUser(),
    getPosts()
  ]);
  return { user, posts };
}

// ❌ Bad: Callback hell
function fetchData(callback) {
  getUser((err, user) => {
    if (err) return callback(err);
    getPosts((err, posts) => {
      if (err) return callback(err);
      callback(null, { user, posts });
    });
  });
}
```

---

## Testing

### Unit Tests

```typescript
// apps/api/tests/email.service.test.ts
import { describe, it, expect } from '@jest/globals';
import { EmailService } from '../src/services/email.service';

describe('EmailService', () => {
  it('should send email successfully', async () => {
    const result = await EmailService.sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      body: 'Hello'
    });
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

```typescript
// apps/api/tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../src/app';

describe('Auth Endpoints', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
        name: 'Test User',
        acceptTerms: true
      });
    expect(response.status).toBe(201);
  });
});
```

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## Debugging

### VS Code Launch Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to API",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:3001",
      "webRoot": "${workspaceFolder}/apps/frontend/src"
    }
  ]
}
```

### Debugging with Chrome DevTools

```bash
# Start API in debug mode
node --inspect dist/index.js

# Start frontend with debug
npm run dev -- --debug
```

### Using console.log Effectively

```typescript
// ✅ Good: Contextual logging
console.log('[EmailAgent] Sending email to:', email);

// ✅ Good: Using util.inspect for objects
console.log(util.inspect(largeObject, { depth: null, colors: true }));
```

---

## Performance Optimization

### Database Query Optimization

```typescript
// ✅ Good: Select only needed fields
await prisma.user.findMany({
  select: { id: true, email: true, name: true }
});

// ✅ Good: Use indexes
// Add @@index([email]) in schema.prisma

// ❌ Bad: Selecting all fields
await prisma.user.findMany();
```

### Caching Strategy

```typescript
// ✅ Good: Cache expensive operations
const cacheKey = `user:${userId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const user = await prisma.user.findUnique({ where: { id: userId } });
await redis.setex(cacheKey, 300, JSON.stringify(user));
return user;
```

### Batch Operations

```typescript
// ✅ Good: Batch database operations
await prisma.$transaction([
  prisma.user.update({ where: { id: userId1 }, data: { name: 'New' } }),
  prisma.user.update({ where: { id: userId2 }, data: { name: 'New' } })
]);

// ❌ Bad: Multiple individual operations
await prisma.user.update({ where: { id: userId1 }, data: { name: 'New' } });
await prisma.user.update({ where: { id: userId2 }, data: { name: 'New' } });
```

### Frontend Optimization

```tsx
// ✅ Good: Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* expensive render */}</div>;
});

// ✅ Good: Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));

// ✅ Good: Use useCallback and useMemo
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);

const filteredData = useMemo(() => {
  return data.filter(item => item.active);
}, [data]);
```

---

## Security Guidelines

### Input Validation

```typescript
// ✅ Good: Validate all inputs
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().min(0).max(150)
});

const validated = userSchema.parse(req.body);
```

### SQL Injection Prevention

```typescript
// ✅ Good: Use parameterized queries
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// ❌ Bad: String concatenation
await prisma.$executeRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);
```

### XSS Prevention

```tsx
// ✅ Good: React escapes by default
<div>{userInput}</div>

// ❌ Bad: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### Environment Variables

```typescript
// ✅ Good: Validate required env vars
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

// ❌ Bad: Using undefined env vars
const secret = process.env.JWT_SECRET || 'default-secret';
```

### Rate Limiting

```typescript
// ✅ Good: Apply rate limits
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
}));
```

---

## Troubleshooting Common Issues

### Database Connection Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U aiagent_user -d aiagent -c "SELECT 1"

# View logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# View Redis logs
tail -f /var/log/redis/redis-server.log
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Node.js Memory Issues

```bash
# Increase memory limit
node --max-old-space-size=4096 dist/index.js

# Monitor memory usage
node --trace-gc dist/index.js
```

---

## Useful Commands

### Database

```bash
# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Generate Prisma client
npx prisma generate
```

### Git

```bash
# Interactive rebase
git rebase -i HEAD~3

# Stash changes
git stash push -m "WIP: feature"

# View history
git log --oneline --graph
```

### npm

```bash
# Update dependencies
npm update

# Check for vulnerabilities
npm audit

# Run specific script
npm run test -- --grep "EmailAgent"
```

---

## Contributing Guidelines

1. Write tests for new features
2. Update documentation
3. Follow TypeScript strict mode
4. Run linting before committing
5. Keep PRs small and focused
6. Request review from at least 2 team members

---

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Stripe API Reference](https://stripe.com/docs/api)
