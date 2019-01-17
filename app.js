var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
// Promise may make domain unnecessary
// Probably callbacks should be resplaced
// with promises
var Promise = require('promise'); 

// it's hard to keep the routes completely
// isolated. It may be silly but I prefer
// to require a package as few times as possible.

// I am stuck requiring the express package
// multiple times

// I prefer to give the route packages more
// descriptive names
var webStart = require('./routes/index');
var userManage = require('./routes/users');

// sessions are usually necessary for servers
// that have multiple users
var session = require('express-session');

// userManage is more likely to need data
// & methods from webstart	
webStart.userManage = userManage;
userManage.webStart = webStart;

var app = express(); // this is the basic express app routing engine

// just like to know start time -- I always add this line for logging

var dateString = new Date().toUTCString();
console.log('Starting server at ' + dateString); // print out start time to console
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
// I still don't understand how to use favicon app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret: 'hyper-cms-user-manager', cookie: {maxAge: 36000000}}));

// set up routes
app.use('/', webStart);/* deal with logging into database. */
app.use('/usermanagement', userManage);/* deal with individual users. */

/// catch 404 and forwarding to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err // I guess this line forces the stack trace
        });
    });
}

// production error handler
// no stack traces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
