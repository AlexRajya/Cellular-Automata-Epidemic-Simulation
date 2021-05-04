// Libraries
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const http = require('http');
const ip = require('ip');

// constants
const port = process.env.PORT || 8080;
const app = express();
const server = http.createServer(app);

app.use(express.static(`${__dirname}/public`));
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//Save simulation data sent from client
app.post('/save', (req, res) => {
  try {
    fs.writeFileSync('results.txt', JSON.stringify(req.body));
    res.sendStatus(200);// OK
    console.log('results saved');
  } catch (err) {
    res.sendStatus(400);// bad request
  }
});

// start the server
server.listen(port, () => {
  console.log('Server started on:', `http://${ip.address()}:${port}`, 'or: http://localhost:8080/');
});
