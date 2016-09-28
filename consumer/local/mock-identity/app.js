/**
 * The application entry point
 */
'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.set('port', 3001);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/v3/authorization', (req, res) => {
  res.json({
    "id": "-88f3803:1557f8485b0:-ae0",
    "result": {
      "content": {
        "createdAt": null,
        "createdBy": null,
        "externalToken": null,
        "id": "1110840181",
        "modifiedAt": null,
        "modifiedBy": null,
        "refreshToken": null,
        "target": "1",
        "token": "THEJWTTOKEN",
        "zendeskJwt": null
      },
      "metadata": null,
      "status": 200,
      "success": true
    },
    "version": "v3"
  })
});


app.get('/v3/users/:userId', (req, res) => {
  res.json( {
      "id": "-88f3803:1557f8485b0:-b0a",
      "result": {
        "success": true,
        "status": 200,
        "metadata": null,
        "content": {
          "id": "265522",
          "modifiedBy": null,
          "modifiedAt": "2016-06-01T16:57:47.000Z",
          "createdBy": null,
          "createdAt": "2002-02-06T18:06:40.000Z",
          "handle": "veredox",
          "email": "email@domain.com",
          "firstName": "F_NAME",
          "lastName": "L_NAME",
          "credential": {
            "activationCode": "3DZ9IVH4",
            "resetToken": null,
            "hasPassword": true
          },
          "status": "A",
          "country": null,
          "regSource": null,
          "utmSource": null,
          "utmMedium": null,
          "utmCampaign": null,
          "active": true,
          "profile": null,
          "emailActive": true
        }
      },
      "version": "v3"
    });
});

app.listen(app.get('port'), () => {
  console.log(`Express server listening on port ${app.get('port')}`);
});