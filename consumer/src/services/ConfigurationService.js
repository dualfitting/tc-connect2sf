/**
 * Represents the configuration service
 */

import {log} from '../common/decorators';
import {dynamodb} from '../aws';

const dynamoTable = 'AppXpressConfig';

class ConfigurationService {

  /**
   * Get salesforce campaign id
   * @returns {String} the campaign id or null if not found
   */
  @log()
  async getSalesforceCampaignId() {
    const result = await dynamodb.scan({
      TableName: dynamoTable,
      ScanFilter: {
        Environment: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [{ S: process.env.NODE_ENV }],
        },
      },
    }).promise();
    if (!result.Items.length) {
      throw new Error('Configuration for AppXpressConfig not found');
    }
    const item = result.Items[0];
    try {
      return item.magicnumbers.M.dripcampaignid.S;
    } catch (e) {
      throw new Error('Invalid AppXpressConfig. dripcampaignid not found in magicnumbers');
    }
  }
}

export default new ConfigurationService();
