/**
 * Setup configuration for AWS services.
 **/

import AWS from 'aws-sdk';
import config from 'config';
import logger from './common/logger';

AWS.config.apiVersions = {
  dynamodb: '2012-08-10',
};
logger.debug('aki: ' + config.aws.accessKeyId.substring(15));
logger.debug('sak' + config.aws.secretAccessKey.substring(15));
AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region,
});

let endpoint;
if (config.aws.endpoint) {
  endpoint = new AWS.Endpoint(config.aws.endpoint);
}
logger.debug('endpoint: ' + endpoint)
export const dynamodb = new AWS.DynamoDB({endpoint});
