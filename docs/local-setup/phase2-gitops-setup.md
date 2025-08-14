# Phase 2: GitOps Repository and ArgoCD Configuration

This guide documents the setup of a GitOps repository structure and ArgoCD configuration for managing both local development and production environments.

## Prerequisites

- ✅ Phase 1 Complete (Local K8s cluster with ArgoCD installed)
- ✅ GitHub account with repository creation permissions
- ✅ Git configured locally with SSH access to GitHub

---

## GitOps Repository Setup

### Step 1: Create GitOps Repository

Create a dedicated repository for Kubernetes manifests and configurations.

**Repository Created:**
```bash
Repository: github.com/sojohnnysaid/k8s
Type: Private
```

**Clone and Initialize:**
```bash
git clone git@github.com:sojohnnysaid/k8s.git
cd k8s
```

**Status:** ✅ Complete

---

### Step 2: Create Directory Structure

Organize the repository for your Kubernetes manifests.

**Create Directories:**
```bash
# Create directory for ArgoCD application definitions and manifests
mkdir -p argocd-apps/monitoring-manifests
mkdir -p argocd-apps/elastic-manifests

# Create archive for old test applications (optional)
mkdir -p archive/test-apps
```

**Repository Structure:**
```
.
├── README.md
├── argocd-apps/
│   ├── monitoring-manifests/    # Prometheus & Grafana manifests
│   ├── elastic-manifests/       # Elastic Stack manifests
│   ├── monitoring.yaml          # ArgoCD app definition
│   └── elasticsearch-only.yaml  # ArgoCD app definition
└── archive/                     # Archived test applications
```

**Status:** ✅ Complete

---

### Step 3: Create Main README

Document your repository structure and approach.

**README.md:**
```markdown
# K8s GitOps Repository

This repository contains raw Kubernetes manifests for our infrastructure, deployed via ArgoCD.

## Architecture Principles
- **No Helm**: All applications use raw Kubernetes manifests for full control
- **GitOps**: ArgoCD syncs from this repository automatically
- **Simplicity**: Direct manifests are easier to understand and debug

## Directory Structure
- `argocd-apps/` - ArgoCD application definitions and manifests
  - `monitoring-manifests/` - Prometheus and Grafana
  - `elastic-manifests/` - Elasticsearch, Kibana, Logstash, Filebeat
- `archive/` - Old test applications (not deployed)
```

**Status:** ✅ Complete

---

## Infrastructure Components Setup

### Step 4: Add Prometheus & Grafana Stack

Configure monitoring using raw Kubernetes manifests (moved away from Helm for better control).

**Directory Structure:**
```
argocd-apps/monitoring-manifests/
├── namespace.yaml
├── prometheus.yaml  
├── grafana.yaml
```

**Prometheus Configuration:** Raw manifests with:
- ServiceAccount and RBAC for cluster monitoring
- ConfigMap with scraping configuration
- Deployment with resource limits optimized for local development
- Service for internal access

**Grafana Configuration:** Raw manifests with:
- ConfigMap for Prometheus datasource
- Deployment with anonymous admin access for dev
- Service exposing port 3000

**Status:** ✅ Complete

---

### Step 5: Add Elastic Stack (ELK + Filebeat)

Configure complete logging solution using raw Kubernetes manifests.

**Directory Structure:**
```
argocd-apps/elastic-manifests/
├── namespace.yaml
├── elasticsearch.yaml
├── kibana.yaml
├── logstash.yaml
└── filebeat.yaml
```

**Elasticsearch Configuration:**
- Single-node setup with `discovery.type: single-node`
- 2GB memory, ephemeral storage for local dev
- Security disabled for simplicity
- Service exposing port 9200

**Kibana Configuration:**
- Connected to Elasticsearch service
- Web UI on port 5601
- Auto-configured for Elasticsearch connection

**Logstash Configuration:**
- Beats input on port 5044
- Processing pipeline for Kubernetes metadata
- Output to Elasticsearch with daily indices

**Filebeat Configuration:**
- DaemonSet collecting logs from all containers
- Kubernetes metadata enrichment
- Ships to Logstash for processing
- RBAC configured for pod/node access

**Status:** ✅ Complete

---

### Step 6: Repository Configuration for SSH Access

Configure ArgoCD to access the GitOps repository via SSH.

**SSH Key Setup:**
```bash
# ArgoCD SSH keys should be in ~/.ssh/
ls ~/.ssh/argocd*
# argocd-github (private key)
# argocd-github.pub (public key added to GitHub deploy keys)
```

**Create Repository Secret:**
```bash
kubectl create secret generic github-k8s-repo \
  --namespace=argocd \
  --from-literal=type=git \
  --from-literal=url=git@github.com:sojohnnysaid/k8s.git \
  --from-file=sshPrivateKey=$HOME/.ssh/argocd-github

kubectl label secret github-k8s-repo -n argocd \
  argocd.argoproj.io/secret-type=repository
```

**Status:** ✅ Complete

---

### Step 7: Create Application Manifests

Create raw Kubernetes manifests for each component.

**Files to Create:**
```
argocd-apps/
├── monitoring-manifests/
│   ├── namespace.yaml       # Creates monitoring namespace
│   ├── prometheus.yaml      # Prometheus deployment, service, RBAC
│   └── grafana.yaml         # Grafana deployment, service, configmaps
└── elastic-manifests/
    ├── namespace.yaml       # Creates elastic-stack namespace
    ├── elasticsearch.yaml   # Single-node ES StatefulSet
    ├── kibana.yaml          # Kibana deployment and service
    ├── logstash.yaml        # Logstash deployment for processing
    └── filebeat.yaml        # DaemonSet for log collection
```

**Key Configuration Choices:**
- Raw Kubernetes manifests for full control
- Minimal resource requirements for local development
- Ephemeral storage (no persistent volumes)
- Security disabled for simplicity in dev

**Status:** ✅ Complete

---

## ArgoCD Repository Configuration

### Step 8: Configure Repository Access

Configure ArgoCD to access your GitOps repository via SSH.

**Create SSH Keys for ArgoCD:**
```bash
# Generate SSH key pair if not already done
ssh-keygen -t ed25519 -f ~/.ssh/argocd-github -C "argocd-local"

# Add public key to GitHub repository as Deploy Key with read-only access
cat ~/.ssh/argocd-github.pub
# Copy and add to: GitHub Repo Settings > Deploy keys > Add deploy key
```

**Create Repository Secret:**
```bash
# Create secret with SSH private key
kubectl create secret generic github-k8s-repo \
  --namespace=argocd \
  --from-literal=type=git \
  --from-literal=url=git@github.com:sojohnnysaid/k8s.git \
  --from-file=sshPrivateKey=$HOME/.ssh/argocd-github

# Label as repository secret
kubectl label secret github-k8s-repo -n argocd \
  argocd.argoproj.io/secret-type=repository
```

**Verify repository configuration:**
```bash
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository
```

**Expected Output:**
```
NAME              TYPE     DATA   AGE
github-k8s-repo   Opaque   3      XXm
```

**Status:** ✅ Complete

---

## Deploying Monitoring Stack

### Step 9: Prepare Repository

Ensure your repository is clean and organized.

**Clean up any test applications:**
```bash
cd /path/to/your/k8s-repo

# Archive any test applications if they exist
mkdir -p archive/test-apps
mv argocd-apps/test* archive/test-apps/ 2>/dev/null || true
```

**Final repository structure:**
```
k8s/
├── argocd-apps/
│   ├── monitoring-manifests/     # Raw K8s manifests
│   ├── elastic-manifests/        # Raw K8s manifests
│   ├── monitoring.yaml           # ArgoCD app definition
│   └── elasticsearch-only.yaml   # ArgoCD app definition
├── archive/                      # Not deployed
└── README.md
```

**Status:** ✅ Complete

---

### Step 10: Create ArgoCD Applications

Define applications for both monitoring and logging stacks using Git repository.

**Monitoring Application (`argocd-apps/monitoring.yaml`):**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: monitoring
  namespace: argocd
spec:
  project: default
  source:
    repoURL: git@github.com:sojohnnysaid/k8s.git
    path: argocd-apps/monitoring-manifests
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

**Elastic Stack Application (`argocd-apps/elasticsearch-only.yaml`):**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: elasticsearch
  namespace: argocd
spec:
  project: default
  source:
    repoURL: git@github.com:sojohnnysaid/k8s.git
    path: argocd-apps/elastic-manifests
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: elastic-stack
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

**Note:** Both applications pull raw Kubernetes manifests directly from your Git repository.

**Status:** ✅ Complete

---

### Step 11: Deploy Applications

Apply both monitoring and Elastic Stack applications to ArgoCD.

**Deploy the applications:**
```bash
kubectl apply -f argocd-apps/monitoring.yaml
kubectl apply -f argocd-apps/elasticsearch-only.yaml
```

**Monitor deployment status:**
```bash
# Check application status
kubectl get applications -n argocd

# Expected output:
# NAME            SYNC STATUS   HEALTH STATUS
# monitoring      Synced        Healthy
# elasticsearch   Synced        Healthy
```

**Verify pods are running:**
```bash
# Monitoring stack
kubectl get pods -n monitoring
# Expected: prometheus and grafana pods

# Elastic stack
kubectl get pods -n elastic-stack
# Expected: elasticsearch, kibana, logstash, and filebeat pods
```

**Status:** ✅ Complete

---

### Step 12: Access Dashboards

Set up access to both Grafana and Kibana web interfaces.

**Grafana (Metrics):**
```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
```
- URL: http://localhost:3000
- Username: `admin`
- Password: `admin`
- Pre-configured with Prometheus datasource

**Kibana (Logs):**
```bash
kubectl port-forward -n elastic-stack svc/kibana 5601:5601
```
- URL: http://localhost:5601
- No authentication required (security disabled for dev)
- Create index pattern `logstash-*` to view logs
- All container logs are automatically collected

**Status:** ✅ Complete

---

### Step 13: Verify GitOps Sync

Confirm ArgoCD is managing the deployment via GitOps.

**Check in ArgoCD UI:**
```bash
# Port-forward ArgoCD
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

**Access ArgoCD:**
- URL: https://localhost:8080
- Username: `admin`
- Password: (from command above)

**Verify application in UI:**
- Application should show as "Synced" and "Healthy"
- All resources should be green
- Auto-sync should be enabled

**Status:** ✅ Complete

---

### Step 14: Commit Changes to Git

Save your configuration to the GitOps repository.

**Commit and push:**
```bash
# Add application manifests
git add argocd-apps/

# Commit
git commit -m "feat: add observability stacks using raw manifests

- Monitoring: Prometheus and Grafana
- Logging: Complete Elastic Stack (ELK + Filebeat)
- Raw Kubernetes manifests only
- Auto-sync enabled for GitOps"

# Push to GitHub
git push origin main
```

**Verify GitOps:**
After pushing, ArgoCD automatically syncs and deploys any changes.

**Status:** ✅ Complete

---

## Phase 2 Complete!

### Summary of Achievements

You have successfully:

| Component | Status | Details |
|-----------|--------|---------|
| **GitOps Repository** | ✅ | Created at `github.com/sojohnnysaid/k8s` |
| **Repository Structure** | ✅ | Simple structure with `argocd-apps/` containing all manifests |
| **SSH Access** | ✅ | Deploy keys configured for ArgoCD |
| **Monitoring Stack** | ✅ | Prometheus & Grafana using raw Kubernetes manifests |
| **Elastic Stack** | ✅ | Complete ELK + Filebeat for log aggregation |
| **GitOps Sync** | ✅ | ArgoCD auto-syncing from Git repository |
| **Architecture** | ✅ | 100% raw Kubernetes manifests, no templating |

### Running Services

**Monitoring Stack (Metrics):**
- **Prometheus**: Collecting and storing metrics with minimal resources
- **Grafana**: Visualization with Prometheus datasource (port 3000)

**Elastic Stack (Logs):**
- **Elasticsearch**: Log storage and indexing (single-node, ephemeral)
- **Kibana**: Log visualization and search UI (port 5601)  
- **Logstash**: Log processing and enrichment pipeline
- **Filebeat**: DaemonSet collecting logs from all containers

### Access Information

**ArgoCD UI:**
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# URL: https://localhost:8080
# Username: admin
# Password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

**Grafana UI:**
```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
# URL: http://localhost:3000
# Username: admin
# Password: admin
```

**Kibana UI:**
```bash
kubectl port-forward -n elastic-stack svc/kibana 5601:5601
# URL: http://localhost:5601
# No authentication (security disabled for dev)
# Create index pattern: logstash-*
```

### Key Configurations

**Repository Structure:**
```
k8s/
├── argocd-apps/
│   ├── monitoring.yaml                    # ArgoCD app for monitoring stack
│   ├── elasticsearch-only.yaml            # ArgoCD app for Elastic stack
│   ├── monitoring-manifests/              # Raw K8s manifests
│   │   ├── namespace.yaml
│   │   ├── prometheus.yaml
│   │   └── grafana.yaml
│   └── elastic-manifests/                 # Raw K8s manifests
│       ├── namespace.yaml
│       ├── elasticsearch.yaml
│       ├── kibana.yaml
│       ├── logstash.yaml
│       └── filebeat.yaml
└── README.md
```

**Important Settings:**
- **Manifest-based**: All deployments use raw Kubernetes manifests
- **Auto-sync**: Enabled for automatic deployment from Git
- **SSH Authentication**: Repository access via SSH deploy keys
- **Resource Limits**: Optimized for local development
- **Ephemeral Storage**: No persistent volumes for simplicity
- **Security Disabled**: Elasticsearch/Kibana security off for dev

### Next Steps

With Phase 2 complete, you have a fully functional local development environment with:
- ✅ Complete monitoring stack (Prometheus & Grafana)
- ✅ Complete logging stack (Elastic Stack with ELK + Filebeat)
- ✅ GitOps workflow with ArgoCD
- ✅ All using raw Kubernetes manifests

**Immediate Next Step:**
- **[Phase 2b - Ingress Controller Setup](phase2b-ingress-setup.md)**: Enhance your local development by replacing port-forwarding with permanent *.local domain access for all services. This optional but highly recommended phase will give you production-like service access.

Future phases include:
- **Phase 3**: CI/CD pipeline with GitHub Actions
- **Phase 4**: Azure AKS for production deployment
- **Phase 5**: Advanced secrets management
- **Phase 6**: Velero for backup and disaster recovery
- **Phase 7**: Security policies and hardening

### Troubleshooting Commands

**Check application sync status:**
```bash
kubectl get applications -n argocd
argocd app get monitoring
```

**View ArgoCD logs:**
```bash
kubectl logs -n argocd deployment/argocd-server
kubectl logs -n argocd deployment/argocd-repo-server
```

**Check monitoring pods:**
```bash
kubectl get pods -n monitoring
kubectl describe pod <pod-name> -n monitoring
```

**Test GitOps sync:**
```bash
# Make a change in the repository
# ArgoCD should detect and sync within 3 minutes
argocd app sync monitoring
```

---