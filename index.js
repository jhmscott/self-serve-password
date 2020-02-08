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
const port            = process.env.PORT;



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

app.use('/images', express.static(__dirname + '/assets/images'));
app.use('/css', express.static(__dirname + '/assets/css'));
app.use('/js', express.static(__dirname + '/assets/js'));
app.use('/fonts', express.static(__dirname + '/assets/fonts'));
app.use('/bootstrap', express.static(__dirname + '/assets/bootstrap'));

const authenticationRoutes = require('./routes/authenticationRoute');
app.use(authenticationRoutes);

app.get('/', function(req, resp) {
    resp.render('index', {login: null});
});

app.get('/get-servers', function(req, resp) {
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
      resp.send({serverList: servers, status: 'failed'});
    }
    else{
      results.other.forEach(function(other) {
        if(other.cn !== undefined) {
          numHosts++;
          servers.push({
            name: other.cn,
            description: other.description,
          });
        }
      });
      
      resp.send({serverList: servers, status: 'success'});
    }
  });
});

server.listen(port, function(err) {
    if (err) {
        console.log(err);
    }
    console.log(`App running on http://localhost:${port}`);
});
