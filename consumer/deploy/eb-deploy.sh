#!/bin/bash

SERVICE=$1
ENV=$2
TAG_SUFFIX=$3
TAG="$ENV.$TAG_SUFFIX"


echo "Deploying to Elasticbeanstalk"
echo "############################"
export AWS_ACCESS_KEY_ID=$(eval "echo \$${ENV}_AWS_ACCESS_KEY_ID")
export AWS_SECRET_ACCESS_KEY=$(eval "echo \$${ENV}_AWS_SECRET_ACCESS_KEY")

# eb deploy
# eb init -r us-east-1 $SERVICE
#EB_OUTPUT="$(eb deploy -l $TAG -r us-east-1)"
EB_OUTPUT="$(eb deploy ${SERVICE}-${ENV_LOWER} -l $TAG -r us-east-1)"
echo $EB_OUTPUT
if [[ $EB_OUTPUT =~ .*Error.* ]]
then
 exit 1
fi
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
exit 0
