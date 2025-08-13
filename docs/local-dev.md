# Local Development Environment Setup

This guide documents the setup of a local Kubernetes development environment on macOS using Colima, K3s, and essential cloud-native tools.

## Phase 1: Local Kubernetes with GitOps

### Prerequisites

#### Step 1: Homebrew Package Manager 

Homebrew is required for installing all the tools in this guide.

**Check Installation:**
```bash
brew --version
```

**Expected Output:**
```
Homebrew 4.x.x
```

**Status:**  Installed (Version 4.6.3)

If Homebrew is not installed, run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

### Step 2: Install Colima ✅

Colima provides a lightweight container runtime with Kubernetes support via K3s.

**Installation:**
```bash
brew install colima
```

**Verify Installation:**
```bash
colima version
```

**Expected Output:**
```
colima version 0.x.x
git commit: <commit-hash>
```

**Status:** ✅ Installed (Version 0.8.4)

---

### Step 3: Install nerdctl (Coming Next)

nerdctl is a Docker-compatible CLI for containerd...
