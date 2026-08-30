#!/bin/bash
# enterprise-ai-agent-platform/scripts/k8s-rollback.sh
# Kubernetes rollback script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="ai-agent-platform"
COMPONENT=${1:-api}
REVISION=${2:-0}

echo -e "${BLUE}========================================${NC}"
echo -e "${RED}AI Agent Platform - Rollback${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Component: ${YELLOW}${COMPONENT}${NC}"
echo -e "Revision: ${YELLOW}${REVISION:-latest}${NC}"
echo ""

# Validate component
if [[ ! "$COMPONENT" =~ ^(api|worker|frontend|all)$ ]]; then
    echo -e "${RED}Error: Component must be 'api', 'worker', 'frontend', or 'all'${NC}"
    exit 1
fi

# Check if kubectl is configured
if ! kubectl cluster-info &>/dev/null; then
    echo -e "${RED}Error: kubectl is not configured. Please configure kubeconfig first.${NC}"
    exit 1
fi

# Confirm rollback
echo -e "${RED}WARNING: This will rollback the ${COMPONENT} component to a previous revision.${NC}"
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Rollback cancelled.${NC}"
    exit 0
fi

# Perform rollback
if [ "$COMPONENT" = "all" ]; then
    echo -e "${YELLOW}Rolling back all components...${NC}"
    kubectl rollout undo deployment/ai-agent-platform-api -n $NAMESPACE --to-revision=$REVISION
    kubectl rollout undo deployment/ai-agent-platform-worker -n $NAMESPACE --to-revision=$REVISION
    kubectl rollout undo deployment/ai-agent-platform-frontend -n $NAMESPACE --to-revision=$REVISION
    echo -e "${GREEN}✓ All components rolled back${NC}"
else
    echo -e "${YELLOW}Rolling back ${COMPONENT}...${NC}"
    if [ "$REVISION" -eq 0 ]; then
        kubectl rollout undo deployment/ai-agent-platform-$COMPONENT -n $NAMESPACE
    else
        kubectl rollout undo deployment/ai-agent-platform-$COMPONENT -n $NAMESPACE --to-revision=$REVISION
    fi
    echo -e "${GREEN}✓ ${COMPONENT} rolled back${NC}"
fi
echo ""

# Wait for rollout to complete
echo -e "${YELLOW}Waiting for rollout to complete...${NC}"
if [ "$COMPONENT" = "all" ]; then
    kubectl rollout status deployment/ai-agent-platform-api -n $NAMESPACE --timeout=300s
    kubectl rollout status deployment/ai-agent-platform-worker -n $NAMESPACE --timeout=300s
    kubectl rollout status deployment/ai-agent-platform-frontend -n $NAMESPACE --timeout=300s
else
    kubectl rollout status deployment/ai-agent-platform-$COMPONENT -n $NAMESPACE --timeout=300s
fi
echo -e "${GREEN}✓ Rollout complete${NC}"
echo ""

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
API_URL="https://api.aiagentplatform.com/health"
if curl -f -s -o /dev/null "$API_URL"; then
    echo -e "${GREEN}✓ API health check passed${NC}"
else
    echo -e "${RED}✗ API health check failed${NC}"
fi
echo ""

# Display rollback history
echo -e "${YELLOW}Rollback history:${NC}"
if [ "$COMPONENT" = "all" ]; then
    echo "API:"
    kubectl rollout history deployment/ai-agent-platform-api -n $NAMESPACE
    echo ""
    echo "Worker:"
    kubectl rollout history deployment/ai-agent-platform-worker -n $NAMESPACE
    echo ""
    echo "Frontend:"
    kubectl rollout history deployment/ai-agent-platform-frontend -n $NAMESPACE
else
    kubectl rollout history deployment/ai-agent-platform-$COMPONENT -n $NAMESPACE
fi
echo ""

echo -e "${GREEN}Rollback completed successfully!${NC}"