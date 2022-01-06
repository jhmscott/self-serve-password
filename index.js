/**
 * Copyright (c) 2020
 *
 * Node.JS Backend for non authentication related
 * routes.
 *
 * @summary Non auth related routes
 * @author Justin Scott <justinhmscott@gmail.com>
 *
 * Created at     : ‎2020-01-08 ‏‎13:02:25
 * Last modified  : 2020-02-14 15:32:47
 */

require('dotenv').config();

//module imports
const express         = require('express');
const bodyParser      = require('body-parser');
const cookieSession   = require('cookie-session');
const activeDirectory = require('activedirectory2');
const ping            = require('ping');
const fs              = require('fs');
const buffer          = require('buffer/').Buffer;
const dns             = require('dns');

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

//setup static mappings for assets
app.use('/images', express.static(__dirname + '/assets/images'));
app.use('/css', express.static(__dirname + '/assets/css'));
app.use('/js', express.static(__dirname + '/assets/js'));
app.use('/fonts', express.static(__dirname + '/assets/fonts'));
app.use('/bootstrap', express.static(__dirname + '/assets/bootstrap'));

const authenticationRoutes = require('./routes/authenticationRoute');
app.use(authenticationRoutes);

function reverseLookup(ip, callback) {
	dns.reverse(ip, function(err,domains){
		if(!err && domains)
    {
      callback (domains[0]);
    }
    else
    {
      callback ("");
    }
	});
}

function isDomainComputer (ip, callback)
{
  const serverSearchConfig = {
    url: process.env.DC,
    baseDN: process.env.COMPUTER_OU,
    port: 636,
    tlsOptions: {
        ca: [fs.readFileSync(process.env.CA_CRT)]
    },
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD,
  };
  const computerSearch = new activeDirectory(serverSearchConfig);

  reverseLookup (ip, function(fqdn) {
    const computerName = fqdn.split ('.')[0].toUpperCase();

    computerSearch.find('(objectclass=*)', async function(err, results) {
      let isDomainJoined = false;
      if ((err) || (! results)) {
        console.log('ERROR: ' + JSON.stringify(err));
      }
      else
      {
        results.other.forEach(function(other) {
          //if the common name is defined, add it to the array
          if(other.cn === computerName) {
            isDomainJoined = true;
          }
        });
      }
      callback (isDomainJoined);
    });
  });
}

//main page
app.get('/', function(req, resp) {
  //if user is logged in display option to change password
  if(req.session.auth) {
    resp.render('index',  {login: 'success', user:  req.session.user})
  }
  else {
    isDomainComputer (req.headers['x-forwarded-for'] || req.socket.remoteAddress, function (isDomainJoined) {
      if (isDomainJoined)
      {
        resp.redirect ('/kerberos');
      }
      else
      {
        resp.render('index', {login: null});
      }
    });
  }
});

//get profile picture from active directory
app.get('/profile', function(req, resp){
  const photoSearchConfig = {
    url: process.env.DC,
    baseDN: process.env.USER_OU,
    port: 636,
    tlsOptions: {
        ca: [fs.readFileSync(process.env.CA_CRT)]
    },
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD,
    attributes: {
        user: [
            'thumbnailPhoto'
        ]
    }
  };

  const ad = new activeDirectory(photoSearchConfig);

  //check if user is logged in firsy
  if(req.session.auth){
    //search for user by UPN stored in cookie
    ad.findUser(req.session.user.userPrincipalName, function(err, user) {
      if(!err) {
        //convert string from AD to a format that can be displayed in HTML
        resp.send({status: 'success', photo: user.thumbnailPhoto ? ('data:image/jpeg;base64,' + buffer.from(user.thumbnailPhoto).toString('base64')) : '/images/default.jpg'});
      }
      else {
        resp.send({status: 'fail'});
      }
    });
  }
  else {
    resp.send({status: 'fail'});
  }
});

//Get a list of the servers in the server OU of AD
app.get('/get-servers', function(req, resp) {
  const serverSearchConfig = {
    url: process.env.DC,
    baseDN: process.env.SERVER_OU,
    port: 636,
    tlsOptions: {
        ca: [fs.readFileSync(process.env.CA_CRT)]
    },
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD,
  };
  const serverSearch = new activeDirectory(serverSearchConfig);

  let servers = [];

  console.log('getting Servers');

  //search for all objects in the OU
  serverSearch.find('(objectclass=*)', async function(err, results) {
    if ((err) || (! results)) {
      console.log('ERROR: ' + JSON.stringify(err));
      resp.send({serverList: servers, status: 'failed'});
    }
    else{
      //Iterate through the objects
      results.other.forEach(function(other) {
        //if the common name is defined, add it to the array
        if(other.cn !== undefined) {
          servers.push({
            name: other.cn,
            description: other.description,
            isAlive: null
          });
        }
      });

      //sort server alphabetically
      servers.sort(function(serverA,serverB){
        if(serverA.name > serverB.name) {
          return 1;
        }
        else {
          return -1;
        }
      });

      //ping each server to see if it's online
      for(let i = 0; i < servers.length; i++) {
        //wait for the response before moving to the next
        servers[i].isAlive = (await ping.promise.probe(servers[i].name)).alive;
        console.log(servers[i]);
      }

      //return the list of servers
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
