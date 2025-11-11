module.exports = {
  apps : [{
    name: 'telegram-upload-file',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      HOST: '0.0.0.0',
      PORT: 8405
    },
    env_production: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 8405
    }
  }]
};
