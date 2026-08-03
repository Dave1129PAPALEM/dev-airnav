pipeline {
    agent any

    environment {
        // [MODIFICATION 1: Registry IP Update]
        // Original: REGISTRY = 'localhost:5050'
        // Changed to: REGISTRY = '192.168.10.23:5000'
        // Reason: 'localhost' inside Jenkins points to the Jenkins container/server itself, 
        // not the Docker registry. It was updated to the actual network IP of your registry.
        REGISTRY = '192.168.10.23:5000'
        
        // [MODIFICATION 2: Added APP_NAME]
        // Reason: Extracted the application name into a variable to make the image tag 
        // string cleaner and easier to maintain.
        APP_NAME = 'new-app'

        // [MODIFICATION 3: Removed Syntax Error]
        // Original: IMAGE = "${REGISTRY}/new-app:${BUILD_NUMBER}",
        // Reason: Removed this line entirely from the environment block. The trailing comma 
        // caused a fatal Groovy syntax error. Additionally, we moved the IMAGE creation 
        // down to the 'script' block so it can dynamically evaluate the Git commit hash.
    }

    stages {
        stage('Checkout') {
            steps {
                // No changes made. This continues to pull the correct branch via the SCM plugin.
                checkout scm
            }
        }

        // [MODIFICATION 4: GitOps Branch Routing]
        // Original: stage('Build')
        // Changed to: stage('Build & Push (Staging)')
        // Reason: Added the `when { branch 'staging' }` directive. In a Multibranch Pipeline, 
        // this ensures that pushing to the staging branch executes this specific block of logic.
        stage('Build & Push (Staging)') {
            when {
                branch 'staging'
            }
            steps {
                // [MODIFICATION 5: Versioning Strategy]
                // Original: Relied on ${BUILD_NUMBER}
                // Changed to: Git Commit Hash versioning
                // Reason: In Kubernetes and GitOps, using the exact Git commit hash (e.g., staging-a1b2c3d) 
                // is the industry standard. It guarantees you can trace a deployed pod back to the exact code commit.
                script {
                    env.GIT_HASH = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    env.IMAGE = "${REGISTRY}/${APP_NAME}:staging-${env.GIT_HASH}"
                }
                
                // [MODIFICATION 6: Fixed Docker Build Context]
                // Original: sh 'docker build -t new-app:build-${BUILD_NUMBER} ,'
                // Changed to: sh "docker build -t ${env.IMAGE} ."
                // Reason: 
                // 1. The original command used a comma (,) instead of a period (.). Docker requires a period 
                //    to define the current directory as the build context.
                // 2. Switched from single quotes ('') to double quotes ("") so Groovy can interpolate the variables.
                sh "docker build -t ${env.IMAGE} ."
                
                // [MODIFICATION 7: Consolidated Push Stage]
                // Original: Had a separate stage('Push') that manually re-tagged the image.
                // Changed to: Push directly within the build stage using the pre-formatted ${env.IMAGE} variable.
                // Reason: Reduces pipeline overhead and eliminates the need for redundant tagging commands.
                sh "docker push ${env.IMAGE}"
            }
        }

        // [MODIFICATION 8: GitOps Handoff Stage]
        // Reason: Added this entirely new stage. Because you are using ArgoCD, Jenkins must not 
        // deploy directly to the cluster. This stage acts as a placeholder where your shell script 
        // will clone Hans's 'ops-airnav' repo and update the YAML deployment files.
        stage('Update Manifests (Staging)') {
            when {
                branch 'staging'
            }
            steps {
                echo "Successfully built and pushed: ${env.IMAGE}"
                echo "Ready to trigger GitOps update..."
            }
        }

        // ==========================================
        // PRODUCTION PIPELINE
        // ==========================================
        stage('Build & Push (Production)') {
            when {
                branch 'production' // This tells Jenkins to ONLY run this if the branch is production
            }
            steps {
                script {
                    // Notice we changed the tag from 'staging-' to 'prod-'
                    env.GIT_HASH = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    env.IMAGE = "${REGISTRY}/${APP_NAME}:prod-${env.GIT_HASH}"
                }
                
                sh "docker build -t ${env.IMAGE} ."
                sh "docker push ${env.IMAGE}"
            }
        }
    }
}