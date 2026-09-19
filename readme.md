# SecureShip — DevOps Production Readiness & Secure CI/CD

SecureShip is a hands-on **DevOps Production Readiness Review and DevSecOps implementation project** built around a Node.js application running in Docker and deployed through Jenkins.

The project started with an existing CI/CD workflow and was reviewed for **security, automation, reliability, Docker security, deployment safety, and Linux/server configuration**. Identified issues were analyzed, selected improvements were implemented, and the pipeline was executed again to validate the changes.

---

## Project Objective

The objective of SecureShip was to evaluate whether an existing application and CI/CD pipeline were ready for production deployment.

The implementation followed:

```text
Application Review
        ↓
CI/CD Review
        ↓
Security Scanning
        ↓
Issue Identification
        ↓
AI-Assisted Analysis
        ↓
Security & Reliability Improvements
        ↓
Pipeline Re-execution
        ↓
Production Deployment
        ↓
Production Readiness Validation
````

---

## Technology Stack

| Category            | Technology      |
| ------------------- | --------------- |
| Application         | Node.js         |
| Framework           | Express.js      |
| Testing             | Jest, Supertest |
| Containerization    | Docker          |
| CI/CD               | Jenkins         |
| Source Control      | GitHub          |
| Container Security  | Trivy           |
| Dockerfile Security | Hadolint        |
| Dependency Security | npm audit       |
| Server              | AWS EC2         |
| Operating System    | Ubuntu          |
| Container Runtime   | Docker Engine   |
| Application Port    | 3000            |
| Candidate Port      | 3001            |

---

## Architecture

The application is hosted on an AWS EC2 server running Ubuntu.

Jenkins performs the CI/CD workflow and uses Docker to build, validate and deploy the application.

```text
Developer
    │
    │ Git Push
    ▼
 GitHub Repository
    │
    │ Webhook / Pipeline Trigger
    ▼
┌──────────────────────────────────────────────┐
│              Jenkins CI/CD Pipeline           │
│                                              │
│ Checkout                                     │
│     ↓                                        │
│ Environment Validation                       │
│     ↓                                        │
│ Install Dependencies                         │
│     ↓                                        │
│ Dependency Security Scan                     │
│     ↓                                        │
│ Unit Tests                                   │
│     ↓                                        │
│ Dockerfile Lint                              │
│     ↓                                        │
│ Docker Build                                 │
│     ↓                                        │
│ Trivy Image Scan                             │
│     ↓                                        │
│ Runtime Security Validation                 │
│     ↓                                        │
│ Candidate Deployment                         │
│     ↓                                        │
│ Health Check                                 │
│     ↓                                        │
│ Smoke Tests                                  │
│     ↓                                        │
│ Deployment Verification                      │
│     ↓                                        │
│ Production Promotion                         │
└──────────────────────────────────────────────┘
                     │
                     ▼
             Docker Production
              SecureShip API
                  Port 3000
```

---

## CI/CD Pipeline

The final Jenkins pipeline contains automated stages for application validation, security scanning, Docker security and deployment verification.

### Pipeline Flow

```text
Checkout
   ↓
Environment Validation
   ↓
Install Dependencies
   ↓
Dependency Security Scan
   ↓
Unit Tests
   ↓
Dockerfile Lint
   ↓
Docker Build
   ↓
Trivy Image Scan
   ↓
Runtime Security Validation
   ↓
Deploy Candidate
   ↓
Candidate Health Check
   ↓
Smoke Tests
   ↓
Deployment Verification
   ↓
Promote Candidate
```

### Major Pipeline Stages

#### 1. Checkout

Retrieves the latest application source code from GitHub.

#### 2. Environment Validation

Validates the required build environment before continuing with the pipeline.

#### 3. Install Dependencies

Installs application dependencies using:

```bash
npm ci
```

#### 4. Dependency Security Scan

Application dependencies are checked using:

```bash
npm audit --audit-level=high
```

#### 5. Unit Tests

Automated Jest tests are executed before creating the production image.

```bash
npm test
```

#### 6. Dockerfile Lint

Hadolint is used to identify Dockerfile configuration and security issues.

#### 7. Docker Build

A versioned Docker image is created using the hardened Dockerfile.

The production image uses:

```text
node:22-trixie-slim
```

#### 8. Trivy Image Scan

The final image is scanned for HIGH and CRITICAL vulnerabilities.

The pipeline uses:

```text
HIGH,CRITICAL
```

and excludes vulnerabilities for which no fix is currently available.

#### 9. Runtime Security Validation

The candidate image is executed with additional runtime restrictions:

```text
Non-root user
Read-only root filesystem
All Linux capabilities dropped
Temporary writable /tmp
Docker health check
```

#### 10. Candidate Deployment

The new image is deployed separately on:

```text
Port 3001
```

This allows the new container to be validated before production promotion.

#### 11. Health Check

The application health endpoint is validated:

```text
/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "secureship-api"
}
```

#### 12. Smoke Tests

Basic application endpoints are tested to verify that the deployed application is responding correctly.

#### 13. Deployment Verification

The pipeline verifies:

* Candidate container exists
* Container runs as the expected non-root user
* Docker health status becomes `healthy`
* Application health endpoint responds successfully
* Root filesystem remains read-only
* Linux capabilities remain dropped

#### 14. Production Promotion

After successful validation, the candidate is promoted to the production container on:

```text
Port 3000
```

---

# Security Improvements

The original application and pipeline were reviewed for common production-readiness issues.

The following improvements were implemented.

## Container Security

The production container:

* Runs as a non-root user
* Uses a minimal Node.js image
* Removes npm from the runtime image
* Uses a read-only root filesystem
* Drops all Linux capabilities
* Provides a Docker health check
* Uses a restricted writable `/tmp`
* Excludes unnecessary development files from the image

Example runtime configuration:

```bash
--read-only
--cap-drop=ALL
--tmpfs /tmp:rw,noexec,nosuid,size=64m
```

---

## Dependency Security

Application dependencies are checked using:

```bash
npm audit --audit-level=high
```

The application dependency scan is performed before the Docker image is promoted.

---

## Docker Image Security

Trivy is integrated into Jenkins to scan the built image.

Example configuration:

```text
Severity: HIGH, CRITICAL
Scanner: vulnerability
Unfixed vulnerabilities: ignored for blocking gate
Exit code: 1
```

This ensures that actionable high-severity vulnerabilities can prevent deployment.

---

## Dockerfile Security

Hadolint is used to identify Dockerfile issues before the image is promoted.

The Dockerfile follows production-oriented practices including:

* Minimal base image
* Explicit working directory
* Dependency installation using `npm ci`
* Removal of npm from the runtime image
* Non-root execution
* Health check
* JSON-form CMD
* Reduced runtime attack surface

---

# Reliability Improvements

The production-readiness review identified deployment and verification gaps.

The pipeline was improved to automatically verify the application before production promotion.

### Before

```text
Build
  ↓
Docker Run
  ↓
Production
```

The deployment could potentially succeed even if the application was not fully ready.

### After

```text
Build
  ↓
Security Scan
  ↓
Runtime Validation
  ↓
Candidate Deployment
  ↓
Health Check
  ↓
Smoke Test
  ↓
Deployment Verification
  ↓
Production Promotion
```

This ensures that the candidate container is validated before it becomes the production deployment.

---

# Deployment Verification

One of the implementation issues encountered during the project was Docker health status timing.

The application could already respond successfully while Docker still reported:

```text
starting
```

The deployment verification logic was therefore changed to wait for the Docker health check.

```text
starting
   ↓
wait
   ↓
starting
   ↓
wait
   ↓
healthy
   ↓
continue deployment
```

If the container becomes:

```text
unhealthy
```

the deployment verification fails.

This prevents a temporary `starting` state from being incorrectly interpreted as a deployment failure.

---

# Production Application

The SecureShip application exposes basic API endpoints for validation.

### Application

```text
http://<server>:3000
```

### Health

```text
http://<server>:3000/health
```

### Application Information

```text
http://<server>:3000/api/info
```

### Invalid Route Test

```text
http://<server>:3000/does-not-exist
```

Expected response:

```json
{
  "status": "error",
  "message": "Route not found"
}
```

---

# Repository Structure

```text
secureship-devops/
│
├── app/
│   ├── tests/
│   │   └── health.test.js
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
│
├── docs/
│   ├── ai-analysis.md
│   ├── gap-analysis.md
│   ├── linux-hardening.md
│   └── pipeline-review.md
│
├── evidence/
│   ├── trivy-baseline.txt
│   └── trivy-hardened.txt
│
├── screenshots/
│   └── Pipeline and deployment evidence
│
├── security/
│   └── security-scan.md
│
├── .dockerignore
├── .gitignore
├── Dockerfile
├── Dockerfile.baseline
├── Jenkinsfile
└── Jenkinsfile.baseline.backup
```

---

# Baseline vs Hardened Implementation

The repository preserves the original implementation for comparison with the improved version.

```text
Baseline
   │
   ├── Original Docker configuration
   ├── Original Jenkins workflow
   └── Baseline security evidence
            │
            ▼
      Production Review
            │
            ▼
       Gap Analysis
            │
            ▼
        Improvements
            │
            ▼
Hardened Implementation
   │
   ├── Secure Docker image
   ├── Automated security scanning
   ├── Runtime security validation
   ├── Candidate deployment
   ├── Health verification
   └── Production promotion
```

---

# Evidence

The repository contains evidence collected during the production-readiness review.

### Security Scan Evidence

```text
evidence/
├── trivy-baseline.txt
└── trivy-hardened.txt
```

These files provide a comparison between the baseline and hardened container images.

### Documentation

```text
docs/
├── ai-analysis.md
├── gap-analysis.md
├── linux-hardening.md
└── pipeline-review.md
```

These documents contain the analysis and implementation decisions made during the review.

### Pipeline Evidence

Screenshots are maintained under:

```text
screenshots/
```

They demonstrate:

* Baseline pipeline execution
* Hardened pipeline execution
* Security scanning
* Docker deployment
* Candidate validation
* Production deployment
* Application health verification

---

# Production Readiness Areas Covered

| Area                               | Status      |
| ---------------------------------- | ----------- |
| Application Review                 | Completed   |
| CI/CD Review                       | Completed   |
| Dependency Security                | Implemented |
| Dockerfile Security                | Implemented |
| Container Security                 | Implemented |
| Image Vulnerability Scanning       | Implemented |
| Runtime Security Validation        | Implemented |
| Automated Testing                  | Implemented |
| Health Checks                      | Implemented |
| Smoke Testing                      | Implemented |
| Candidate Deployment               | Implemented |
| Deployment Verification            | Implemented |
| Production Promotion               | Implemented |
| Linux/Server Review                | Completed   |
| AI-Assisted Issue Analysis         | Completed   |
| Evidence Collection                | Completed   |
| Production Readiness Documentation | Completed   |

---

# Key Outcomes

The project resulted in a CI/CD workflow with stronger controls around security and deployment validation.

### Security

```text
Reduced container attack surface
        +
Non-root execution
        +
Read-only filesystem
        +
Dropped capabilities
        +
Automated vulnerability scanning
```

### Automation

```text
Manual validation
      ↓
Automated tests
      ↓
Automated security scans
      ↓
Automated runtime validation
      ↓
Automated deployment verification
```

### Reliability

```text
Candidate Deployment
        ↓
Health Check
        ↓
Smoke Tests
        ↓
Deployment Verification
        ↓
Production Promotion
```

---

# Learning Outcomes

This project provided practical experience with:

* Production readiness reviews
* DevSecOps practices
* Jenkins pipeline design
* Docker security
* Linux security fundamentals
* Container vulnerability scanning
* CI/CD security gates
* Automated deployment validation
* Health checks and smoke testing
* Production deployment troubleshooting
* Root-cause analysis
* AI-assisted DevOps analysis
* Evidence-based security improvements

---

# Project Status

**Production-readiness activity completed.**

The SecureShip pipeline was successfully executed after implementing the selected security, automation, and reliability improvements, and the application was validated through Docker health checks, API checks, and production deployment verification.

---

## Author

**Lalit Punjabi**

B.Tech — Artificial Intelligence & Data Science
Arya College of Engineering & IT

GitHub: [lalitpunjabi](https://github.com/lalitpunjabi)
