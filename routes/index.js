var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/', function (req, res, next) {
    res.render('index', {title: 'MySQL Login Page'}, function (err, html) {
        if (err != null) {
            console.log(err);
        } else {
            console.log(html);
            res.send(html);
        }
    });
});

router.post('', function(req, res, next))
{

}

module.exports = router;
