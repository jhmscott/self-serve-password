require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const cookieSession = require('cookie-session');

// server configurations
var app = express();
var http = require('http');
const server = http.createServer(app); // integrating express with server
const port = 80;

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

// Route Modules
const authenticationRoutes = require('./routes/authenticationRoute');
app.use(authenticationRoutes);

app.get('/', function(req, resp) {
    resp.render('index');
});