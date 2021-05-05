node {
    stage("Pull") {
        sh 'ssh host "cd services.js/bbdash-api && git pull"'
    }
    
    stage("Build") {
        sh 'ssh host "cd services.js/bbdash-api && docker-compose build"'
    }
    
    stage("Restart") {
        sh 'ssh host "cd services.js/bbdash-api && docker-compose restart"'
    }
}