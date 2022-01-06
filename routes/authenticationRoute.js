/**
 * Copyright (c) 2020
 *
 * Node.JS Backend for authentication related
 * routes. This inlcudes login, logout and
 * password change
 *
 * @summary Auth related routes
 * @author Justin Scott <justinhmscott@gmail.com>
 *
 * Created at     : ‎2020-01-08 ‏‎15:13:48
 * Last modified  : 2020-02-14 15:37:37
 */


const router            = require('express').Router();
const activeDirectory   = require('activedirectory2');
const fs                = require('fs');
const pwChange          = require('ad');
const https             = require('https');
const sha1              = require('sha1');
const kerberos          = require('kerberos');



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

//login route
router.post('/login-api', function(req, resp) {
    (function() {
        let username, password;
        username = req.body.username.toLowerCase();
        password = req.body.password;

        //seach for user based on sAMAcountName
        ad.findUser(username, function(err, user){
            //if a user was found
            if(!err) {
                //try to authenticate with the provided password
                ad.authenticate(user.userPrincipalName, password, function(err, auth) {
                    if(auth){
                        //set the cookie data and redirect to the main page
                        req.session.auth = true;
                        req.session.user = user;
                        return resp.redirect('/');
                    }
                    //otherwise render the failed login page
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

//logout route
router.post('/logout', function(req, resp) {
    //clear coookie data and redirect back to the main page
    req.session.auth=false;
    req.session.user=null;
    resp.redirect('/');
});

router.post('/change-pass', function(req, resp) {
    (function() {
        //use different library for changing passwords
        const pw = new pwChange({
            url: process.env.DC,
            user: process.env.AD_USERNAME,
            pass: process.env.AD_PASSWORD
        });

        let username, oldPass, newPass, confirmPass;
        username    = req.session.user.userPrincipalName;   //sAMAcountName
        oldPass     = req.body.oldPass;                     //original password
        newPass     = req.body.newPass;                     //new password
        confirmPass = req.body.confirmPass;                 //new password re-entered

        //authenitcate with old password to make sure it's correct
        ad.authenticate(username, oldPass, async function(err, auth) {
            if(auth) {
                //check if the two new password are the same
                if(newPass === confirmPass) {
                    //check api  to see if the password has been leaked
                    isPasswordSafe(sha1(newPass), function(isSafe) {
                        //if the password was leaked, notify the user and do nto allow password change
                        if(isSafe) {
                            pw.user(username).password(newPass).then(function() {
                                resp.send({status: 'success'});
                            }).catch(function(err) {
                                //if the password change faisl, it's likely it doesn't meet domain requirements
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

router.get ('/kerberos', function (req, res) {
    const auth = req.get('authorization');
    if (!auth) {
        res.status(401).set('WWW-Authenticate', 'Negotiate').send();
    }
    else if (auth.lastIndexOf('Negotiate') !== 0) {
        res.status (400, `Malformed authentication token ${auth}`).send ();
    }
    else
    {
        kerberos.initializeServer (`HTTP@${process.env.DOMAIN}`, function (err, server) {
            if (err)
            {
                res.status (503).send ();
            }
            else
            {
                server.step (auth.substring('Negotiate '.length), function (err, resp)
                {
                    if (err)
                    {
                        res.status(401).set('WWW-Authenticate', 'Negotiate').send();
                    }
                    else
                    {
                        server
                        ad.findUser(server.username, function(err, user)
                        {
                            if (err)
                            {
                                res.status (503).send ();
                            }
                            else
                            {
                                req.session.auth = true;
                                req.session.user = user;
                                return resp.redirect('/');
                            }
                        });
                    }
                });
            }
        });

    }

});

//Uses the "Have I been Pwned" API to check if the password has been leaked online
//https://haveibeenpwned.com/API/v2
function isPasswordSafe(passwordHash, callback) {
    //send the first 5 digits (Hex) to the API and it returns the remaining 35 of all hashes that start with
    //the same 5 digits
    https.get('https://api.pwnedpasswords.com/range/' + passwordHash.substring(0,5), function(resp){
        let returnedHashes, data = '';

        //read data from API
        resp.on('data', function(chunk) {
            data += chunk;
        });

        //when finsihed reading data
        resp.on('end', function() {
            //split the hashes at the newline character into an array of hashes
            returnedHashes = data.split('\r\n');
            //check each hash to see if it matches the user's new password
            returnedHashes.forEach(function(returnedHash) {
                //remove the end of the hash that contains a colon and the number of times the pw shows in the database
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