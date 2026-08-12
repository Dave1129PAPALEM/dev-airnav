pipeline {
    agent any

    environment {
        // ==========================================
        // CONFIGURATION VARIABLES
        // ==========================================
        // The network IP of your registry, loaded securely from Jenkins credentials
        REGISTRY = credentials('registry-url')
        
        // The application name to keep the image tag string cleaner
        APP_NAME = 'new-app'
        
        // Fetch Git Short Hash
        GIT_SHORT_SHA = "${sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()}"
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
                echo "Running unit tests via Jest"
                sh '''
                    npm install
                    npm test
                '''
            }
        }

        stage('Determine Image Version') {
            steps {
                script {
                    if (env.TAG_NAME) {
                        // ==========================================
                        // PRODUCTION: Semantic Versioning (Git Tags)
                        // ==========================================
                        env.SEMVER_TAG = "${env.TAG_NAME}"
                        
                        // Security Guard Check: Ensure it actually matches semantic format
                        if (!(env.SEMVER_TAG ==~ /^v[0-9]+\.[0-9]+\.[0-9]+$/)) {
                            error("VERSIONING ERROR: Production build failed. Tag '${env.SEMVER_TAG}' does not match semantic versioning format (e.g., v1.0.0).")
                        }
                        
                        env.IMAGE_TAG = "${env.SEMVER_TAG}"
                        env.IMAGE = "${env.REGISTRY}/${env.APP_NAME}:${env.IMAGE_TAG}"
                        echo "Production Image Tag set to Semantic Version: ${env.IMAGE}"
                        env.TARGET_GITOPS_BRANCH = "production"
                        
                    } else {
                        // ==========================================
                        // STAGING / DEV: Hash Versioning
                        // ==========================================
                        // Use the branch name and Git Short Hash to uniquely identify the image
                        env.IMAGE_TAG = "${env.BRANCH_NAME}-${env.GIT_SHORT_SHA}"
                        env.IMAGE = "${env.REGISTRY}/${env.APP_NAME}:${env.IMAGE_TAG}"
                        echo "Staging/Dev Image Tag set to Hash Version: ${env.IMAGE}"
                        env.TARGET_GITOPS_BRANCH = "${env.BRANCH_NAME}"
                    }
                }
            }
        }

        stage('Build & Push Docker Image') {
            when {
                anyOf {
                    branch 'staging'
                    buildingTag()
                }
            }
            steps {
                // ==========================================
                // BUILD & PUSH
                // ==========================================
                // Builds the Docker image and pushes it directly to our local registry
                sh """
                    echo "Building Docker image: ${env.IMAGE}"
                    docker build --build-arg APP_VERSION=${env.IMAGE_TAG} -t ${env.IMAGE} .
                    
                    echo "Pushing image to local registry..."
                    docker push ${env.IMAGE}
                """
            }
        }

        stage('Update GitOps Manifests') {
            when {
                anyOf {
                    branch 'staging'
                    buildingTag()
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
                                echo "Starting GitOps update for target: ${env.TARGET_GITOPS_BRANCH}"
                                
                                # 1. Clean up workspace to prevent conflicts from previous runs
                                rm -rf ops-airnav
                                
                                # 2. Clone the ops repository matching the current environment branch
                                # NOTE: Using backslashes before variables (\$) ensures the shell handles the password securely
                                git clone -b ${env.TARGET_GITOPS_BRANCH} https://\${GIT_USERNAME}:\${GIT_PASSWORD}@github.com/sylthecatto/ops-airnav.git
                                cd ops-airnav
                                
                                # 3. Configure Git identity for the Jenkins bot
                                git config user.email "jenkins-bot@airnav.com"
                                git config user.name "Jenkins Automation"
                                
                                # 4. Update the image tag in the Kubernetes manifest using 'sed'
                                sed -i 's|image: 192.168.10.23:5000/new-app:.*|image: ${env.IMAGE}|g' k8s/deployment.yaml
                                
                                # 5. Commit and push the changes back to GitHub
                                git add .
                                git commit -m "ci: update ${env.TARGET_GITOPS_BRANCH} image tag to ${env.IMAGE}" || echo "No changes to commit"
                                git push origin ${env.TARGET_GITOPS_BRANCH}
                                
                                echo "Successfully pushed new manifest to ops-airnav! ArgoCD should sync shortly."
                            """
                        }
                }
            }
        }
    }
}