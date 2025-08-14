# Portable K8s GitOps Playbook

Welcome to the Portable K8s GitOps Playbook - a comprehensive guide for building a lean, self-managed Kubernetes platform using modern cloud-native tools and GitOps principles.

## Project Overview

This playbook provides a complete blueprint for establishing a production-ready Kubernetes environment with:

- **Local Development Environment** that mirrors production
- **GitOps-based deployment** using ArgoCD
- **CI/CD pipelines** with GitHub Actions
- **Full observability stack** (metrics, logs, traces)
- **Security baseline** with Pod Security Standards
- **Automated backups and disaster recovery**

## Current Status

### ✅ Phase 1: Local Development Environment Setup - COMPLETE

We've successfully set up a local Kubernetes development environment on macOS with:

- **Kubernetes Cluster:** K3s running via Colima (6 CPU, 12GB RAM, 60GB disk)
- **Container Runtime:** Docker via Colima
- **GitOps:** ArgoCD installed and accessible
- **CLI Tools:** kubectl, Tilt, Azure CLI, ArgoCD CLI

[View Phase 1 Documentation](local-setup/phase1-environment-setup.md)

### ✅ Phase 2: GitOps Repository and ArgoCD Configuration - COMPLETE

We've established a complete GitOps workflow with:

- **GitOps Repository:** Structured repository at `github.com/sojohnnysaid/k8s`
- **Monitoring Stack:** Prometheus & Grafana deployed using raw Kubernetes manifests
- **Elastic Stack:** Complete ELK (Elasticsearch, Logstash, Kibana) + Filebeat for log aggregation
- **Auto-sync:** ArgoCD automatically deploying from Git
- **Repository Access:** SSH keys configured for secure access
- **Manifest-based Deployment:** Moved away from Helm charts to raw Kubernetes manifests for better control

[View Phase 2 Documentation](local-setup/phase2-gitops-setup.md)

### 🚀 Quick Start

If you're just getting started, begin with:

1. [Phase 1 - Local Development Environment Setup](local-setup/phase1-environment-setup.md) - Get your local K8s cluster running
2. [Phase 2 - GitOps Repository and ArgoCD Configuration](local-setup/phase2-gitops-setup.md) - Set up GitOps workflow
3. [Goals & Non-Goals](goals.md) - Understand what this project aims to achieve
4. [Principles](principles.md) - Learn the guiding principles behind our decisions

## Architecture

This playbook implements a modern cloud-native architecture featuring:

- **Platform:** Kubernetes (K3s locally, AKS in Azure)
- **GitOps:** ArgoCD for continuous deployment
- **CI/CD:** GitHub Actions for builds and testing
- **Observability:** Prometheus, Grafana, Elastic Stack (ELK + Filebeat)
- **Security:** SOPS for secrets, Pod Security Standards
- **Backups:** Velero for cluster state backup

## Documentation Structure

- **[Reference Architecture](reference/architecture.md)** - System design and components
- **[Local Dev Setup](local-dev.md)** - Development workflow and best practices
  - [Phase 1 - Environment Setup](local-setup/phase1-environment-setup.md)
  - [Phase 2 - GitOps Configuration](local-setup/phase2-gitops-setup.md)
- **[CI/CD & GitOps](cicd/app-pipeline.md)** - Pipeline and deployment strategies
- **[Operations Runbooks](runbooks/bootstrap.md)** - Day-to-day operational procedures
- **[Security Baseline](security.md)** - Security configurations and best practices

## Next Steps

With Phases 1 & 2 complete, the upcoming phases include:

- **Phase 3:** CI/CD Pipeline with GitHub Actions
- **Phase 4:** Azure AKS Provisioning and Production Setup
- **Phase 5:** ✅ Full Observability Stack (Elastic Stack Logging) - COMPLETE
- **Phase 6:** Advanced Secrets Management
- **Phase 7:** Velero Backup Configuration
- **Phase 8:** Security Policy Enforcement

## Contributing

This is a living document that evolves with best practices and new tools. Contributions and feedback are welcome!

---

*Last Updated: Phase 2 Complete - Full Observability Stack with Monitoring and Logging*
