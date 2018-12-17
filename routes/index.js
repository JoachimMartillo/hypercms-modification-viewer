var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/', function (req, res, next) {
    res.render('index', {title: 'MySQL Login Page'}, function (err, html) {
        if (err != null) {
            console.log(err);
        } else {
            // I am puzzeled by html formal parameter
            console.log(html);
            res.send(html);
        }
    });
});

module.exports = router;
