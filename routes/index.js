var express = require('express');
var router = express.Router();
var uniqueid = require('uniqueid');
var first = uniqueid('Admin')

/* GET home page. */

router.get('/', function (req, res, next) {
    var sessData = req.session;
    sessData.sessionID = first();
    sessData.connectInfoSession = new router.sessConnectInfoBuilder(router.connectinfoENV.host,
        router.connectinfoENV.user,
        router.connectinfoENV.password,
        router.connectinfoENV.database);
    res.render('index', {
        title: "MySQL Session: " + sessData.sessionID,
        db_server_ph: sessData.connectInfoSession.host,
        db_login_ph: sessData.connectInfoSession.user,
        db_password_ph: "*****",
        db_database_ph: sessData.connectInfoSession.database
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
