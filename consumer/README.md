## Application setup
- nodejs v6+ (https://nodejs.org/en/)
- dynamodb 
- Topcoder Identity Service
- Salesforce developer account https://developer.salesforce.com/signup


## Configuration
All configuration files are located under `config` directory.  
`config/key.pem` is your private key for your Salesforce app, it will be used for signing JWT tokens  
`config/cert.pem` is your certificate for your Salesforce app, see `Salesforce setup` section  

You can configure app via env variables or you can use `local.json` file (copy it from `sample-local.json`).  
Make sure to update values with text `****UPDATE****`

- **logLevel**
The application log level: `error` or `fatal` (`fatal` will disable all logging)  
Env variable: `LOG_LEVEL`

- **rabbitmqURL**
The rabbitmq URL.  
Create a free account here https://www.cloudamqp.com/ and create a new instance in any region.   
You can get URL by clicking on queue details button.     
Env variable: `RABBITMQ_URL`

- **ownerId**
The salesforce user id used in Lead record (see https://help.salesforce.com/HTViewSolution?id=000003680 how to get it)  
Env variable: `OWNER_ID`


- **aws** contains configuration for AWS
    - **endpoint** the custom endpoint, set it only if you use a fake dynamodb  
    Env variable: `AWS_ENDPOINT`
    - **region** the aws region  
    Env variable: `AWS_REGION`
    - **accessKeyId** the access key  
    Env variable: `AWS_ACCESS_KEY_ID`
    - **secretAccessKey** the secret access key  
    Env variable: `AWS_SECRET_ACCESS_KEY`

- **identityService** contains configuration for identity service
    - **url** the base url  
    Env variable: `IDENTITY_SERVICE_URL`
    - **clientId** the client id  
    Env variable: `IDENTITY_SERVICE_CLIENT_ID`
    - **clientSecret** the client secret  
    Env variable: `IDENTITY_SERVICE_CLIENT_SECRET`

- **salesforce** contains configuration for salesforce app
    - **clientId** the client id  
    Env variable: `SALESFORCE_CLIENT_ID`
    - **subject** the username (email) of your target user  
    Env variable: `SALESFORCE_CLIENT_SUBJECT`
    - **audience** the salesforce login url  
    Env variable: `SALESFORCE_CLIENT_AUDIENCE`

- **queues** contains configuration for rabbitmq queues
    - **projectCreated** the queue for created projects  
    Env variable: `QUEUE_PROJECT_CREATED`  
    - **projectLaunched** the queue for launched projects  
    Env variable: `QUEUE_PROJECT_LAUNCHED`

To output debug information, set `DEBUG` env variable to `app:*`,

## Salesforce setup
All steps are for old theme.

1. Create campaign
- Select `Campaigns` from main menu 
- click `New` 
- Enter any name 
- click `Save`  
- copy Campaign Id from URL
- Use this id and update `local/aws-cli/data/json`, replace `dripcampaignid`

2. OAuth app
- click on `Setup` from the top menu
- Select `Build -> Create -> Apps` from left menu
- Click `New` under `Connected Apps`
- Enter any name and email
- Select `Enable OAuth Settings` and enter the same settings as below

You can use the existing cert.pem from `config` directory.  
Or generate a new certificate and key using a command:  
`openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem`

![Alt text](https://monosnap.com/file/tT9ZZXUH1aa1j7cFzYxaV9RjmHWCum.png)
Click Save  
![Alt text](https://monosnap.com/file/DHTJxilXzHrbXjz6HMfVSm8lMzUhkW.png)
`Consumer Key` is your Salesforce client Id

- Construct  URL `https://login.salesforce.com/services/oauth2/authorize?client_id=[clientId]&redirect_uri=https://login.salesforce.com&response_type=code`
- replace `[clientId]` with your client id and open in your browser
- you must grant access to the current user, this operation must be done only once

3. Add a custom field to Lead
- click on `Setup` from the top menu
- Select `Build -> customize -> Leads -> Fields` from left menu
- Click `New` under `Lead Custom Fields & Relationships`
- Select `Text` DataType and click Next
- Set `Field Label` and `Field Name` to `Connect_Project_Id`
- Set `Length` to `20`
- Check `Unique`

![Alt text](https://monosnap.com/file/JIsxwhVbw061UiP67C1l0IrV3SIkG2.png)

- Click Next in all other steps

## Mock services
- Use docker compose https://docs.docker.com/compose/install/ (use version 1.8)
```
cd local
docker-compose up --build
```

Set `dockerhost` in hosts file to your docker machine ip.  
You can check docker-machine by running ` docker-machine ip default`  
For linux use `localhost`  

Set `aws.endpoint` to `http://dockerhost:7777`  
Set `identityService.url` to `http://dockerhost:3001`  
Your aws region, key id and secret must match settings from `config` and `credentials` in `local/aws-cli/` directory

## Starting

Install dependencies:  
`npm install`


Prod mode:  
`npm start`

It's recommenced to use tools like forever or pm2.  
App will exit if there is any connection error to RabbitMQ.  

See https://www.npmjs.com/package/forever  
Example: 
```
forever start -c "npm start" --uid "consumer"  .
```

See https://www.npmjs.com/package/pm2  
Example: 
```
pm2 start npm  --name consumer -- start
```
it will run a command `npm start` and set name to process `consumer`


Dev/local mode (auto reload + debug):  
`npm run dev`

Unit tests:   
`npm run test`

Run lint:   
`npm run lint` or `npm run lint:fix` 

coverage:   
`npm run coverage`  
Open `coverage/lcov-report/index.html`

## Windows issue
Coverage report doesn't work on Windows.


## Verification

Use following JSON for testing
```
{
    "updated": {
        "id": 1,
        "members": [
            {
                "userId": 40135978,
                "role": "customer",
                "isPrimary": true
            }
        ]
    }
}
```

You can use a complete JSON, but other properties are not used.  

Open RabbitMQ Management Interface  
(in cloudamqp.com click on -> Control Panel -> Details -> RabbitMQ Management Interface)  
Open queues
![Alt text](https://monosnap.com/file/AKxR0CWNygSglchYOxpnW9fZ34WVnp.png)
Queues should be automatically created  
Open `created` queue and publish a new message
![Alt text](https://monosnap.com/file/fG2XsWpMj3jBMa0AqikyV66TAWxsDr.png) 

Go to Salesforce and select Lead from the top menu  
![Alt text](https://monosnap.com/file/W3abeQkgGMb4Z3Gc4Ncf7VLUhKscrH.png)
This is the new created lead  

Click on it to see details
![Alt text](https://monosnap.com/file/nHJtilGYA7jYNiMJNiXH5IERrrAePN.png)
Lead is associated to the campaign

Go to Rabbitmq and add the same message to the `launched` queue

Check the Lead details in Saleforce
![Alt text](https://monosnap.com/file/PdMF97k18cBGeZjR9qOkkBe1AjYw2n.png)
Lead is removed from the campaign


Notes on Error Handling.  
UnprocessableError is thrown if operation cannot be completed.  
For example: duplicated project id added to the queue, Lead cannot be found etc.  
In such situation, the message from rabbitmq will be marked as ACK (removed).  
If we won't remove it from queue, the message will be stuck forever.  


