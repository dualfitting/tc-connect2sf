/**
 * Unit tests for ConsumerService
 */

import config from 'config';
import ConsumerService from '../src/services/ConsumerService';
import ConfigurationService from '../src/services/ConfigurationService';
import SalesforceService from '../src/services/SalesforceService';
import IdentityService from '../src/services/IdentityService';
import {UnprocessableError} from '../src/common/errors';
import './setup';

describe('ConsumerService', () => {
  const sfCampaignId = 'sf-camp-id';
  const leadId = 'fake-lead-id';
  const user = {
    firstName: 'john',
    lastName: 'doe',
    email: 'jd@example.com',
  };
  const sfAuth = {
    accessToken: 'fake-token',
    instanceUrl: 'http://fake-domain',
  };
  const userId = 40135978;
  const project = {
    id: 1,
    members: [
      {
        id: 1234,
        userId,
        role: 'customer',
        isPrimary: true,
      },
    ],
  };
  let sandbox;
  let getUserStub;
  let getCampaignIdStub;
  let authenticateStub;

  // mock all external services
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    getCampaignIdStub = sandbox.stub(ConfigurationService, 'getSalesforceCampaignId', async() => sfCampaignId);
    getUserStub = sandbox.stub(IdentityService, 'getUser', async() => user);
    authenticateStub = sandbox.stub(SalesforceService, 'authenticate', async() => sfAuth);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('processProjectCreated', () => {
    it('should process project successfully', async() => {
      const expectedLead = {
        FirstName: 'john',
        LastName: 'doe',
        Email: 'jd@example.com',
        LeadSource: 'Connect',
        Company: 'Unknown',
        OwnerId: config.ownerId,
        Connect_Project_Id__c: 1,
      };

      const expectedCampaignMember = {
        LeadId: leadId,
        CampaignId: sfCampaignId,
      };

      const createObjectStub = sandbox.stub(SalesforceService, 'createObject', async() => leadId);

      await ConsumerService.processProjectCreated(project);
      getCampaignIdStub.should.have.been.called;
      getUserStub.should.have.been.calledWith(userId);
      authenticateStub.should.have.been.called;
      createObjectStub.should.have.been.calledWith('Lead', expectedLead, sfAuth.accessToken, sfAuth.instanceUrl);
      createObjectStub.should.have.been.calledWith('CampaignMember', expectedCampaignMember, sfAuth.accessToken,
        sfAuth.instanceUrl);
    });

    it('should throw UnprocessableError primary customer is not found', async() => {
      const projectWihoutMembers = {
        id: 1,
        members: [],
      };
      await expect(ConsumerService.processProjectCreated(projectWihoutMembers))
        .to.be.rejectedWith(UnprocessableError, /Cannot find primary customer/);
    });

    it('should throw UnprocessableError if Lead already exists', async() => {
      const createObjectStub = sandbox.stub(SalesforceService, 'createObject', async() => {
        const err = new Error('Bad request');
        err.response = {
          text: '[{"message":"duplicate value found: Connect_Project_Id__c duplicates value on' +
          ' record with id: 00Q58000003tW4u","errorCode":"DUPLICATE_VALUE","fields":[]}]',
        };
        throw err;
      });
      await expect(ConsumerService.processProjectCreated(project))
        .to.be.rejectedWith(UnprocessableError, /Lead already existing for project 1/);
      createObjectStub.should.have.been.called;
    });

    it('should rethrow Error from createObject if error is not duplicate', async() => {
      const createObjectStub = sandbox.stub(SalesforceService, 'createObject', async() => {
        throw new Error('Fake Error');
      });
      await expect(ConsumerService.processProjectCreated(project))
        .to.be.rejectedWith(Error, /Fake Error/);
      createObjectStub.should.have.been.called;
    });
  });

  describe('processProjectUpdated', () => {
    it('should process project successfully', async() => {
      const memberId = 'member-id';
      const leadSql = `SELECT id FROM Lead WHERE Connect_Project_Id__c = '${project.id}'`;
      const memberSql = `SELECT id FROM CampaignMember WHERE LeadId = '${leadId}' AND CampaignId ='${sfCampaignId}'`;

      const queryStub = sandbox.stub(SalesforceService, 'query');
      queryStub.onCall(0)
        .returns(Promise.resolve({ records: [{ Id: leadId }] }));
      queryStub.onCall(1)
        .returns(Promise.resolve({ records: [{ Id: memberId }] }));
      const deleteObjectStub = sandbox.stub(SalesforceService, 'deleteObject');

      await ConsumerService.processProjectUpdated(project);
      queryStub.should.have.been.calledWith(leadSql, sfAuth.accessToken, sfAuth.instanceUrl);
      queryStub.should.have.been.calledWith(memberSql, sfAuth.accessToken, sfAuth.instanceUrl);
      deleteObjectStub.should.have.been.calledWith('CampaignMember', memberId, sfAuth.accessToken,
        sfAuth.instanceUrl);
    });

    it('should throw UnprocessableError if Lead cannot be found', async() => {
      const queryStub = sandbox.stub(SalesforceService, 'query');
      queryStub.onCall(0)
        .returns(Promise.resolve({ records: [] }));
      await expect(ConsumerService.processProjectUpdated(project))
        .to.be.rejectedWith(UnprocessableError, /Cannot find Lead with Connect_Project_Id__c = '1'/);
      queryStub.should.have.been.called;
    });

    it('should throw UnprocessableError if CampaignMember cannot be found', async() => {
      const queryStub = sandbox.stub(SalesforceService, 'query');
      queryStub.onCall(0)
        .returns(Promise.resolve({ records: [{ Id: leadId }] }));
      queryStub.onCall(1)
        .returns(Promise.resolve({ records: [] }));
      await expect(ConsumerService.processProjectUpdated(project))
        .to.be.rejectedWith(UnprocessableError, /Cannot find CampaignMember for Lead.Connect_Project_Id__c = '1'/);
      queryStub.should.have.been.called;
    });
  });
});
