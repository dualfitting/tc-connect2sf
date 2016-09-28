/**
 * This file defines application errors.
 */

import util from 'util';

/**
 * Helper function to create generic error object
 * @param {String} name the error name
 * @param {Object} params the extra params to assign
 * @returns {Function} the error constructor
 * @private
 */
function _createError(name, params) {
  /**
   * The error constructor
   * @param {String} message the error message
   * @param {String} [cause] the error cause
   * @constructor
   */
  function ErrorCtor(message, cause) {
    Error.call(this);
    Error.captureStackTrace(this);
    this.message = message || name;
    this.cause = cause;
    Object.assign(this, params || {});
  }

  util.inherits(ErrorCtor, Error);
  ErrorCtor.prototype.name = name;
  return ErrorCtor;
}

export const UnprocessableError = _createError('UnprocessableError', {shouldAck: true});
