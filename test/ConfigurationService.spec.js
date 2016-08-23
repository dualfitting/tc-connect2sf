/**
 * Unit tests for ConfigurationService
 */

import ConfigurationService from '../src/services/ConfigurationService';
import './setup';
import {dynamodb} from '../src/aws';

describe('ConfigurationService', () => {
  let stub;
  afterEach(() => {
    if (stub) {
      stub.restore();
      stub = null;
    }
  });

  it('should return dripcampaignid successfully', async() => {
    stub = sinon.stub(dynamodb, 'scan', () => ({
      promise: () => Promise.resolve({
        Items: [{
          Environment: {
            S: 'development',
          },
          magicnumbers: {
            M: {
              dripcampaignid: {
                S: 'foo',
              },
            },
          },
        }],
      }),
    }));
    const campaignId = await ConfigurationService.getSalesforceCampaignId();
    expect(campaignId).to.equal('foo');
  });

  it('should throw an error if configuration is missing', async() => {
    stub = sinon.stub(dynamodb, 'scan', () => ({
      promise: () => Promise.resolve({
        Items: [],
      }),
    }));
    await expect(ConfigurationService.getSalesforceCampaignId())
      .to.be.rejectedWith(/Configuration for AppXpressConfig not found/);
  });

  it('should throw an error if configuration is malformed', async() => {
    stub = sinon.stub(dynamodb, 'scan', () => ({
      promise: () => Promise.resolve({
        Items: [{
          Environment: {
            S: 'development',
          },
          magicnumbers: {
            S: 'foo',
          },
        }],
      }),
    }));
    await expect(ConfigurationService.getSalesforceCampaignId())
      .to.be.rejectedWith(/Invalid AppXpressConfig. dripcampaignid not found in magicnumbers/);
  });
});
