# Phase 3: CI/CD Pipeline with Security Scanning

This guide documents the implementation of a complete CI/CD pipeline using GitHub Actions, including container image building, vulnerability scanning, signing, and automated GitOps deployments.

## Prerequisites

- ✅ Phase 2 Complete (GitOps repository with ArgoCD configured)
- ✅ Phase 2b Complete (Ingress configured with *.local domains)
- ✅ GitHub account with repository permissions
- ✅ Application source code repository

---

## Overview

### What This Phase Adds

Transform your development workflow with automated CI/CD that ensures security and compliance at every step:

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| **GitHub Actions** | Automated CI/CD pipeline | Multi-architecture builds for arm64/amd64 |
| **GitHub Container Registry** | Container image storage | Private registry at ghcr.io |
| **Trivy** | Vulnerability scanning | SARIF reports and security alerts |
| **Cosign** | Image signing | Keyless OIDC signing with Sigstore |
| **Syft** | SBOM generation | Software bill of materials |
| **GitOps Integration** | Automated deployments | PRs to k8s repository |

### Pipeline Architecture

```
Developer Push → GitHub Actions → Build Image → Push to GHCR
                                       ↓
                              Security Scanning (Trivy)
                                       ↓
                              Image Signing (Cosign)
                                       ↓
                              SBOM Generation (Syft)
                                       ↓
                              Create PR in GitOps Repo
                                       ↓
                              ArgoCD Deploys on Merge
```

---

## Application Repository Setup

### Step 1: Prepare Application Repository

Set up the Go API application that will be deployed through the pipeline.

**Application Repository:**
```
Repository: github.com/sojohnnysaid/hello-go-api
Language: Go 1.23
Framework: Huma (OpenAPI/Swagger generation)
```

**Create GitHub Actions directory:**
```bash
cd ~/Experiments/hello-go-api
mkdir -p .github/workflows
```

**Directory Structure:**
```
hello-go-api/
├── .github/
│   └── workflows/
│       └── ci.yml          # CI/CD pipeline
├── Dockerfile              # Multi-stage build
├── main.go                # Application code
├── go.mod                 # Go dependencies
└── README.md              # Documentation
```

**Status:** ✅ Complete

---

### Step 2: Create Multi-Stage Dockerfile

Optimize container size and security with a multi-stage build using scratch image.

**Dockerfile:**
```dockerfile
# Build stage
FROM golang:1.23-alpine AS builder

# Install ca-certificates for HTTPS
RUN apk add --no-cache ca-certificates

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o hello-go-api .

# Final stage
FROM scratch

# Copy ca-certificates from builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary from builder
COPY --from=builder /app/hello-go-api /hello-go-api

# Expose port
EXPOSE 8888

# Run the binary
ENTRYPOINT ["/hello-go-api"]
```

**Key Features:**
- Multi-stage build reduces image size
- Scratch base image for minimal attack surface
- Static binary with no external dependencies
- CA certificates included for HTTPS support

**Status:** ✅ Complete

---

## GitHub Actions Workflow

### Step 3: Configure CI/CD Pipeline

Create comprehensive GitHub Actions workflow with security scanning and GitOps integration.

**File:** `.github/workflows/ci.yml`

**Pipeline Features:**
```yaml
name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write  # For OIDC/Cosign
    
    steps:
      # Multi-architecture support (arm64/amd64)
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
      
      # Build and push to GHCR
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64
          
      # Security scanning with Trivy
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        
      # Image signing with Cosign
      - name: Sign container image with Cosign (keyless)
        env:
          COSIGN_EXPERIMENTAL: 1
          
      # SBOM generation with Syft
      - name: Generate SBOM with Syft
        uses: anchore/sbom-action@v0
        
  update-gitops:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      # Create PR in GitOps repository
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
```

**Status:** ✅ Complete

---

### Step 4: Configure Personal Access Token

Set up secure cross-repository access for GitOps updates.

**Create Fine-Grained PAT:**

1. Navigate to GitHub Settings → Developer Settings → Personal Access Tokens
2. Create new fine-grained token:
   - **Name:** `gitops-updater`
   - **Expiration:** 30 days
   - **Repository access:** Select specific repositories
     - `sojohnnysaid/hello-go-api`
     - `sojohnnysaid/k8s`
   - **Permissions:**
     - Contents: Read and Write
     - Pull requests: Read and Write
     - Metadata: Read

**Add as Repository Secret:**

1. Navigate to hello-go-api repository settings
2. Go to Secrets and variables → Actions
3. Add new repository secret:
   - **Name:** `GITOPS_TOKEN`
   - **Value:** [Your PAT token]

**Security Notes:**
- Fine-grained token with minimal permissions
- Limited to specific repositories only
- 30-day expiration for automatic rotation
- Never commit tokens to code

**Status:** ✅ Complete

---

## GitOps Repository Configuration

### Step 5: Create Kubernetes Manifests

Set up application deployment configuration in the GitOps repository.

**Create application directory:**
```bash
cd ~/k8s
mkdir -p argocd-apps/hello-go-api
```

**Deployment manifest (`deployment.yaml`):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-go-api
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello-go-api
  template:
    metadata:
      labels:
        app: hello-go-api
    spec:
      containers:
      - name: hello-go-api
        image: ghcr.io/sojohnnysaid/hello-go-api:latest
        ports:
        - containerPort: 8888
        resources:
          limits:
            memory: "128Mi"
            cpu: "100m"
```

**Service manifest (`service.yaml`):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-go-api
  namespace: default
spec:
  selector:
    app: hello-go-api
  ports:
  - port: 80
    targetPort: 8888
```

**Ingress manifest (`ingress.yaml`):**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello-go-api
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: api.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hello-go-api
            port:
              number: 80
```

**Kustomization (`kustomization.yaml`):**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: default

resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml

images:
  - name: ghcr.io/sojohnnysaid/hello-go-api
    newTag: latest
```

**Status:** ✅ Complete

---

### Step 6: Create ArgoCD Application

Configure ArgoCD to manage the hello-go-api deployment.

**ArgoCD Application (`hello-go-api-app.yaml`):**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hello-go-api
  namespace: argocd
  annotations:
    argocd.argoproj.io/external-urls: |
      - http://api.local
      - http://api.local/docs
spec:
  project: default
  source:
    repoURL: git@github.com:sojohnnysaid/k8s.git
    path: argocd-apps/hello-go-api
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
  info:
    - name: 'API Endpoint'
      value: 'http://api.local'
    - name: 'Swagger Docs'
      value: 'http://api.local/docs'
    - name: 'OpenAPI Spec'
      value: 'http://api.local/openapi.json'
```

**Apply the application:**
```bash
kubectl apply -f argocd-apps/hello-go-api-app.yaml
```

**Status:** ✅ Complete

---

### Step 7: Configure Local DNS

Add the API domain to your local hosts file.

**Update /etc/hosts:**
```bash
# Add api.local to existing entries
echo "127.0.0.1   api.local" | sudo tee -a /etc/hosts
```

**Verify DNS resolution:**
```bash
ping -c 1 api.local
```

**Expected output:**
```
PING api.local (127.0.0.1): 56 data bytes
64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.xxx ms
```

**Status:** ✅ Complete

---

## Testing the Pipeline

### Step 8: Fix Application Network Binding

Ensure the application binds to all interfaces for container networking.

**Update main.go:**
```go
// Change from localhost binding
http.ListenAndServe("127.0.0.1:8888", router)

// To all interfaces binding
http.ListenAndServe("0.0.0.0:8888", router)
```

**Why this is needed:**
- `127.0.0.1` only allows connections from within the container
- `0.0.0.0` allows connections from the Kubernetes network
- Required for Service to reach the container

**Status:** ✅ Complete

---

### Step 9: Fix Multi-Architecture Support

Enable building for both arm64 (Mac M1/M2) and amd64 architectures.

**Update workflow to include QEMU:**
```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3
  
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64
```

**This fixes:**
- ImagePullBackOff errors on arm64 clusters
- Compatibility with both local (Mac) and cloud (Linux) environments
- Future-proofs for different architectures

**Status:** ✅ Complete

---

### Step 10: Trigger and Monitor Pipeline

Push changes to trigger the complete CI/CD pipeline.

**Commit and push changes:**
```bash
git add .
git commit -m "feat: add CI/CD pipeline with security scanning"
git push origin main
```

**Monitor workflow execution:**
1. Navigate to https://github.com/sojohnnysaid/hello-go-api/actions
2. Watch the workflow progress through:
   - Docker image build (multi-arch)
   - Push to GHCR
   - Trivy vulnerability scan
   - Cosign image signing
   - SBOM generation
   - GitOps PR creation

**Verify GitOps PR:**
1. Check https://github.com/sojohnnysaid/k8s/pulls
2. Review the automated PR with updated image tag
3. Merge PR to trigger ArgoCD deployment

**Status:** ✅ Complete

---

## Verification

### Step 11: Verify Deployment

Confirm the application is running and accessible.

**Check pod status:**
```bash
kubectl get pods -n default | grep hello-go
```

**Expected output:**
```
hello-go-api-57556c5cdc-rz89b   1/1     Running   0          3m5s
hello-go-api-57556c5cdc-w7glx   1/1     Running   0          3m7s
```

**Test API endpoints:**
```bash
# Test greeting endpoint
curl http://api.local/greeting/world
```

**Expected response:**
```json
{
  "$schema": "https://api.local/schemas/GreetingOutputBody.json",
  "message": "Hello, world!"
}
```

**Access Swagger documentation:**
- Browse to http://api.local/docs
- Interactive API documentation with try-it-out functionality

**Status:** ✅ Complete

---

## Phase 3 Complete!

### Summary of Achievements

You have successfully implemented a complete CI/CD pipeline with enterprise-grade security:

| Component | Status | Details |
|-----------|--------|---------|
| **GitHub Actions Workflow** | ✅ | Multi-job pipeline with security scanning |
| **Multi-Architecture Builds** | ✅ | Supports arm64 and amd64 platforms |
| **Container Registry** | ✅ | Images stored in GitHub Container Registry |
| **Vulnerability Scanning** | ✅ | Trivy scans on every build |
| **Image Signing** | ✅ | Cosign keyless signing with OIDC |
| **SBOM Generation** | ✅ | Software bill of materials with Syft |
| **GitOps Integration** | ✅ | Automated PRs to k8s repository |
| **Automated Deployment** | ✅ | ArgoCD syncs on PR merge |

### Security Features Implemented

**Supply Chain Security:**
- ✅ Signed container images with Cosign
- ✅ SBOM attached to every image
- ✅ Vulnerability scanning with CVE detection
- ✅ SARIF reports for GitHub Security tab
- ✅ Minimal container images (FROM scratch)

**Access Control:**
- ✅ Fine-grained PAT with minimal permissions
- ✅ Repository-specific token scope
- ✅ Automated token rotation reminders
- ✅ GitOps approval via PR review

### Pipeline Flow

```
1. Developer pushes code → GitHub Actions triggered
2. Multi-arch image built → Pushed to GHCR
3. Security scans run → Results uploaded to GitHub
4. Image signed → Signature in Rekor transparency log
5. SBOM generated → Attached to image
6. PR created → Updates image tag in GitOps repo
7. Human reviews PR → Merges to approve deployment
8. ArgoCD detects change → Deploys to cluster
9. Application live → Accessible via ingress
```

### Access Information

**Container Registry:**
- **Images:** `ghcr.io/sojohnnysaid/hello-go-api`
- **Tags:** `latest`, `main`, `main-<7-char-sha>`
- **Architectures:** linux/amd64, linux/arm64

**Application Endpoints:**
- **API Base:** http://api.local
- **Swagger UI:** http://api.local/docs
- **OpenAPI Spec:** http://api.local/openapi.json
- **Example:** http://api.local/greeting/world

**ArgoCD Application:**
- **Name:** hello-go-api
- **Namespace:** default
- **Sync Policy:** Auto-sync enabled
- **External URLs:** Configured in application metadata

### Key Learnings

**Architecture Considerations:**
- Multi-architecture builds essential for Mac development
- Container networking requires 0.0.0.0 binding
- Image tags must match between CI and GitOps

**Security Best Practices:**
- Never use classic PATs when fine-grained available
- Always scan images before deployment
- Sign images for supply chain integrity
- Generate SBOMs for compliance

**GitOps Workflow:**
- PR-based approvals provide audit trail
- Kustomize manages image versions cleanly
- ArgoCD auto-sync reduces manual intervention

### Troubleshooting Guide

**ImagePullBackOff Errors:**
```bash
# Check image architecture
docker manifest inspect ghcr.io/sojohnnysaid/hello-go-api:tag

# Verify multi-arch support
# Should show both amd64 and arm64
```

**502 Bad Gateway from Ingress:**
```bash
# Check application logs
kubectl logs <pod-name> -n default

# Verify binding address (should be 0.0.0.0:8888)
# Not 127.0.0.1:8888
```

**GitHub Actions Failures:**
```bash
# Check workflow logs for specific step
# Common issues:
# - GITOPS_TOKEN not set
# - Image tag mismatch
# - QEMU not configured for multi-arch
```

**ArgoCD Not Syncing:**
```bash
# Check application status
kubectl get application hello-go-api -n argocd

# Force sync if needed
argocd app sync hello-go-api
```

### Next Steps

With Phase 3 complete, you have:
- ✅ Automated CI/CD pipeline with security scanning
- ✅ GitOps deployment workflow
- ✅ Multi-architecture support for local and cloud
- ✅ Complete supply chain security

You can now proceed to:
- **Phase 4:** Azure AKS for production deployment
- **Phase 5:** Advanced observability and monitoring
- **Phase 6:** Secrets management with SOPS
- **Phase 7:** Velero backup configuration
- **Phase 8:** Security policy enforcement

### Useful Commands

**Monitor CI/CD pipeline:**
```bash
# View recent workflow runs
gh run list --repo sojohnnysaid/hello-go-api

# Watch specific run
gh run watch --repo sojohnnysaid/hello-go-api
```

**Verify image signing:**
```bash
# Check image signature
COSIGN_EXPERIMENTAL=1 cosign verify \
  ghcr.io/sojohnnysaid/hello-go-api:main \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

**View SBOM:**
```bash
# Download and inspect SBOM
cosign download sbom ghcr.io/sojohnnysaid/hello-go-api:main
```

**Check GitOps sync status:**
```bash
# View ArgoCD application details
argocd app get hello-go-api

# Check current image tag
kubectl get deployment hello-go-api -n default \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

---

*Phase 3 Complete - CI/CD Pipeline with Enterprise-Grade Security*