# Linux Server Security Review

## Server

SecureShip Jenkins/Deployment Server

## Operating System

Ubuntu Linux

## 1. SSH Security

Review:

- Root SSH login
- Password authentication
- Key-based authentication
- Exposed SSH port

Commands reviewed:

```bash
sudo systemctl status ssh

2. Firewall

Verify that only required network services are exposed.

Expected production-style services may include:

SSH
HTTP
HTTPS
Jenkins administration where required

Unnecessary ports should not be exposed publicly.

3. System Resources

Disk and memory utilization should be monitored regularly.

Commands:

df -h
free -h
4. Docker Security

The SecureShip baseline container was reviewed for:

Privileged mode
Container user
Read-only filesystem
Exposed ports
Runtime configuration
5. Jenkins Security

Jenkins should use:

Authentication
Role-based access where applicable
Credentials Store for secrets
Build retention
Pipeline timeouts
6. Findings

The baseline environment requires additional security hardening and operational controls.

The final implementation will address the application container and CI/CD security controls while avoiding unnecessary changes to the existing Jenkins installation.


---

# STEP 16 — Dependency Security Scan

Now we start the actual security analysis.

Go to:

```bash
cd /data/projects/secureship-devops/app

Run:

npm audit

Then:

npm audit --audit-level=high

Do not change dependencies based on expected output.

We want the actual result from your environment.

Save the output for our report.

You can also run:

npm audit --json > /data/projects/secureship-devops/evidence/npm-audit.json