# Create AppXpressConfig table
aws dynamodb create-table --table-name AppXpressConfig --attribute-definitions AttributeName=Setting,AttributeType=S AttributeName=Environment,AttributeType=S --key-schema AttributeName=Setting,KeyType=HASH AttributeName=Environment,KeyType=RANGE --region us-east-1 --provisioned-throughput ReadCapacityUnits=4,WriteCapacityUnits=2 --endpoint-url http://dynamodb:7777

# Loads AppXpressConfig data
aws dynamodb batch-write-item --request-items file://$PWD/data.json --endpoint-url http://dynamodb:7777
