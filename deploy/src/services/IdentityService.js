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
      .post(`${config.identityService.url}/v3/authorizations`)
      .set('Content-Type', 'application/x-www-form-urlencoded') 
      .send('clientId=' + config.identityService.clientId + '&secret=' + config.identityService.clientSecret)
      .end()
      .then((res) => { 
            var response = JSON.parse(res.text);
            return response.result.content.token; 
       });
  }

  /**
   * Get user details
   * @param {String} userId the id of user to fetch
   * @param {String} [jwtToken] the authorization token
   * @returns {Object} the user profile
   */
  @log(['userId', 'jwtToken'])
  getUser(userId, jwtToken) {
    var call = (id, token) => {
        return request
            .get(`${config.identityService.url}/v3/users/${id}`)
            .set('Authorization', `Bearer ${token}`)
            .end()
            .then((res) => res.body.result.content);
    }

    if (!jwtToken) {
        return this.authenticate().then((token) => {
            return call(userId, token);
        });
    } else {
        return call(userId, jwtToken);
    }
  }
}

export default new IdentityService();
