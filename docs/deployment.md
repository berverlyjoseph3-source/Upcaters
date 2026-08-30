# Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Infrastructure Setup](#aws-infrastructure-setup)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Database Migration](#database-migration)
5. [Monitoring Setup](#monitoring-setup)
6. [Backup and Restore](#backup-and-restore)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- AWS CLI v2
- `kubectl` v1.28+
- `helm` v3.14+
- Terraform v1.5+
- PostgreSQL client (`psql`)
- Redis CLI
- MongoDB shell

### Required Permissions

- AWS: Administrator access for initial setup
- Kubernetes: `cluster-admin` for deployment
- GitHub: write access to container registry

---

## AWS Infrastructure Setup

### 1. Configure AWS CLI

```bash
aws configure
# Enter Access Key ID, Secret Access Key, region (us-east-1)
```

### 2. Deploy Infrastructure with Terraform

```bash
cd terraform

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply infrastructure
terraform apply -auto-approve
```

This creates:

- VPC with public/private subnets
- EKS cluster (Kubernetes)
- RDS PostgreSQL instance
- ElastiCache Redis cluster
- DocumentDB (MongoDB compatible)
- S3 bucket for file storage
- CloudFront CDN

### 3. Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig --name ai-agent-platform-production --region us-east-1

# Verify connection
kubectl get nodes
```

---

## Kubernetes Deployment

### 1. Create Namespace and Secrets

```bash
# Create namespace
kubectl create namespace ai-agent-platform

# Create secrets from environment variables
kubectl create secret generic ai-agent-platform-secrets \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=redis-url=$REDIS_URL \
  --from-literal=mongodb-url=$MONGODB_URL \
  --from-literal=jwt-secret=$JWT_SECRET \
  --from-literal=jwt-refresh-secret=$JWT_REFRESH_SECRET \
  --from-literal=openai-api-key=$OPENAI_API_KEY \
  --from-literal=stripe-secret-key=$STRIPE_SECRET_KEY \
  -n ai-agent-platform
```

### 2. Install Dependencies

```bash
# Add Helm repositories
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install cert-manager
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Install ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer

# Install Prometheus stack
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=admin
```

### 3. Deploy Application

```bash
# Deploy with Helm
helm upgrade --install ai-agent-platform ./helm/ai-agent-platform \
  --namespace ai-agent-platform \
  --values ./helm/ai-agent-platform/values-prod.yaml \
  --set secrets.databaseUrl=$DATABASE_URL \
  --set secrets.redisUrl=$REDIS_URL \
  --set secrets.mongodbUrl=$MONGODB_URL \
  --wait
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n ai-agent-platform

# Check services
kubectl get svc -n ai-agent-platform

# Check ingress
kubectl get ingress -n ai-agent-platform

# View logs
kubectl logs -f deployment/ai-agent-platform-api -n ai-agent-platform
```

---

## Database Migration

### Run Migrations

```bash
# Production migration
./scripts/migrate-db.sh production

# Verify migration status
kubectl exec -it deployment/ai-agent-platform-api -n ai-agent-platform -- \
  npx prisma migrate status
```

### Seed Database (if needed)

```bash
kubectl exec -it deployment/ai-agent-platform-api -n ai-agent-platform -- \
  npx prisma db seed
```

---

## Monitoring Setup

### Access Grafana

```bash
# Get Grafana admin password
kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode

# Port forward Grafana
kubectl port-forward -n monitoring service/prometheus-grafana 3000:80

# Access at http://localhost:3000
```

### Import Dashboards

Import the following dashboards:

- Kubernetes Cluster Monitoring (ID: 315)
- Node Exporter (ID: 16098)
- PostgreSQL (ID: 9628)
- Redis (ID: 11835)
- Application Metrics (Custom)

### Set up Alerts

Configure Prometheus alerts for:

- High CPU/Memory usage
- Pod restarts
- API error rate > 5%
- Database connection pool exhaustion
- Redis memory usage > 80%

---

## Backup and Restore

### Automated Backups

Backups run daily at 2 AM via cron job:

```bash
# Check backup cron job
kubectl get cronjob database-backup -n ai-agent-platform

# View backup logs
kubectl logs -f job/database-backup-xxxxx -n ai-agent-platform
```

### Manual Backup

```bash
# Run backup script
./scripts/backup-db.sh

# Backup location: /var/backups/ai-agent-platform/
```

### Restore from Backup

```bash
# List available backups
ls -la /var/backups/ai-agent-platform/

# Restore specific backup
./scripts/restore-db.sh /var/backups/ai-agent-platform/aiagent_20240101_120000.dump
```

---

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n ai-agent-platform

# Check events
kubectl get events -n ai-agent-platform --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n ai-agent-platform --previous
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/ai-agent-platform-api -n ai-agent-platform -- \
  npx prisma db execute --file /dev/null

# Check RDS status
aws rds describe-db-instances --db-instance-identifier ai-agent-platform

# Restart database pod
kubectl rollout restart deployment/ai-agent-platform-api -n ai-agent-platform
```

### Redis Connection Issues

```bash
# Test Redis connectivity
kubectl exec -it deployment/ai-agent-platform-api -n ai-agent-platform -- \
  redis-cli -h redis-url ping

# Check Redis memory
kubectl exec -it deployment/ai-agent-platform-worker -n ai-agent-platform -- \
  redis-cli INFO memory
```

### Ingress Issues

```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Test ingress rules
curl -H "Host: api.aiagentplatform.com" http://<load-balancer-ip>/health
```

### Rollback

```bash
# Rollback Helm release
helm rollback ai-agent-platform -n ai-agent-platform

# Rollback specific deployment
kubectl rollout undo deployment/ai-agent-platform-api -n ai-agent-platform
```

---

## Performance Tuning

### Horizontal Pod Autoscaling

```bash
# Check HPA status
kubectl get hpa -n ai-agent-platform

# View current metrics
kubectl top pods -n ai-agent-platform
```

### Database Tuning

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Update statistics
ANALYZE;

-- Vacuum
VACUUM ANALYZE;
```

### Redis Tuning

```bash
# Check memory fragmentation
redis-cli INFO memory | grep mem_fragmentation_ratio

# Set maxmemory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

---

## Security Checklist

- [ ] Enable AWS WAF on load balancer
- [ ] Configure network policies
- [ ] Enable audit logging
- [ ] Set up secret rotation
- [ ] Enable VPC flow logs
- [ ] Configure backup encryption
- [ ] Enable TLS 1.2+
- [ ] Set up security scanning (Trivy)
- [ ] Configure Pod Security Standards
- [ ] Enable OPA/Gatekeeper policies

---

## Support

For production issues, contact:

- **Email:** support@aiagentplatform.com
- **Slack:** `#production-support`
- **PagerDuty:** https://aiagentplatform.pagerduty.com
