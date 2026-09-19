pipeline {

    agent any

    options {
        timeout(time: 20, unit: 'MINUTES')

        buildDiscarder(
            logRotator(
                numToKeepStr: '10',
                artifactNumToKeepStr: '5'
            )
        )

        timestamps()
    }

    environment {
        APP_NAME = 'secureship'
        IMAGE_NAME = 'secureship'
        CONTAINER_NAME = 'secureship'
        CANDIDATE_CONTAINER = 'secureship-candidate'

        APP_PORT = '3000'
        CANDIDATE_PORT = '3001'

        TRIVY_SEVERITY = 'HIGH,CRITICAL'
        TRIVY_CACHE_DIR = '/data/trivy-cache'
    }

    stages {

        stage('Environment Validation') {
            steps {
                sh '''
                    set -eu

                    echo "===== Environment ====="
                    node --version
                    npm --version
                    docker --version
                    trivy --version

                    echo "===== Disk ====="
                    df -h /

                    echo "===== Docker ====="
                    docker info >/dev/null

                    echo "Environment validation completed."
                '''
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('app') {
                    sh '''
                        set -eu

                        echo "Installing dependencies using npm ci..."
                        npm ci

                        echo "Dependency installation completed."
                    '''
                }
            }
        }

        stage('Dependency Security Scan') {
            steps {
                dir('app') {
                    sh '''
                        set +e

                        mkdir -p ../evidence

                        echo "Running npm audit..."

                        npm audit \
                            --audit-level=high \
                            --json \
                            > ../evidence/npm-audit.json

                        AUDIT_EXIT=$?

                        npm audit --audit-level=high

                        echo "npm audit exit code: ${AUDIT_EXIT}"

                        if [ "${AUDIT_EXIT}" -ne 0 ]; then
                            echo "High/Critical dependency vulnerabilities detected."
                            exit "${AUDIT_EXIT}"
                        fi

                        echo "Dependency security scan passed."
                    '''
                }
            }
        }

        stage('Unit Tests') {
            steps {
                dir('app') {
                    sh '''
                        set -eu

                        npm test -- --runInBand

                        echo "Unit tests passed."
                    '''
                }
            }
        }

        stage('Dockerfile Lint') {
            steps {
                sh '''
                    set -eu

                    mkdir -p evidence

                    docker run --rm -i \
                        hadolint/hadolint \
                        < Dockerfile \
                        2>&1 | tee evidence/hadolint.txt

                    echo "Dockerfile lint passed."
                '''
            }
        }

        stage('Docker Build') {
            steps {
                script {

                    def imageTag = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"

                    env.IMAGE_TAG = imageTag
                    env.FULL_IMAGE = "${env.IMAGE_NAME}:${imageTag}"

                    echo "Building image: ${env.FULL_IMAGE}"

                    sh """
                        set -eu

                        docker build \
                            --pull \
                            -t ${env.FULL_IMAGE} \
                            -t ${env.IMAGE_NAME}:build-${env.BUILD_NUMBER} \
                            .

                        docker image inspect ${env.FULL_IMAGE} >/dev/null

                        echo "Docker image built successfully."
                    """
                }
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                    set +e

                    mkdir -p evidence

                    echo "Running Trivy security scan..."
                    echo "Trivy cache: ${TRIVY_CACHE_DIR}"

                    trivy image \
                        --cache-dir "${TRIVY_CACHE_DIR}" \
                        --severity "${TRIVY_SEVERITY}" \
                        --exit-code 1 \
                        --format table \
                        "${FULL_IMAGE}" \
                        > evidence/trivy-image.txt 2>&1

                    TRIVY_EXIT=$?

                    cat evidence/trivy-image.txt

                    echo "Trivy exit code: ${TRIVY_EXIT}"

                    if [ "${TRIVY_EXIT}" -ne 0 ]; then
                        echo "Trivy security gate FAILED."
                        echo "HIGH or CRITICAL vulnerabilities were detected."
                        exit "${TRIVY_EXIT}"
                    fi

                    echo "Trivy security gate passed."
                '''
            }
        }

        stage('Runtime Security Validation') {
            steps {
                sh '''
                    set -eu

                    echo "Starting temporary security validation container..."

                    docker rm -f secureship-security-test 2>/dev/null || true

                    docker run -d \
                        --name secureship-security-test \
                        --read-only \
                        --tmpfs /tmp:rw,noexec,nosuid,size=64m \
                        --cap-drop=ALL \
                        "${FULL_IMAGE}"

                    echo "Waiting for application health..."

                    HEALTH_STATUS="starting"
                    ATTEMPTS=0
                    MAX_ATTEMPTS=12

                    while [ "${ATTEMPTS}" -lt "${MAX_ATTEMPTS}" ]; do

                        HEALTH_STATUS=$(docker inspect \
                            --format '{{.State.Health.Status}}' \
                            secureship-security-test 2>/dev/null || echo "unknown")

                        echo "Health status: ${HEALTH_STATUS}"

                        if [ "${HEALTH_STATUS}" = "healthy" ]; then
                            break
                        fi

                        if [ "${HEALTH_STATUS}" = "unhealthy" ]; then
                            echo "Container became unhealthy."
                            docker logs secureship-security-test || true
                            exit 1
                        fi

                        ATTEMPTS=$((ATTEMPTS + 1))

                        sleep 2
                    done

                    if [ "${HEALTH_STATUS}" != "healthy" ]; then
                        echo "Container did not become healthy within the expected time."
                        echo "Final health status: ${HEALTH_STATUS}"

                        docker logs secureship-security-test || true

                        docker inspect secureship-security-test \
                            --format '{{json .State.Health}}' || true

                        exit 1
                    fi

                    echo "Container health check passed."

                    echo "Checking container user..."

                    USER_NAME=$(docker exec secureship-security-test whoami)

                    echo "Container user: ${USER_NAME}"

                    if [ "${USER_NAME}" != "node" ]; then
                        echo "ERROR: Container is not running as node."
                        exit 1
                    fi

                    echo "Checking read-only root filesystem..."

                    READONLY_ROOT=$(docker inspect \
                        --format '{{.HostConfig.ReadonlyRootfs}}' \
                        secureship-security-test)

                    echo "ReadonlyRootfs: ${READONLY_ROOT}"

                    if [ "${READONLY_ROOT}" != "true" ]; then
                        echo "ERROR: Root filesystem is not read-only."
                        exit 1
                    fi

                    echo "Checking dropped capabilities..."

                    CAP_DROP=$(docker inspect \
                        --format '{{json .HostConfig.CapDrop}}' \
                        secureship-security-test)

                    echo "CapDrop: ${CAP_DROP}"

                    case "${CAP_DROP}" in
                        *ALL*)
                            echo "All Linux capabilities dropped."
                            ;;
                        *)
                            echo "ERROR: ALL capabilities were not dropped."
                            exit 1
                            ;;
                    esac

                    echo "Runtime security validation passed."
                '''
            }
        }

        stage('Deploy Candidate') {
            steps {
                sh '''
                    set -eu

                    echo "Cleaning previous candidate..."

                    docker rm -f "${CANDIDATE_CONTAINER}" 2>/dev/null || true

                    echo "Starting candidate deployment..."

                    docker run -d \
                        --name "${CANDIDATE_CONTAINER}" \
                        --restart unless-stopped \
                        --read-only \
                        --tmpfs /tmp:rw,noexec,nosuid,size=64m \
                        --cap-drop=ALL \
                        -p "${CANDIDATE_PORT}:3000" \
                        "${FULL_IMAGE}"

                    echo "Candidate container started."

                    docker ps \
                        --filter "name=${CANDIDATE_CONTAINER}"
                '''
            }
        }

        stage('Candidate Health Check') {
            steps {
                sh '''
                    set -eu

                    echo "Waiting for candidate application..."

                    for i in $(seq 1 12); do

                        if curl -fsS \
                            "http://127.0.0.1:${CANDIDATE_PORT}/health" \
                            > /tmp/secureship-health.json; then

                            echo "Candidate health check passed."

                            cat /tmp/secureship-health.json

                            exit 0
                        fi

                        echo "Health check attempt ${i}/12 failed."

                        sleep 2
                    done

                    echo "Candidate failed health check."

                    docker logs "${CANDIDATE_CONTAINER}"

                    exit 1
                '''
            }
        }

        stage('Smoke Tests') {
            steps {
                sh '''
                    set -eu

                    echo "Testing /health..."

                    curl -fsS \
                        "http://127.0.0.1:${CANDIDATE_PORT}/health"

                    echo

                    echo "Testing root endpoint..."

                    curl -fsS \
                        "http://127.0.0.1:${CANDIDATE_PORT}/"

                    echo

                    echo "Smoke tests passed."
                '''
            }
        }

        stage('Deployment Verification') {
            steps {
                sh '''
                    set -eu

                    echo "Checking candidate container..."

                    docker inspect "${CANDIDATE_CONTAINER}" >/dev/null

                    USER_NAME=$(docker exec "${CANDIDATE_CONTAINER}" whoami)

                    echo "Container user: ${USER_NAME}"

                    if [ "${USER_NAME}" != "node" ]; then
                        echo "Deployment verification failed: container is running as ${USER_NAME}"
                        exit 1
                    fi

                    HEALTH_STATUS=$(docker inspect \
                        --format '{{.State.Health.Status}}' \
                        "${CANDIDATE_CONTAINER}")

                    echo "Container health: ${HEALTH_STATUS}"

                    if [ "${HEALTH_STATUS}" != "healthy" ]; then
                        echo "Deployment verification failed: health=${HEALTH_STATUS}"
                        exit 1
                    fi

                    READONLY_ROOT=$(docker inspect \
                        --format '{{.HostConfig.ReadonlyRootfs}}' \
                        "${CANDIDATE_CONTAINER}")

                    echo "ReadonlyRootfs: ${READONLY_ROOT}"

                    if [ "${READONLY_ROOT}" != "true" ]; then
                        echo "Deployment verification failed: root filesystem is writable."
                        exit 1
                    fi

                    CAP_DROP=$(docker inspect \
                        --format '{{json .HostConfig.CapDrop}}' \
                        "${CANDIDATE_CONTAINER}")

                    echo "CapDrop: ${CAP_DROP}"

                    case "${CAP_DROP}" in
                        *ALL*)
                            echo "All Linux capabilities dropped."
                            ;;
                        *)
                            echo "Deployment verification failed: ALL capabilities were not dropped."
                            exit 1
                            ;;
                    esac

                    echo "Deployment verification passed."
                '''
            }
        }

        stage('Promote Candidate') {
            steps {
                sh '''
                    set -eu

                    echo "Promoting candidate to production..."

                    if docker ps \
                        --filter "name=^/${CONTAINER_NAME}$" \
                        --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then

                        echo "Stopping existing production container..."

                        docker stop "${CONTAINER_NAME}"

                        docker rm "${CONTAINER_NAME}"

                    else

                        echo "No existing production container found."
                    fi

                    echo "Starting new production container..."

                    docker run -d \
                        --name "${CONTAINER_NAME}" \
                        --restart unless-stopped \
                        --read-only \
                        --tmpfs /tmp:rw,noexec,nosuid,size=64m \
                        --cap-drop=ALL \
                        -p "${APP_PORT}:3000" \
                        "${FULL_IMAGE}"

                    echo "Waiting for production health check..."

                    for i in $(seq 1 12); do

                        if curl -fsS \
                            "http://127.0.0.1:${APP_PORT}/health" \
                            > /tmp/secureship-production-health.json; then

                            echo "Production deployment successful."

                            cat /tmp/secureship-production-health.json

                            docker rm -f "${CANDIDATE_CONTAINER}" 2>/dev/null || true

                            exit 0
                        fi

                        echo "Production health attempt ${i}/12 failed."

                        sleep 2
                    done

                    echo "Production deployment failed."

                    docker logs "${CONTAINER_NAME}"

                    exit 1
                '''
            }
        }
    }

    post {

        success {
            echo '========================================='
            echo 'SecureShip deployment completed'
            echo '========================================='

            sh '''
                docker ps --filter "name=secureship"
            '''
        }

        failure {
            echo '========================================='
            echo 'SecureShip pipeline FAILED'
            echo '========================================='

            sh '''
                docker ps -a --filter "name=secureship"
            '''

            sh '''
                docker logs "${CANDIDATE_CONTAINER}" 2>/dev/null || true
            '''
        }

        always {
            sh '''
                docker rm -f secureship-security-test 2>/dev/null || true
                docker rm -f secureship-candidate 2>/dev/null || true

                docker image prune -f \
                    --filter "until=168h" || true
            '''

            archiveArtifacts(
                artifacts: 'evidence/*.txt,evidence/*.json',
                allowEmptyArchive: true
            )

            cleanWs()
        }
    }
}