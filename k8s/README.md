# Kubernetes Deployment Guide

## Overview

This directory contains Kubernetes manifests for deploying the AI Agent Platform in a production environment.

---

## Prerequisites

### Required Tools

- `kubectl` v1.28+
- `helm` v3.14+
- `kustomize` v5.0+
- AWS CLI v2 (for EKS)
- `eksctl` (optional)

### Cluster Requirements

- Kubernetes version: 1.28+
- Node count: minimum 3 (3 API, 2 worker, 2 frontend recommended)
- Node type: `c5.large` or equivalent
- Storage class: `gp3` for EBS, `efs-sc` for shared storage

---

## Quick Start

### 1. Configure kubectl

```bash
# For EKS
aws eks update-kubeconfig --name ai-agent-platform-production --region us-east-1

# For other clusters
kubectl config use-context your-cluster-context
```

### 2. Install Prerequisites

```bash
# Install cert-manager
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install ingress-nginx
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/aws/deploy.yaml

# Install Prometheus Operator (if not using Helm)
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml
```

### 3. Deploy the Application

```bash
# Create namespace
kubectl create namespace ai-agent-platform

# Apply secrets (update with actual values first)
kubectl apply -f secrets.yaml -n ai-agent-platform

# Deploy all resources
kubectl apply -k . -n ai-agent-platform

# Check deployment status
kubectl rollout status deployment/ai-agent-platform-api -n ai-agent-platform
kubectl rollout status deployment/ai-agent-platform-worker -n ai-agent-platform
kubectl rollout status deployment/ai-agent-platform-frontend -n ai-agent-platform
```

---

## Component Status

| Component  | Type        | Replicas | Status  |
|------------|-------------|----------|---------|
| API        | Deployment  | 3        | Healthy |
| Worker     | Deployment  | 2        | Healthy |
| Frontend   | Deployment  | 2        | Healthy |
| PostgreSQL | StatefulSet | 1        | Healthy |
| Redis      | StatefulSet | 1        | Healthy |
| MongoDB    | StatefulSet | 1        | Healthy |

---

## Monitoring Access

### Prometheus

```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Access at http://localhost:9090
```

### Grafana

```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Access at http://localhost:3000 (admin/admin)
```

### Kibana

```bash
kubectl port-forward -n logging svc/kibana 5601:5601
# Access at http://localhost:5601
```

### AlertManager

```bash
kubectl port-forward -n monitoring svc/alertmanager 9093:9093
# Access at http://localhost:9093
```

---

## Scaling

### Manual Scaling

```bash
# Scale API
kubectl scale deployment ai-agent-platform-api --replicas=5 -n ai-agent-platform

# Scale Worker
kubectl scale deployment ai-agent-platform-worker --replicas=3 -n ai-agent-platform

# Scale Frontend
kubectl scale deployment ai-agent-platform-frontend --replicas=3 -n ai-agent-platform
```

### Horizontal Pod Autoscaling

```bash
# Check HPA status
kubectl get hpa -n ai-agent-platform

# Update HPA thresholds
kubectl edit hpa ai-agent-platform-api-hpa -n ai-agent-platform
```

---

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n ai-agent-platform
kubectl describe pod <pod-name> -n ai-agent-platform
kubectl logs <pod-name> -n ai-agent-platform
```

### Check Service Endpoints

```bash
kubectl get svc -n ai-agent-platform
kubectl get endpoints -n ai-agent-platform
```

### Check Ingress

```bash
kubectl get ingress -n ai-agent-platform
kubectl describe ingress ai-agent-platform-ingress -n ai-agent-platform
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
kubectl exec -it postgres-0 -n ai-agent-platform -- pg_isready -U aiagent_user

# Test Redis connection
kubectl exec -it redis-0 -n ai-agent-platform -- redis-cli ping

# Test MongoDB connection
kubectl exec -it mongodb-0 -n ai-agent-platform -- mongosh --eval "db.adminCommand('ping')"
```

### Common Issues and Solutions

| Issue                      | Solution                                                                          |
|----------------------------|-----------------------------------------------------------------------------------|
| Pods stuck in Pending      | Check node resources: `kubectl describe nodes`                                    |
| ImagePullBackOff           | Verify image registry credentials: `kubectl get secret -n ai-agent-platform`     |
| CrashLoopBackOff           | Check pod logs: `kubectl logs <pod-name> --previous -n ai-agent-platform`         |
| Database connection refused| Check database pod status and service endpoints                                   |
| TLS certificate issues     | Verify cert-manager and ClusterIssuer: `kubectl get clusterissuer -A`             |

---

## Backup and Restore

### Automated Backups

Backups run daily at 2 AM via CronJob:

```bash
kubectl get cronjob database-backup -n ai-agent-platform
kubectl logs job/database-backup-xxxxx -n ai-agent-platform
```

### Manual Backup

```bash
kubectl create job --from=cronjob/database-backup manual-backup -n ai-agent-platform
```

### Restore from Backup

```bash
# List available backups
kubectl exec -it postgres-0 -n ai-agent-platform -- ls -la /backup/

# Restore specific backup
kubectl exec -it postgres-0 -n ai-agent-platform -- pg_restore -U aiagent_user -d aiagent /backup/aiagent_20240101_020000.dump
```

---

## Upgrading

### Rolling Update

```bash
# Update image tag
kubectl set image deployment/ai-agent-platform-api api=ghcr.io/ai-agent-platform/api:v2.0.0 -n ai-agent-platform

# Watch rollout status
kubectl rollout status deployment/ai-agent-platform-api -n ai-agent-platform

# Rollback if needed
kubectl rollout undo deployment/ai-agent-platform-api -n ai-agent-platform
```

### Using Kustomize

```bash
# Edit image tag in kustomization.yaml
vim kustomization.yaml

# Apply changes
kubectl apply -k . -n ai-agent-platform
```

---

## Security Considerations

### Network Policies

All network policies are enabled by default:

```bash
kubectl get networkpolicy -n ai-agent-platform
```

### Pod Security Standards

```bash
# Check pod security
kubectl get pods -n ai-agent-platform -o json | jq '.items[].spec.securityContext'
```

### Secrets Management

Secrets are stored in AWS Secrets Manager (production) or as Kubernetes secrets (development):

```bash
# Update secret
kubectl edit secret ai-agent-platform-secrets -n ai-agent-platform
```

---

## Disaster Recovery

- **Recovery Time Objective (RTO):** 4 hours
- **Recovery Point Objective (RPO):** 1 hour

### Full Cluster Recovery

1. Restore database from latest backup
2. Redeploy Kubernetes resources
3. Verify service health
4. Restore from S3 if needed

### Region Failover

```bash
# Switch context to backup region
aws eks update-kubeconfig --name ai-agent-platform-backup --region us-west-2

# Apply manifests
kubectl apply -k . -n ai-agent-platform
```

---

## Cost Optimization

### Spot Instance Configuration

Worker nodes are configured to use spot instances:

```yaml
nodeSelector:
  node.kubernetes.io/instance-type: spot
tolerations:
  - key: spot
    operator: Equal
    value: "true"
    effect: NoSchedule
```

### Resource Limits

Review and adjust resource limits based on usage:

```bash
kubectl top pods -n ai-agent-platform
kubectl top nodes
```

---

## Support

For production issues, contact:

- **Email:** support@aiagentplatform.com
- **Slack:** `#production-support`
- **PagerDuty:** https://aiagentplatform.pagerduty.com
