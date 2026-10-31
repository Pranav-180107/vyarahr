module.exports = {
  apps: [
    {
      name: 'vyarahr-api',
      script: './backend/server.mjs',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 54321
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 54321
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true
    }
  ]
};
