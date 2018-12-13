var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

var mysql      = require('mysql');
var connectinfo =  {
    host     : 'INVALID',
    user     : 'INVALID',
    password : 'INVALID',
    database : '527700_cms_bostonscientific_db'
} ;

routes.loggedin = false; // no modifications to user accounts without successful login
users.loggedin = false;
routes.users = users; // so that we can get beyond db login screen
users.routes = routes; // so that we can get to db login screen if not logged in

// just like to know start time
var dateString = new Date().toUTCString();
console.log('Starting server at ' + dateString); // print out start time to console

// set up so that we can talk to the database either from environment or by putting up
// login screen.
if(process.env.CMSDBHOST) {
    connectinfo.host = process.env.CMSDBHOST;
}
if(process.env.CMSDBUSER) {
    connectinfo.user = process.env.CMSDBUSER;
}
if(process.env.CMSDBPASSWORD) {
    connectinfo.password = process.env.CMSDBPASSWORD;
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

if(loggedin == true)
    app.use('/', users);
app.use('/', routes);
app.use('/users', users);
app.post('/hostname', routes);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
