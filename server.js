
// Libraries
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const ip = require('ip');

// constants
const port = process.env.PORT || 8080;
const app = express();
const server = http.createServer(app);

// server functions

app.use(express.static(`${__dirname}/public`));
app.use(express.static(__dirname));

// start the server
server.listen(port, () => {
  console.log('Server started on:', `http://${ip.address()}:${port}`, 'or: http://localhost:8080/');
});
