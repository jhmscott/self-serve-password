require('dotenv').config();

const express         = require('express');
const bodyParser      = require('body-parser');
const sql             = require('mssql');
const cookieSession   = require('cookie-session');
const activeDirectory = require('activedirectory2');
const ping            = require('ping');
const fs              = require('fs');

// server configurations
var app               = express();
var http              = require('http');
const server          = http.createServer(app); // integrating express with server
const port            = 80;



app.set('views', [__dirname + '/templates', __dirname + '/templates/temp']);
app.set('view engine', 'pug');
app.disable('view cache');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(cookieSession({
    secret: process.env.APP_SECRET,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

app.use('/images', express.static('assets/images'));
app.use('/css', express.static('assets/css'));
app.use('/js', express.static('assets/js'));
app.use('/fonts', express.static('assets/fonts'));
app.use('/bootstrap', express.static('assets/bootstrap'));

app.get('/', function(req, resp) {
  const serverSearchConfig = {
    url: process.env.DC,
    baseDN: 'ou=Servers,dc=justinlab,dc=ca',
    port: 636,
    tlsOptions:{
        ca: [fs.readFileSync('groot.crt')]
    },
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD,
  };
  const serverSearch = new activeDirectory(serverSearchConfig);

  let servers = [];

  console.log('getting Servers');
    serverSearch.find('(objectclass=*)', function(err, results) {
    if ((err) || (! results)) {
      console.log('ERROR: ' + JSON.stringify(err));
      resp.render('index',{serverList: servers, status: 'success'});
    }

    let numHosts = 0;

    results.other.forEach(function(other) {
      if(other.cn !== undefined) {
        numHosts++;
        servers.push({
          name: other.cn,
          description: other.description,
        });
      }
    });
    
    resp.render('index',{serverList: servers, status: 'success'});
  });
  
});

server.listen(port, function(err) {
    if (err) {
        console.log(err);
    }
    console.log(`App running on http://localhost:${port}`);
});
