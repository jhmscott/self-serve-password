const router            = require('express').Router();
const activeDirectory   = require('activedirectory2');
const fs                = require('fs');
const pwChange          = require('ad');
const https             = require('https');
const sha1              = require('sha1');

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
    


    (function() {

        let username = req.body.username.toLowerCase();
        let password = req.body.password;

        ad.findUser(username, function(err, user){
            if(!err){
                ad.authenticate(user.userPrincipalName, password, function(err, auth) {
                    if(auth){
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

router.post('/logout', function(req, resp) {
    req.session.auth=false;
    req.session.user=null;
    resp.redirect('/');
});

router.post('/change-pass', function(req, resp) {
    (function() {
        const pw = new pwChange({
            url: process.env.DC,
            user: process.env.AD_USERNAME,
            pass: process.env.AD_PASSWORD
        });
        let username, oldPass, newPass, confirmPass;
        username    = req.session.user.userPrincipalName;
        oldPass     = req.body.oldPass;
        newPass     = req.body.newPass;
        confirmPass = req.body.confirmPass;

        ad.authenticate(username, oldPass, async function(err, auth) {
            if(auth) {
                if(newPass === confirmPass) {
                    isPasswordSafe(newPass, function(isSafe) {
                        if(isSafe) {
                            pw.user(username).password(newPass).then(function() {
                                resp.send({status: 'success'});
                            }).catch(function(err) {
                                console.log(err);
                                resp.send({status: 'fail', message: 'Does not meet complexity requirements'});
                            });
                        }
                        else {
                            resp.send({status: 'fail', message: 'Leaked Password'});
                        }
                    });
                    
                    
                }
                else {
                    resp.send({status: 'fail', message: "Password Don't Match"});
                }
            }
            else {
                resp.send({status: 'fail', message: 'Old Password Incorrect'});
            }
        });

    })();
});

function isPasswordSafe(password, callback) {
    passwordHash = sha1(password);
    
    https.get('https://api.pwnedpasswords.com/range/' + passwordHash.substring(0,5), function(resp){
        let data = '';
        let returnedHashes;
        let i = 0;

        resp.on('data', function(chunk) {
            data += chunk;
        });

        resp.on('end', function() {
            returnedHashes = data.split('\r\n');
            returnedHashes.forEach(function(returnedHash) {
                if(returnedHash.split(':')[0].toLowerCase() === passwordHash.substring(5,40)) {
                    console.log('Found Password');
                    callback(false);
                    return;
                }
            });
            callback(true);
        });
    });
}

module.exports = router;