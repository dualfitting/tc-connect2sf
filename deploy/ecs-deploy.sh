PROFILE=$1

ecs-cli configure --region us-east-1 --profile $PROFILE --cluster tc-connect2sf
ecs-cli compose --project-name tc-connect2sf --file tc-connect2sf.yml service up
