pipeline {
    agent any

    environment {
        // ==========================================
        // CONFIGURATION VARIABLES
        // ==========================================
        // The network IP of your registry
        REGISTRY = '192.168.10.23:5000'
        
        // The application name to keep the image tag string cleaner
        APP_NAME = 'new-app'
    }

    stages {
        stage('Checkout Source') {
            steps {
                // Pulls the correct branch code via the SCM plugin
                checkout scm
            }
        }

        stage('Test Application') {
            steps {
                echo "Running unit tests via Jest inside Docker"
                sh """
                    # Run tests inside a Node container because Jenkins might not have npm installed locally
                    docker run --rm \\
                        -u "\$(id -u):\$(id -g)" \\
                        -v "\$(pwd):/app" \\
                        -w /app \\
                        -e npm_config_cache=/tmp/.npm \\
                        node:18 sh -c 'npm install && npm test'
                """
            }
        }

        stage('Determine Image Version') {
            steps {
                script {
                    if (env.BRANCH_NAME == 'production') {
                        // ==========================================
                        // PRODUCTION: Semantic Versioning
                        // ==========================================
                        // Read the application version directly from package.json (e.g., v1.0.0)
                        def packageVersion = sh(script: "grep '\"version\":' package.json | head -1 | sed 's/.*\"version\": *\"\\([^\"]*\\)\".*/\\1/'", returnStdout: true).trim()
                        env.SEMVER_TAG = "v${packageVersion}"
                        
                        // Security Guard Check: Ensure it actually matches semantic format
                        if (!(env.SEMVER_TAG ==~ /^v[0-9]+\.[0-9]+\.[0-9]+$/)) {
                            error("VERSIONING ERROR: Production build failed. package.json version '${env.SEMVER_TAG}' does not match semantic versioning format (e.g., v1.0.0).")
                        }
                        
                        env.IMAGE = "${env.REGISTRY}/${env.APP_NAME}:${env.SEMVER_TAG}"
                        echo "Production Image Tag set to Semantic Version: ${env.IMAGE}"
                        
                    } else {
                        // ==========================================
                        // STAGING / DEV: Hash / Build ID Versioning
                        // ==========================================
                        // Use the branch name and Jenkins Build ID to uniquely identify the image
                        env.IMAGE = "${env.REGISTRY}/${env.APP_NAME}:${env.BRANCH_NAME}-${env.BUILD_ID}"
                        echo "Staging/Dev Image Tag set to Hash Version: ${env.IMAGE}"
                    }
                }
            }
        }

        stage('Build & Push Docker Image') {
            when {
                anyOf {
                    branch 'staging'
                    branch 'production'
                }
            }
            steps {
                // ==========================================
                // BUILD & PUSH
                // ==========================================
                // Builds the Docker image and pushes it directly to our local registry
                sh """
                    echo "Building Docker image: ${env.IMAGE}"
                    docker build -t ${env.IMAGE} .
                    
                    echo "Pushing image to local registry..."
                    docker push ${env.IMAGE}
                """
            }
        }

        stage('Update GitOps Manifests') {
            when {
                anyOf {
                    branch 'staging'
                    branch 'production'
                }
            }
            steps {
                // ==========================================
                // GITOPS HANDOFF
                // ==========================================
                script {
                        // We use existing GitHub credentials to authorize the clone and push.
                        withCredentials([usernamePassword(credentialsId: 'github-credentials', passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USERNAME')]) {
                            sh """
                                echo "Starting GitOps update for branch: ${env.BRANCH_NAME}"
                                
                                # 1. Clean up workspace to prevent conflicts from previous runs
                                rm -rf ops-airnav
                                
                                # 2. Clone the ops repository matching the current environment branch
                                # NOTE: Using backslashes before variables (\$) ensures the shell handles the password securely
                                git clone -b ${env.BRANCH_NAME} https://\${GIT_USERNAME}:\${GIT_PASSWORD}@github.com/sylthecatto/ops-airnav.git
                                cd ops-airnav
                                
                                # 3. Configure Git identity for the Jenkins bot
                                git config user.email "jenkins-bot@airnav.com"
                                git config user.name "Jenkins Automation"
                                
                                # 4. Update the image tag in the Kubernetes manifest using 'sed'
                                sed -i 's|image: 192.168.10.23:5000/new-app:.*|image: ${env.IMAGE}|g' k8s/deployment.yaml
                                
                                # 5. Commit and push the changes back to GitHub
                                git add .
                                git commit -m "ci: update ${env.BRANCH_NAME} image tag to ${env.IMAGE}" || echo "No changes to commit"
                                git push origin ${env.BRANCH_NAME}
                                
                                echo "Successfully pushed new manifest to ops-airnav! ArgoCD should sync shortly."
                            """
                        }
                }
            }
        }
    }
}