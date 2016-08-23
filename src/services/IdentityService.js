/**
 * Represents the TopCoder identity service
 */

import config from 'config';
import superagent from 'superagent';
import superagentPromise from 'superagent-promise';
import {log} from '../common/decorators';

const request = superagentPromise(superagent, Promise);


class IdentityService {

  /**
   * Authenticate to Identity Service with pre-configured credentials
   * @returns {String} the jwt token
   */
  @log([], {removeOutput: true})
  authenticate() {
    return request
      .post(`${config.identityService.url}/v3/authorization`)
      .send({
        clientId: config.identityService.clientId,
        secret: config.identityService.clientSecret,
      })
      .end()
      .then((res) => res.body.result.content.token);
  }

  /**
   * Get user details
   * @param {String} userId the id of user to fetch
   * @param {String} [jwtToken] the authorization token
   * @returns {Object} the user profile
   */
  @log(['userId', 'jwtToken'])
  getUser(userId, jwtToken) {
    if (!jwtToken) {
      jwtToken = this.authenticate();
    }
    return request
      .get(`${config.identityService.url}/v3/users/${userId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .end()
      .then((res) => res.body.result.content);
  }
}

export default new IdentityService();
