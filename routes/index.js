var express = require('express');
var router = express.Router();
var uniqueid = require('uniqueid');
var first = uniqueid('Admin')

/* GET home page. */

router.get('/', function (req, res, next) {
    req.session.sessionID = first();
    req.session.connectInfoSession = new router.sessConnectInfoBuilder(router.connectinfoENV.host,
        router.connectinfoENV.user,
        router.connectinfoENV.password,
        router.connectinfoENV.database);
    res.render('index', {
        title: "MySQL Session: " + req.session.sessionID,
        db_server_ph: req.session.connectInfoSession.host,
        db_login_ph: req.session.connectInfoSession.user,
        db_password_ph: "*****",
        db_database_ph: req.session.connectInfoSession.database
    }, function (err, html) {
        if (err != null) {
            console.log(err);
        } else {
            // html value comes from rendering the Jade template.
            console.log(html);
            res.send(html);
        }
    });
});

module.exports = router;
