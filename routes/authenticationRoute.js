const router = require('express').Router();
const activeDirectory = require('activedirectory2');
const fs              = require('fs');

const serverSearchConfig = {
    url: process.env.DC,
    baseDN: 'OU=Standard User Accounts,OU=Lab Users,DC=justinlab,DC=ca',
    port: 636,
    tlsOptions:{
        ca: [fs.readFileSync('groot.crt')]
    },
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD,
};

const ad = new activeDirectory(serverSearchConfig);

router.post('/login-api', function(req, resp) {
    let username = req.body.username.toLowerCase();
    let password = req.body.password;

    let userEmail;
    let userPhoneNum;
    authentication();

    function authentication() {
        ad.authenticate(username, password, function(err, auth) {
            if(auth === true){

            }
            else {
                return resp.render('index',  {});
            }
        });
    } 
});

module.exports = router;