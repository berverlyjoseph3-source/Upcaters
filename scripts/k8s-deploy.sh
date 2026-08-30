
---

## File 2 of 3: `scripts/k8s-deploy.sh`

```bash
#!/bin/bash
# enterprise-ai-agent-platform/scripts/k8s-deploy.sh
# Kubernetes deployment script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="ai-agent-platform"
K8S_DIR="./k8s"
ENVIRONMENT=${1:-production}
REGION=${2:-us-east-1}

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}AI Agent Platform - Kubernetes Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Region: ${YELLOW}${REGION}${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}kubectl is required but not installed.${NC}" >&2; exit 1; }
command -v kustomize >/dev/null 2>&1 || { echo -e "${RED}kustomize is required but not installed.${NC}" >&2; exit 1; }
echo -e "${GREEN}✓ Prerequisites satisfied${NC}"
echo ""

# Configure kubectl
echo -e "${YELLOW}Configuring kubectl...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    aws eks update-kubeconfig --name ai-agent-platform-production --region $REGION
elif [ "$ENVIRONMENT" = "staging" ]; then
    aws eks update-kubeconfig --name ai-agent-platform-staging --region $REGION
else
    kubectl config use-context docker-desktop
fi
echo -e "${GREEN}✓ kubectl configured${NC}"
echo ""

# Create namespace
echo -e "${YELLOW}Creating namespace...${NC}"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✓ Namespace created${NC}"
echo ""

# Install cert-manager
echo -e "${YELLOW}Installing cert-manager...${NC}"
if ! kubectl get namespace cert-manager &>/dev/null; then
    kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-webhook -n cert-manager
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-cainjector -n cert-manager
fi
echo -e "${GREEN}✓ cert-manager installed${NC}"
echo ""

# Install ingress-nginx
echo -e "${YELLOW}Installing ingress-nginx...${NC}"
if ! kubectl get namespace ingress-nginx &>/dev/null; then
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/aws/deploy.yaml
    kubectl wait --for=condition=available --timeout=300s deployment/ingress-nginx-controller -n ingress-nginx
fi
echo -e "${GREEN}✓ ingress-nginx installed${NC}"
echo ""

# Install Prometheus Operator (if not using Helm)
echo -e "${YELLOW}Installing Prometheus Operator...${NC}"
if ! kubectl get crd prometheuses.monitoring.coreos.com &>/dev/null; then
    kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml
    sleep 10
fi
echo -e "${GREEN}✓ Prometheus Operator installed${NC}"
echo ""

# Verify secrets exist
echo -e "${YELLOW}Verifying secrets...${NC}"
if ! kubectl get secret ai-agent-platform-secrets -n $NAMESPACE &>/dev/null; then
    echo -e "${RED}Warning: ai-agent-platform-secrets not found. Creating placeholder...${NC}"
    kubectl create secret generic ai-agent-platform-secrets \
        --namespace $NAMESPACE \
        --from-literal=jwt-secret="change-me-in-production" \
        --from-literal=jwt-refresh-secret="change-me-in-production" \
        --from-literal=encryption-key="0123456789abcdef0123456789abcdef" \
        --dry-run=client -o yaml | kubectl apply -f -
fi
echo -e "${GREEN}✓ Secrets verified${NC}"
echo ""

# Deploy application
echo -e "${YELLOW}Deploying application...${NC}"
cd $K8S_DIR
kustomize build . | kubectl apply -f - -n $NAMESPACE
cd ..
echo -e "${GREEN}✓ Application deployed${NC}"
echo ""

# Wait for deployments
echo -e "${YELLOW}Waiting for deployments to be ready...${NC}"
deployments=("ai-agent-platform-api" "ai-agent-platform-worker" "ai-agent-platform-frontend")
for deploy in "${deployments[@]}"; do
    echo -e "Waiting for ${deploy}..."
    kubectl rollout status deployment/$deploy -n $NAMESPACE --timeout=300s
done
echo -e "${GREEN}✓ All deployments ready${NC}"
echo ""

# Wait for statefulsets
echo -e "${YELLOW}Waiting for statefulsets to be ready...${NC}"
statefulsets=("postgres" "redis" "mongodb")
for sts in "${statefulsets[@]}"; do
    echo -e "Waiting for ${sts}..."
    kubectl rollout status statefulset/$sts -n $NAMESPACE --timeout=300s
done
echo -e "${GREEN}✓ All statefulsets ready${NC}"
echo ""

# Get service endpoints
echo -e "${YELLOW}Service endpoints:${NC}"
INGRESS_HOST=$(kubectl get ingress ai-agent-platform-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo -e "API URL: ${GREEN}https://api.aiagentplatform.com${NC}"
echo -e "Frontend URL: ${GREEN}https://app.aiagentplatform.com${NC}"
echo ""

# Run smoke tests
echo -e "${YELLOW}Running smoke tests...${NC}"
sleep 10

API_URL="https://api.aiagentplatform.com/health"
if curl -f -s -o /dev/null "$API_URL"; then
    echo -e "${GREEN}✓ API health check passed${NC}"
else
    echo -e "${RED}✗ API health check failed${NC}"
    exit 1
fi

FRONTEND_URL="https://app.aiagentplatform.com/health"
if curl -f -s -o /dev/null "$FRONTEND_URL"; then
    echo -e "${GREEN}✓ Frontend health check passed${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
    exit 1
fi
echo ""

# Display summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  ${YELLOW}kubectl get pods -n $NAMESPACE${NC} - View pod status"
echo -e "  ${YELLOW}kubectl get svc -n $NAMESPACE${NC} - View services"
echo -e "  ${YELLOW}kubectl logs -f deployment/ai-agent-platform-api -n $NAMESPACE${NC} - View API logs"
echo -e "  ${YELLOW}kubectl port-forward -n monitoring svc/prometheus 9090:9090${NC} - Access Prometheus"
echo -e "  ${YELLOW}kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80${NC} - Access Grafana"
echo ""