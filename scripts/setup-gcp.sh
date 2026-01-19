#!/bin/bash
# ============================================
# CVeetje - GCP Setup Script
# Sets up Artifact Registry, Cloud Build, and Cloud Run
# ============================================

set -e

# Configuration - EDIT THESE VALUES
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-europe-west4}"
ARTIFACT_REPO="cveetje"
SERVICE_NAME="cveetje"
GITHUB_OWNER="groeimetai"
GITHUB_REPO="CVeetje"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}CVeetje GCP Setup Script${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}Not logged in to gcloud. Running auth login...${NC}"
    gcloud auth login
fi

echo -e "${YELLOW}Using Project: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Using Region: ${REGION}${NC}"
echo ""

# Set project
echo -e "${GREEN}[1/7] Setting GCP project...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${GREEN}[2/7] Enabling required APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com

# Create Artifact Registry repository
echo -e "${GREEN}[3/7] Creating Artifact Registry repository...${NC}"
if gcloud artifacts repositories describe ${ARTIFACT_REPO} --location=${REGION} &> /dev/null; then
    echo "Repository already exists, skipping..."
else
    gcloud artifacts repositories create ${ARTIFACT_REPO} \
        --repository-format=docker \
        --location=${REGION} \
        --description="CVeetje Docker images"
fi

# Grant Cloud Build permissions
echo -e "${GREEN}[4/7] Setting up IAM permissions...${NC}"
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Run Admin role to Cloud Build
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/run.admin" \
    --quiet

# Grant Service Account User role to Cloud Build
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/iam.serviceAccountUser" \
    --quiet

# Grant Artifact Registry Writer role to Cloud Build
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/artifactregistry.writer" \
    --quiet

echo -e "${GREEN}[5/7] Connecting GitHub repository...${NC}"
echo -e "${YELLOW}Please follow these steps to connect GitHub:${NC}"
echo ""
echo "1. Go to: https://console.cloud.google.com/cloud-build/triggers;region=${REGION}?project=${PROJECT_ID}"
echo "2. Click 'Connect Repository'"
echo "3. Select 'GitHub (Cloud Build GitHub App)'"
echo "4. Authenticate and select repository: ${GITHUB_OWNER}/${GITHUB_REPO}"
echo "5. Click 'Connect'"
echo ""
read -p "Press Enter when you have connected the repository..."

# Create Cloud Build trigger
echo -e "${GREEN}[6/7] Creating Cloud Build trigger...${NC}"
if gcloud builds triggers describe cveetje-deploy --region=${REGION} &> /dev/null; then
    echo "Trigger already exists, updating..."
    gcloud builds triggers delete cveetje-deploy --region=${REGION} --quiet
fi

gcloud builds triggers create github \
    --name="cveetje-deploy" \
    --region=${REGION} \
    --repo-name="${GITHUB_REPO}" \
    --repo-owner="${GITHUB_OWNER}" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml" \
    --substitutions="_REGION=${REGION}" \
    --description="Deploy CVeetje to Cloud Run on push to main"

echo -e "${GREEN}[7/7] Setting up secrets...${NC}"
echo -e "${YELLOW}You need to add the following environment variables to Cloud Run:${NC}"
echo ""
echo "Go to: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/edit?project=${PROJECT_ID}"
echo ""
echo "Add these environment variables (from your .env.local):"
echo "  - NEXT_PUBLIC_FIREBASE_API_KEY"
echo "  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
echo "  - NEXT_PUBLIC_FIREBASE_PROJECT_ID"
echo "  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
echo "  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
echo "  - NEXT_PUBLIC_FIREBASE_APP_ID"
echo "  - FIREBASE_ADMIN_CLIENT_EMAIL"
echo "  - FIREBASE_ADMIN_PRIVATE_KEY (use Secret Manager for this!)"
echo "  - MOLLIE_API_KEY (use Secret Manager for this!)"
echo "  - ENCRYPTION_KEY (use Secret Manager for this!)"
echo "  - NEXT_PUBLIC_APP_URL=https://${SERVICE_NAME}-xxxxx-ew.a.run.app"
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo "1. Add environment variables to Cloud Run (see above)"
echo "2. Push to main branch to trigger deployment:"
echo "   git add . && git commit -m 'Add CI/CD pipeline' && git push"
echo "3. Monitor build at:"
echo "   https://console.cloud.google.com/cloud-build/builds;region=${REGION}?project=${PROJECT_ID}"
echo ""
echo "Your app will be available at:"
echo "   https://${SERVICE_NAME}-xxxxx-ew.a.run.app"
echo ""
