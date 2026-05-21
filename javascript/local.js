require('dns').setServers(['8.8.8.8', '1.1.1.1']);

const { startServer } = require('./server');

startServer();
