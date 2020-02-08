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
    


    (function authentication() {

        let username = req.body.username.toLowerCase();
        let password = req.body.password;

        let userEmail;
        let userPhoneNum;
        ad.authenticate(username + '@justinlab.ca', password, function(err, auth) {
            if(auth === true){
                return resp.render('index',  {login: 'success'});
            }
            else {
                return resp.render('index',  {login: 'failed'});
            }
        });
    })(); 
});

module.exports = router;