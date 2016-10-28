aws --profile $1 cloudformation update-stack --stack-name tc-connect2sf --template-body file://`pwd`/tc-connect2sf-ecs-cfn-dev.json --capabilities CAPABILITY_IAM
