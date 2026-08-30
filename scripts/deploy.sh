#!/bin/bash
# enterprise-ai-agent-platform/scripts/deploy.sh
# Deployment script for AI Agent Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
NAMESPACE="ai-agent-platform"
HELM_RELEASE="ai-agent-platform"
HELM_CHART="./helm/ai-agent-platform"

echo -e "${GREEN}🚀 Deploying AI Agent Platform to ${ENVIRONMENT} environment${NC}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

# Check if kubectl is configured
if ! kubectl cluster-info &>/dev/null; then
    echo -e "${RED}Error: kubectl is not configured. Please configure kubeconfig first.${NC}"
    exit 1
fi

# Check if Helm is installed
if ! command -v helm &>/dev/null; then
    echo -e "${RED}Error: Helm is not installed. Please install Helm first.${NC}"
    exit 1
fi

# Create namespace if it doesn't exist
echo -e "${YELLOW}Creating namespace ${NAMESPACE}...${NC}"
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Add Helm repositories if needed
echo -e "${YELLOW}Adding Helm repositories...${NC}"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install/Upgrade cert-manager if not present
if ! kubectl get namespace cert-manager &>/dev/null; then
    echo -e "${YELLOW}Installing cert-manager...${NC}"
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --set installCRDs=true \
        --wait
fi

# Install/Upgrade ingress-nginx if not present
if ! kubectl get namespace ingress-nginx &>/dev/null; then
    echo -e "${YELLOW}Installing ingress-nginx...${NC}"
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=LoadBalancer \
        --wait
fi

# Install/Upgrade Prometheus stack if not present
if ! kubectl get namespace monitoring &>/dev/null; then
    echo -e "${YELLOW}Installing Prometheus stack...${NC}"
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --set grafana.adminPassword=admin \
        --wait
fi

# Deploy application
echo -e "${YELLOW}Deploying application...${NC}"
helm upgrade --install ${HELM_RELEASE} ${HELM_CHART} \
    --namespace ${NAMESPACE} \
    --values ${HELM_CHART}/values-${ENVIRONMENT}.yaml \
    --wait \
    --timeout 10m

# Check deployment status
echo -e "${YELLOW}Checking deployment status...${NC}"
kubectl rollout status deployment/${HELM_RELEASE}-api -n ${NAMESPACE} --timeout=5m
kubectl rollout status deployment/${HELM_RELEASE}-worker -n ${NAMESPACE} --timeout=5m
kubectl rollout status deployment/${HELM_RELEASE}-frontend -n ${NAMESPACE} --timeout=5m

# Get service endpoints
echo -e "${GREEN}Deployment completed!${NC}"
echo -e "API URL: $(kubectl get ingress -n ${NAMESPACE} -o jsonpath='{.items[0].spec.rules[0].host}')"
echo -e "Frontend URL: $(kubectl get ingress -n ${NAMESPACE} -o jsonpath='{.items[0].spec.rules[1].host}')"

# Run smoke tests
echo -e "${YELLOW}Running smoke tests...${NC}"
sleep 10
API_URL=$(kubectl get ingress -n ${NAMESPACE} -o jsonpath='{.items[0].spec.rules[0].host}')
if curl -f "https://${API_URL}/health" &>/dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment successful!${NC}"