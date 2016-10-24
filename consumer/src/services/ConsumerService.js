/**
 * Represents the consumer service for project events
 */

import Joi from 'joi';
import _ from 'lodash';
import config from 'config';
import {logAndValidate} from '../common/decorators';
import ConfigurationService from './ConfigurationService';
import IdentityService from './IdentityService';
import SalesforceService from './SalesforceService';
import {UnprocessableError} from '../common/errors';

const memberRole = 'customer';
const leadSource = 'Connect';
const company = 'Unknown';
const duplicateRecordRegex = /TC_Connect_Project_Id__c duplicates value on record/;

const projectSchema = Joi.object().keys({
    id: Joi.number().required(),
    members: Joi.array().required()
}).unknown(true);

class ConsumerService {

  /**
   * Handle a new created project
   * @param {Object} projectEvent the project event
   */
  @logAndValidate(['project'], {project: projectSchema})
  //@logAndValidate(['projectEvent'], {projectEvent: projectEventSchema})
  //async processProjectCreated(projectEvent) {
  async processProjectCreated(project) {
    // var project = projectEvent.updated;
    const member = _.find(project.members, {role: memberRole, isPrimary: true});
    if (!member) {
      throw new UnprocessableError('Cannot find primary customer');
    }
    const [
      campaignId,
      user,
      {accessToken, instanceUrl},
    ] = await Promise.all([
      ConfigurationService.getSalesforceCampaignId(),
      IdentityService.getUser(member.userId),
      SalesforceService.authenticate(),
    ]);

    const lead = {
      FirstName: user.firstName,
      LastName: user.lastName,
      Email: user.email,
      LeadSource: leadSource,
      Company: company,
      OwnerId: config.ownerId,
      TC_Connect_Project_Id__c: project.id,
    };
    let leadId;
    try {
      leadId = await SalesforceService.createObject('Lead', lead, accessToken, instanceUrl);
    } catch (e) {
      if (e.response && e.response.text && duplicateRecordRegex.test(e.response.text)) {
        throw new UnprocessableError(`Lead already existing for project ${project.id}`);
      }
      throw e;
    }
    const campaignMember = {
      LeadId: leadId,
      CampaignId: campaignId,
    };
    await SalesforceService.createObject('CampaignMember', campaignMember, accessToken, instanceUrl);
  }

  /**
   * Handle created/launched project
   * @param {Object} projectEvent the project
   */
  @logAndValidate(['project'], {project: projectSchema})
  async processProjectUpdated(project) {
    const [
      campaignId,
      {accessToken, instanceUrl},
    ] = await Promise.all([
      ConfigurationService.getSalesforceCampaignId(),
      SalesforceService.authenticate(),
    ]);
    let sql = `SELECT id FROM Lead WHERE TC_Connect_Project_Id__c = '${project.id}'`;
    const {records: [lead]} = await SalesforceService.query(sql, accessToken, instanceUrl);
    if (!lead) {
      throw new UnprocessableError(`Cannot find Lead with TC_Connect_Project_Id__c = '${project.id}'`);
    }
    sql = `SELECT id FROM CampaignMember WHERE LeadId = '${lead.Id}' AND CampaignId ='${campaignId}'`;
    const {records: [member]} = await SalesforceService.query(sql, accessToken, instanceUrl);
    if (!member) {
      throw new UnprocessableError(`Cannot find CampaignMember for Lead.TC_Connect_Project_Id__c = '${project.id}'`);
    }
    await SalesforceService.deleteObject('CampaignMember', member.Id, accessToken, instanceUrl);
  }
}

export default new ConsumerService();

