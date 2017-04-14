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
    const { Items: items } = await dynamodb.scan({
      TableName: dynamoTable,
      ScanFilter: {
        Environment: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [{ S: process.env.NODE_ENV }],
        },
      },
    }).promise();
    console.log('items: ' + items);
    if (!items.length) {
      throw new Error('Configuration for AppXpressConfig not found');
    }
    const item = items[0];
    try {
      return item.magicnumbers.M.dripcampaignid.S;
    } catch (e) {
      throw new Error('Invalid AppXpressConfig. dripcampaignid not found in magicnumbers');
    }
  }
}

export default new ConfigurationService();
