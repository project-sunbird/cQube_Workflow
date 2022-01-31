const router = require('express').Router();
const { logger } = require('../../lib/logger');
const auth = require('../../middleware/check-auth');
const axios = require('axios');
const dotenv = require('dotenv');
const querystring = require('querystring');
const qr = require('qrcode');
const speakeasy = require("speakeasy");
const common = require('./common');
const { userInfo } = require('os');

dotenv.config();
const authURL = process.env.AUTH_API
const keyCloakURL = process.env.KEYCLOAK_HOST
const keyClockRealm = process.env.KEYCLOAK_REALM

router.post('/login', async (req, res, next) => {

    const { email, password } = req.body;
    let role = '';

    let stateheaders = {
        "Content-Type": "application/json",
    }


    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    try {
        logger.info('--- custom login  api ---');
        // let url = 'http://0.0.0.0:6001/login';
        let url = authURL;
        let headers = {
            "Content-Type": "application/json",
        }

        let details = {
            username: email,
            password: password,
        };

        let keycloakheaders = {
            "Content-Type": "application/x-www-form-urlencoded",
        }

        let keyCloakdetails = new URLSearchParams({
            client_id: 'cQube_Application',
            username: req.body.email,
            password: req.body.password,
            grant_type: 'password',

        });

        let kcUrl = `${keyCloakURL}/auth/realms/${keyClockRealm}/protocol/openid-connect/token`



        await axios.post(kcUrl, keyCloakdetails, { headers: keycloakheaders }).then(resp => {

            let response = resp['data']
            let jwt = resp['data'].access_token;
            let username = ''
            let userId = ''
            if (resp.status === 200) {
                const decodingJWT = (token) => {
                    if (token !== null || token !== undefined) {
                        const base64String = token.split('.')[1];
                        const decodedValue = JSON.parse(Buffer.from(base64String,
                            'base64').toString('ascii'));

                        if (decodedValue.realm_access.roles.includes('admin')) {
                            role = 'admin'
                        }
                        if (decodedValue.realm_access.roles.includes('report_viewer')) {
                            role = 'report_viewer'
                        }
                        if (decodedValue.realm_access.roles.includes('emission')) {
                            role = 'emission'
                        }

                        username = decodedValue.preferred_username;
                        userId = decodedValue.sub

                        return decodedValue;
                    }
                    return null;
                }
                decodingJWT(jwt)
            };


            if (role === 'admin') {
                res.send({ token: jwt, role: role, username: username, userId, userId, res: response })
            }

            if (role === 'emission') {
                res.status(401).json({
                    errMessage: "Not authoruzer to view the reports!!"
                });

            }
            if (role == 'report_viewer') {

                let url = 'http://0.0.0.0:6001/login';
                let headers = {
                    "Content-Type": "application/json",
                }

                let details = {
                    username: email,
                    password: password
                };

                axios.post(url, details, { headers: headers }).then(resp => {

                    let token = resp.data.access_token
                    userId = resp.data.payload.id
                    if (resp.status === 200) {
                        const decodingJWT = (token) => {
                            if (token !== null || token !== undefined) {
                                const base64String = token.split('.')[1];
                                const decodedValue = JSON.parse(Buffer.from(base64String,
                                    'base64').toString('ascii'));

                                username = decodedValue.sub

                                return decodedValue;
                            }
                            return null;
                        }
                        decodingJWT(token)
                    };


                    res.send({ token: token, role: 'report_viewer' })
                }).catch(error => {

                    res.status(409).json({ errMsg: error.response.data.errorMessage });
                })
            }


        }

        ).catch(error => {
            logger.error(`Error :: ${error}`)
            if (role === '' || role === undefined) {
                let url = 'http://0.0.0.0:6001/login';

                let username = '';
                let userId = '';

                let details = {
                    username: email,
                    password: password
                };

                axios.post(url, details, { headers: stateheaders }).then(resp => {

                    let token = resp.data.access_token;
                    userId = resp.data.payload.id
                    if (resp.status === 200) {
                        const decodingJWT = (token) => {
                            if (token !== null || token !== undefined) {
                                const base64String = token.split('.')[1];
                                const decodedValue = JSON.parse(Buffer.from(base64String,
                                    'base64').toString('ascii'));
                                username = decodedValue.sub

                                return decodedValue;
                            }
                            return null;
                        }
                        decodingJWT(token)
                    };

                    res.send({ token: token, role: 'report_viewer', username: username, userId: userId })
                }).catch(error => {

                    res.status(409).json({ errMsg: 'please check user name and password' });
                })
            }


        })



    } catch (error) {
        logger.error(`Error :: ${error}`)
        res.status(404).json({ errMessage: "Internal error. Please try again!!" })
    }
})

router.get('/authenticate', async (req, res, next) => {
    let url = 'http://localhost:8080/auth/realms/cQube/account'
    let header = {
        'Content-Type': 'text/html;charset=utf-8',

    }

    try {

        await axios.get(url, { headers: header }).then(resp => {

            resp.send({ data: resp })
        })
    } catch (error) {

        res.status(409).json({ errMsg: error.response.data.errorMessage });
    }
})
router.post('/getTotp', async (req, res, next) => {
    const { email, password } = req.body;
    common.userObject = {};

    common.userObject.uname = email;
    common.userObject.upass = password;

    const secret = speakeasy.generateSecret({
        length: 10,
        name: common.userObject.uname,
    });

    var url = speakeasy.otpauthURL({
        secret: secret.base32,
        label: common.userObject.uname,
        encoding: 'base32',
        step: 200
    });


    qr.toDataURL(url, (err, dataURL) => {
        common.userObject.tfa = {
            secret: '',
            tempSecret: secret.base32,
            dataURL,
            tfaURL: url,
            lable: email
        };
        return res.json({
            message: 'TFA Auth needs to be verified',
            tempSecret: secret.base32,
            dataURL,
            tfaURL: secret.otpauth_url
        });
    });


})


router.post('/totpVerify', (req, res) => {
    const { secret, token } = req.body

    let isVerified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
    });
    if (isVerified) {
        return res.send({
            "status": 200,
            "message": "Two-factor Auth is enabled successfully"
        });
    }

    return res.send({
        "status": 403,
        "message": "Invalid Auth Code, verification failed. Please verify the system Date and Time"
    });
});

module.exports = router;