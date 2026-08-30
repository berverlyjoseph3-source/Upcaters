# Deployment Checklist

---

## Pre-Deployment Checklist

### Infrastructure

- [ ] AWS account configured with appropriate permissions
- [ ] Terraform state bucket created
- [ ] VPC and subnets provisioned
- [ ] EKS cluster created and accessible
- [ ] RDS PostgreSQL instance provisioned
- [ ] ElastiCache Redis cluster provisioned
- [ ] DocumentDB (MongoDB) cluster provisioned
- [ ] S3 bucket for file storage created
- [ ] CloudFront distribution configured
- [ ] Route53 records set up

### Security

- [ ] IAM roles and policies created
- [ ] Security groups configured
- [ ] Network policies defined
- [ ] Secrets stored in AWS Secrets Manager
- [ ] TLS certificates issued via cert-manager
- [ ] WAF rules configured
- [ ] DDoS protection enabled
- [ ] Audit logging enabled

### Application Configuration

- [ ] Environment variables set
- [ ] Database migrations prepared
- [ ] Feature flags configured
- [ ] Rate limits defined
- [ ] Plan limits configured
- [ ] OAuth credentials set up
- [ ] API keys generated
- [ ] Stripe webhooks configured

### Monitoring

- [ ] Prometheus configured
- [ ] Grafana dashboards imported
- [ ] AlertManager rules defined
- [ ] Slack/PagerDuty webhooks set
- [ ] Logging stack (FluentBit/Elasticsearch) configured
- [ ] Tracing (Jaeger/Tempo) configured
- [ ] Sentry DSN configured

### Backup & Recovery

- [ ] Database backup cronjob configured
- [ ] S3 backup bucket created
- [ ] Backup retention policy defined
- [ ] Restore procedure documented
- [ ] Disaster recovery plan tested

### Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Load tests completed
- [ ] Security scan passed
- [ ] Penetration testing completed
- [ ] Smoke tests passing

---

## Deployment Steps

### 1. Infrastructure Deployment

```bash
cd terraform
terraform init
terraform plan
terraform apply -auto-approve
```

### 2. Configure kubectl

```bash
aws eks update-kubeconfig --name ai-agent-platform-production --region us-east-1
kubectl get nodes
```

### 3. Install Prerequisites

```bash
# cert-manager
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# ingress-nginx
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/aws/deploy.yaml

# Prometheus Operator
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml
```

### 4. Deploy Secrets

```bash
kubectl create secret generic ai-agent-platform-secrets \
  --namespace ai-agent-platform \
  --from-literal=jwt-secret=$JWT_SECRET \
  --from-literal=jwt-refresh-secret=$JWT_REFRESH_SECRET \
  --from-literal=encryption-key=$ENCRYPTION_KEY \
  --from-literal=openai-api-key=$OPENAI_API_KEY \
  --from-literal=stripe-secret-key=$STRIPE_SECRET_KEY
```

### 5. Deploy Application

```bash
kubectl apply -k k8s/ -n ai-agent-platform

# Wait for rollouts
kubectl rollout status deployment/ai-agent-platform-api -n ai-agent-platform --timeout=300s
kubectl rollout status deployment/ai-agent-platform-worker -n ai-agent-platform --timeout=300s
kubectl rollout status deployment/ai-agent-platform-frontend -n ai-agent-platform --timeout=300s
```

### 6. Run Database Migrations

```bash
kubectl exec -it deployment/ai-agent-platform-api -n ai-agent-platform -- npx prisma migrate deploy
kubectl exec -it deployment/ai-agent-platform-api -n ai-agent-platform -- npx prisma db seed
```

### 7. Verify Deployment

```bash
# Health checks
curl https://api.aiagentplatform.com/health
curl https://app.aiagentplatform.com/health

# Metrics
curl https://api.aiagentplatform.com/health/metrics
```

### 8. Configure Stripe Webhooks

```bash
stripe listen --forward-to https://api.aiagentplatform.com/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

### 9. Configure OAuth Callbacks

- Google: `https://api.aiagentplatform.com/api/auth/google/callback`
- LinkedIn: `https://api.aiagentplatform.com/api/auth/linkedin/callback`
- Facebook: `https://api.aiagentplatform.com/api/auth/facebook/callback`
- X/Twitter: `https://api.aiagentplatform.com/api/auth/twitter/callback`

---

## Post-Deployment Checklist

### Verification

- [ ] API endpoints accessible
- [ ] Frontend loading correctly
- [ ] Authentication working
- [ ] Agent execution working
- [ ] Billing integration working
- [ ] Webhook endpoints responding
- [ ] Monitoring dashboards showing data
- [ ] Logs being collected
- [ ] Alerts configured

### Performance

- [ ] Load balancer responding
- [ ] Auto-scaling configured
- [ ] Database connection pool sized correctly
- [ ] Redis cache warming
- [ ] CDN configured

### Security

- [ ] TLS certificates valid
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] WAF rules enforced
- [ ] Audit logs recording

### Business Continuity

- [ ] Backups running
- [ ] DR plan tested
- [ ] Runbooks documented
- [ ] On-call rotation configured

---

## Rollback Plan

### Immediate Rollback (Last 5 Minutes)

```bash
kubectl rollout undo deployment/ai-agent-platform-api -n ai-agent-platform
kubectl rollout undo deployment/ai-agent-platform-worker -n ai-agent-platform
kubectl rollout undo deployment/ai-agent-platform-frontend -n ai-agent-platform
```

### Revision Rollback

```bash
kubectl rollout history deployment/ai-agent-platform-api -n ai-agent-platform
kubectl rollout undo deployment/ai-agent-platform-api --to-revision=3 -n ai-agent-platform
```

### Database Rollback

```bash
kubectl create job --from=cronjob/database-backup manual-restore -n ai-agent-platform
```

---

## Sign-Off

| Role               | Name | Date | Signature |
|--------------------|------|------|-----------|
| Engineering Lead   |      |      |           |
| Security Lead      |      |      |           |
| Operations Lead    |      |      |           |
| Product Owner      |      |      |           |

---

## Emergency Contacts

| Role                | Name | Phone | Email |
|---------------------|------|-------|-------|
| On-Call Engineer    |      |       |       |
| Database Admin      |      |       |       |
| Security Engineer   |      |       |       |
| Infrastructure Lead |      |       |       |
