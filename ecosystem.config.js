module.exports = {
  apps: [
    {
      name: "backup",
      script: "dist/index.js",
      env_production: {
        NODE_ENV: "production",
      },
      env_test: {
        NODE_ENV: "test",
      },
    },
  ],

  // Deployment Configuration
  deploy: {
    test: {
      user: "root",
      host: "94.250.202.249",
      ref: "origin/main",
      repo: "git@github.com:aslamjon/backup-monodb.git",
      path: "/root/backup",
      "pre-setup": "pwd",
      "pre-deploy-local": "echo 'This is a local deployment'",
      // "post-deploy": "cp ../.env ./ && npm install && pm2 startOrRestart ecosystem.config.js --env production",
      "post-deploy": "npm install && npm run build && pm2 startOrRestart ecosystem.config.js --env test",
    },
    production: {
      user: "root",
      host: "81.17.102.141",
      ref: "origin/main",
      repo: "git@github.com:aslamjon/backup-monodb.git",
      path: "/root/backup",
      "pre-setup": "pwd",
      "pre-deploy-local": "echo 'This is a local deployment'",
      "post-deploy": "npm install && npm run build && pm2 startOrRestart ecosystem.config.js --env production",
    },
  },
};
