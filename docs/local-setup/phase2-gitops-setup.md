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

Organize the repository for multi-environment support.

**Create Directories:**
```bash
# Create environment directories
mkdir -p environments/dev
mkdir -p environments/prod

# Create base configurations
mkdir -p base/app
mkdir -p base/infrastructure  

# Create Helm values directory
mkdir -p helm-values
```

**Actual Structure:**
```
.
├── README.md
├── base
│   ├── app
│   └── infrastructure
├── environments
│   ├── dev
│   └── prod
├── helm-values
├── local-notes.md
└── prompt.md

8 directories, 3 files
```

**Status:** ✅ Complete

---

### Step 3: Document Directory Structure

Add README files to document the purpose of each directory.

**base/README.md:**
```markdown
# Base Configurations

This directory contains base Kubernetes manifests and Helm charts that are shared across environments.

- **app/**: Application manifests
- **infrastructure/**: Infrastructure components (monitoring, logging, ingress, etc.)
```

**environments/README.md:**
```markdown
# Environment-Specific Configurations

Environment-specific overlays and configurations.

- **dev/**: Local development environment (K3s on Colima)
- **prod/**: Production environment (Azure AKS)
```

**helm-values/README.md:**
```markdown
# Helm Values

Environment-specific Helm values files for charts.
```

**Status:** ✅ Complete

---

## Infrastructure Components Setup

### Step 4: Add Prometheus & Grafana Stack

Configure the kube-prometheus-stack for monitoring.

**Helm Repository Added:**
```
prometheus-community    https://prometheus-community.github.io/helm-charts
```

**File Created: `base/infrastructure/monitoring/kustomization.yaml`**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: monitoring

helmCharts:
  - name: kube-prometheus-stack
    repo: https://prometheus-community.github.io/helm-charts
    version: 65.1.1
    releaseName: monitoring
    namespace: monitoring
    valuesFile: values.yaml
```

**Status:** ✅ Complete

---

### Step 5: Create Monitoring Values File

Configure Prometheus and Grafana settings.

**File Created: `base/infrastructure/monitoring/values.yaml`**
```yaml
# Grafana configuration
grafana:
  enabled: true
  adminPassword: admin  # Change this in production!
  service:
    type: ClusterIP
  ingress:
    enabled: false

# Prometheus configuration
prometheus:
  prometheusSpec:
    retention: 7d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi

# AlertManager configuration
alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 2Gi

# Disable components we don't need in dev
kubeEtcd:
  enabled: false
kubeControllerManager:
  enabled: false
kubeScheduler:
  enabled: false
```

**Status:** ✅ Complete

---

### Step 6: Add EFK Logging Stack

Configure Elasticsearch, Fluent Bit, and Kibana for logging.

**File Created: `base/infrastructure/logging/kustomization.yaml`**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: logging

helmCharts:
- name: elasticsearch
  repo: https://helm.elastic.co
  version: 8.5.1
  releaseName: elasticsearch
  namespace: logging
  valuesFile: elasticsearch-values.yaml

- name: kibana
  repo: https://helm.elastic.co
  version: 8.5.1
  releaseName: kibana
  namespace: logging
  valuesFile: kibana-values.yaml

- name: fluent-bit
  repo: https://fluent.github.io/helm-charts
  version: 0.24.0
  releaseName: fluent-bit
  namespace: logging
  valuesFile: fluent-bit-values.yaml
```

**Helm Repositories Added:**
```
elastic                 https://helm.elastic.co
fluent                  https://fluent.github.io/helm-charts
```

**Status:** ✅ Complete

---

### Step 7: Create EFK Values Files

Create values files for Elasticsearch, Kibana, and Fluent Bit.

**Files Created:**
- `base/infrastructure/logging/elasticsearch-values.yaml` - Single-node ES config for dev
- `base/infrastructure/logging/kibana-values.yaml` - Kibana pointing to ES master
- `base/infrastructure/logging/fluent-bit-values.yaml` - Log collection from all containers

**Directory Structure:**
```
base/infrastructure/logging/
├── elasticsearch-values.yaml
├── fluent-bit-values.yaml
├── kibana-values.yaml
└── kustomization.yaml
```

**Status:** ✅ Complete

---

## Environment-Specific Configurations

### Step 8: Set Up Kustomize Overlays for Dev Environment

Create environment-specific overlays for the dev environment.

**File Created: `environments/dev/kustomization.yaml`**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Reference base configurations
resources:
  - ../../base/infrastructure/monitoring
  - ../../base/infrastructure/logging

# Dev-specific namespace
namespace: dev

# Patches for dev environment
patches:
  - target:
      kind: HelmChart
      name: kube-prometheus-stack
    patch: |-
      - op: replace
        path: /spec/valuesFile
        value: ../../helm-values/dev/monitoring-values.yaml

  - target:
      kind: HelmChart
      name: elasticsearch
    patch: |-
      - op: replace
        path: /spec/valuesFile
        value: ../../helm-values/dev/elasticsearch-values.yaml

# Common labels for all resources
commonLabels:
  environment: dev
  managed-by: argocd
```

**File Created: `helm-values/dev/monitoring-values.yaml`**
- Dev-specific overrides for monitoring stack
- Reduced retention and storage
- AlertManager disabled for dev

**Status:** ✅ Complete

---

### Step 9: Set Up Prod Environment Overlay

Create production environment configuration with enhanced settings.

**File Created: `environments/prod/kustomization.yaml`**
- References base infrastructure components
- Uses production namespace
- Patches to use prod-specific values

**File Created: `helm-values/prod/monitoring-values.yaml`**
- Longer retention periods (30d)
- Larger storage allocations
- Persistence enabled
- AlertManager enabled

**Status:** ✅ Complete

---

## Secrets Management

### Step 10: Set Up SOPS for Secrets Encryption

Configure SOPS (Secrets OPerationS) with Age encryption for secure secret management in GitOps.

**Why SOPS is Needed:**
GitOps requires all configurations to be stored in Git, but we cannot store secrets in plain text. SOPS allows us to:
- Encrypt sensitive data before committing to Git
- Decrypt automatically during deployment via ArgoCD
- Maintain GitOps principles while keeping secrets secure
- Track secret changes in version control without exposing values

**Tools Installed:**
- `sops` - Encryption/decryption tool
- `age` - Modern encryption tool (simpler than GPG)

**Age Key Generated:**
```
age-keygen -o ~/.sops/age/keys.txt
# Public key: age1******* (your public key will appear here)
# Private key: Stored securely in ~/.sops/age/keys.txt
```

**Files Created:**
- `.sops.yaml` - Configuration for automatic encryption rules
- `base/infrastructure/secrets/grafana-secret.yaml` - Sample encrypted secret

**Encryption Process:**
```bash
# Encrypts the file in place, replacing plain text with encrypted values
sops -e -i path/to/secret.yaml
```

**File Created: `.sops.yaml`**
```yaml
creation_rules:
  - path_regex: .*secret.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: >-
      age1******* # Your public key from age-keygen
```

**Sample Secret Created: `base/infrastructure/secrets/grafana-secret.yaml`** (before encryption)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-admin
  namespace: monitoring
type: Opaque
stringData:
  admin-password: supersecretpassword
  admin-user: admin
```

**Encrypt the secret:**
```bash
mkdir -p base/infrastructure/secrets
sops -e -i base/infrastructure/secrets/grafana-secret.yaml
```

**Status:** ✅ Complete

---

### Step 11: Configure KSOPS in ArgoCD

Enable ArgoCD to decrypt SOPS-encrypted secrets using KSOPS plugin.

**Create ArgoCD infrastructure directory:**
```bash
mkdir -p base/infrastructure/argocd
```

**File Created: `base/infrastructure/argocd/repo-server-ksops-patch.yaml`**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      volumes:
      - name: custom-tools
        emptyDir: {}
      - name: sops-age
        secret:
          secretName: sops-age
      initContainers:
      - name: install-ksops
        image: viaductoss/ksops:v4.2.1
        command: ["/bin/sh", "-c"]
        args:
        - echo "Installing KSOPS...";
          mv /usr/local/bin/ksops /custom-tools/;
          mv /usr/local/bin/kustomize /custom-tools/;
          echo "Done.";
        volumeMounts:
        - mountPath: /custom-tools
          name: custom-tools
      containers:
      - name: argocd-repo-server
        volumeMounts:
        - mountPath: /usr/local/bin/kustomize
          name: custom-tools
          subPath: kustomize
        - mountPath: /usr/local/bin/ksops
          name: custom-tools
          subPath: ksops
        - mountPath: /home/argocd/.config/sops/age
          name: sops-age
        env:
        - name: SOPS_AGE_KEY_FILE
          value: /home/argocd/.config/sops/age/keys.txt
        - name: XDG_CONFIG_HOME
          value: /home/argocd/.config
```

**File Created: `base/infrastructure/argocd/kustomization.yaml`**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: argocd

patches:
  - path: repo-server-ksops-patch.yaml
```

**Create Age Secret:**
```bash
kubectl create secret generic sops-age \
  --namespace=argocd \
  --from-file=keys.txt=$HOME/.sops/age/keys.txt
```

**Apply Patch:**
```bash
kubectl patch deployment argocd-repo-server -n argocd \
  --patch-file base/infrastructure/argocd/repo-server-ksops-patch.yaml
```

**Verification:**
```bash
kubectl rollout status deployment/argocd-repo-server -n argocd
kubectl get pods -n argocd | grep repo-server
```

**Status:** ✅ Complete

---

## ArgoCD Repository Configuration

### Step 12: Configure Repository Access

Configure ArgoCD to access your GitOps repository with proper authentication.

**Configure HTTPS with TLS bypass (for corporate networks with SSL interception):**
```bash
kubectl edit configmap argocd-cm -n argocd
```

**Add to the ConfigMap:**
```yaml
data:
  repositories: |
    - url: https://github.com
      insecure: true
  repository.credentials: |
    - url: https://github.com
      insecureIgnoreHostKey: true
      insecureSkipServerVerification: true
```

**Alternative: Create repository secret with SSH:**
```bash
# Create SSH secret
kubectl create secret generic k8s-repo-ssh \
  --namespace=argocd \
  --from-file=sshPrivateKey=$HOME/.ssh/id_ed25519 \
  --from-literal=type=git \
  --from-literal=url=git@github.com:sojohnnysaid/k8s.git

# Label the secret
kubectl label secret k8s-repo-ssh -n argocd \
  argocd.argoproj.io/secret-type=repository
```

**Verify repository configuration:**
```bash
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository
```

**Expected Output:**
```
NAME              TYPE     DATA   AGE
k8s-repo-ssh      Opaque   3      XXm
```

**Status:** ✅ Complete

---

## Deploying Monitoring Stack

### Step 13: Clean Repository Structure

Organize the repository for clean application deployment.

**Create directory structure:**
```bash
cd /path/to/your/k8s-repo

# Create ArgoCD applications directory
mkdir -p argocd-apps

# Archive any test applications
mkdir -p archive/test-apps
mv argocd-apps/test* archive/test-apps/ 2>/dev/null || true
```

**Repository structure:**
```
k8s/
├── argocd-apps/           # ArgoCD application definitions
├── base/                  # Base configurations
│   └── infrastructure/    # Infrastructure components
├── environments/          # Environment-specific configs
│   ├── dev/
│   └── prod/
└── helm-values/          # Helm value overrides
```

**Status:** ✅ Complete

---

### Step 14: Create Monitoring Application

Define the monitoring stack application for ArgoCD.

**Create application manifest:**
```bash
cat > argocd-apps/monitoring-dev.yaml << 'EOF'
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: monitoring-dev
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 65.1.1
    helm:
      releaseName: monitoring
      values: |
        # Grafana configuration
        grafana:
          adminPassword: admin  # Change in production!
          persistence:
            enabled: false  # No persistence for local dev
          service:
            type: ClusterIP

        # Prometheus configuration
        prometheus:
          prometheusSpec:
            retention: 1d  # Short retention for local dev
            storageSpec:
              volumeClaimTemplate:
                spec:
                  accessModes: ["ReadWriteOnce"]
                  resources:
                    requests:
                      storage: 5Gi

        # Disable unnecessary components for local dev
        alertmanager:
          enabled: false
        kubeEtcd:
          enabled: false
        kubeControllerManager:
          enabled: false
        kubeScheduler:
          enabled: false
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true  # Important for CRD size issues
EOF
```

**Note:** The `ServerSideApply=true` option is crucial for handling Prometheus CRDs that have large annotations.

**Status:** ✅ Complete

---

### Step 15: Deploy Monitoring Application

Apply the monitoring application to ArgoCD.

**Deploy the application:**
```bash
kubectl apply -f argocd-apps/monitoring-dev.yaml
```

**Monitor deployment status:**
```bash
# Check application status
kubectl get application monitoring-dev -n argocd -w

# Expected progression:
# NAME             SYNC STATUS   HEALTH STATUS
# monitoring-dev   OutOfSync     Missing
# monitoring-dev   Synced        Progressing
# monitoring-dev   Synced        Healthy
```

**Verify pods are running:**
```bash
kubectl get pods -n monitoring
```

**Expected Output:**
```
NAME                                                   READY   STATUS    RESTARTS
monitoring-grafana-xxx                                 3/3     Running   0
monitoring-kube-prometheus-operator-xxx                1/1     Running   0
monitoring-kube-state-metrics-xxx                      1/1     Running   0
monitoring-prometheus-node-exporter-xxx                1/1     Running   0
prometheus-monitoring-kube-prometheus-prometheus-0     2/2     Running   0
```

**Status:** ✅ Complete

---

### Step 16: Access Grafana Dashboard

Set up access to the Grafana web interface.

**Port-forward Grafana:**
```bash
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
```

**Get admin password:**
```bash
kubectl get secret monitoring-grafana -n monitoring \
  -o jsonpath="{.data.admin-password}" | base64 -d && echo
```

**Access Grafana:**
- URL: http://localhost:3000
- Username: `admin`
- Password: (from command above, default is `admin`)

**Verify dashboards:**
1. Navigate to Dashboards → Browse
2. You should see pre-configured Kubernetes dashboards
3. Check "Kubernetes / API server" for cluster metrics

**Status:** ✅ Complete

---

### Step 17: Verify GitOps Sync

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

### Step 18: Commit Changes to Git

Save your configuration to the GitOps repository.

**Commit and push:**
```bash
# Add monitoring application
git add argocd-apps/monitoring-dev.yaml

# Add gitignore for archive
echo "archive/" >> .gitignore
git add .gitignore

# Commit
git commit -m "feat: add monitoring stack deployment

- kube-prometheus-stack v65.1.1 via Helm
- Dev-optimized configuration
- ServerSideApply for CRD handling
- Auto-sync enabled"

# Push to GitHub
git push origin main
```

**Verify GitOps:**
After pushing, ArgoCD should detect no changes needed (already in sync).

**Status:** ✅ Complete

---

## Phase 2 Complete!

### Summary of Achievements

You have successfully:

| Component | Status | Details |
|-----------|--------|---------|
| **GitOps Repository** | ✅ | Created and structured at `github.com/sojohnnysaid/k8s` |
| **Directory Structure** | ✅ | Organized with `argocd-apps/`, `base/`, `environments/`, `helm-values/` |
| **SOPS Encryption** | ✅ | Age encryption configured for secrets management |
| **KSOPS Integration** | ✅ | ArgoCD configured to decrypt SOPS secrets |
| **Repository Access** | ✅ | SSH and HTTPS with TLS bypass configured |
| **Monitoring Stack** | ✅ | kube-prometheus-stack v65.1.1 deployed |
| **Grafana** | ✅ | Accessible with pre-configured dashboards |
| **GitOps Sync** | ✅ | ArgoCD auto-syncing from Git repository |

### Running Services

**Monitoring Stack Components:**
- **Prometheus**: Collecting and storing metrics (5GB storage, 1 day retention)
- **Grafana**: Visualization with Kubernetes dashboards (port 3000)
- **Node Exporter**: Host metrics collection
- **Kube State Metrics**: Kubernetes object metrics
- **Prometheus Operator**: Managing Prometheus configuration

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
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
# URL: http://localhost:3000
# Username: admin
# Password: admin
```

### Key Configurations

**Repository Structure:**
```
k8s/
├── argocd-apps/
│   └── monitoring-dev.yaml    # Monitoring application definition
├── base/                      # Base configurations (for Kustomize approach)
├── environments/              # Environment-specific overlays
│   ├── dev/
│   └── prod/
├── helm-values/              # Helm value overrides
└── archive/                  # Archived test applications
```

**Important Settings:**
- **ServerSideApply**: Enabled to handle large CRD annotations
- **Auto-sync**: Enabled for automatic deployment from Git
- **TLS Verification**: Bypassed for corporate network compatibility
- **Resource Limits**: Optimized for local development (1 day retention, no AlertManager)

### Next Steps

With Phase 2 complete, you're ready to:
- **Phase 3**: Set up CI/CD pipeline with GitHub Actions
- **Phase 4**: Configure Azure AKS for production
- **Phase 5**: Deploy full observability stack (EFK logging)
- **Phase 6**: Implement advanced secrets management
- **Phase 7**: Configure Velero for backups
- **Phase 8**: Apply security policies

### Troubleshooting Commands

**Check application sync status:**
```bash
kubectl get applications -n argocd
argocd app get monitoring-dev
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
argocd app sync monitoring-dev
```

---