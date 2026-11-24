pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend: Install & Test') {
            steps {
                dir('backend') {
                    sh 'cp -n .env.example .env || true'
                    sh 'composer install --no-interaction --prefer-dist --no-scripts'
                    sh 'php artisan key:generate --ansi'
                    sh 'php artisan package:discover --ansi'
                    sh 'php artisan test'
                }
            }
        }

        stage('Frontend: Install & Build') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: 'frontend/dist/**', allowEmptyArchive: false
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
