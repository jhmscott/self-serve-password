const router            = require('express').Router();
const activeDirectory   = require('activedirectory2');
const fs                = require('fs');

const userSearchConfig = {
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
            'displayName', 'userPrincipalName',
            'mail', 'pwdLastSet', 'telephoneNumber',
            'title'
        ]
    }
};

const ad = new activeDirectory(userSearchConfig);

router.post('/login-api', function(req, resp) {
    


    (function authentication() {

        let username = req.body.username.toLowerCase();
        let password = req.body.password;

        ad.findUser(username, function(err, user){
            if(!err){
                ad.authenticate(user.userPrincipalName, password, function(err, auth) {
                    if(auth === true){
                        req.session.auth = true;
                        req.session.user = user;
                        return resp.redirect('/');
                    }
                    else {
                        return resp.render('index',  {login: 'failed'});
                    }
                });
            }
            else {
                return resp.render('index',  {login: 'failed'});
            }
        });
    })(); 
});

router.post('/logout', function(req, resp){
    req.session.auth=false;
    req.session.user=null;
    resp.redirect('/');
});

module.exports = router;