module.exports = {
  apps: [
    {
      name: 'gait-vision-forpt',
      script: 'python3',
      args: '-m http.server 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}
