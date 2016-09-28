/**
 * Unit tests for worker
 */

import {consume} from '../src/worker';
import {UnprocessableError} from '../src/common/errors';
import './setup';

describe('worker', () => {
  describe('consume', () => {
    const queueName = 'sample-queue';
    const validMessage = { content: JSON.stringify({ sampleData: 'foo' }) };
    let handler;
    let ack;
    let nack;
    let assertQueue;
    let rabbitConsume;

    beforeEach(() => {
      handler = sinon.spy();
      ack = sinon.spy();
      nack = sinon.spy();
      assertQueue = sinon.spy();
    });

    /**
     * Invoke the worker consume method using current parameters
     * @param done the mocha done function
     */
    function invokeConsume(done) {
      consume({
        ack,
        nack,
        assertQueue,
        consume: async (queue, fn) => {
          try {
            await rabbitConsume(queue, fn);
            done();
          } catch (e) {
            done(e);
          }
        },
      }, queueName, handler);
    }

    it('should consume and ack a message successfully', (done) => {
      rabbitConsume = async (queue, fn) => {
        expect(queue).to.equal(queueName);
        await fn(validMessage);
        assertQueue.should.have.been.calledWith(queueName, { durable: true });
        handler.should.have.been.calledWith({ sampleData: 'foo' });
        ack.should.have.been.calledWith(validMessage);
      };
      invokeConsume(done);
    });

    it('should ignore an empty msg', (done) => {
      rabbitConsume = async (queue, fn) => {
        await fn(null);
        ack.should.not.have.been.called;
        nack.should.not.have.been.called;
      };
      invokeConsume(done);
    });

    it('should ack a message with invalid JSON', (done) => {
      rabbitConsume = async (queue, fn) => {
        const msg = { content: 'foo' };
        await fn(msg);
        ack.should.have.been.calledWith(msg);
      };
      invokeConsume(done);
    });

    it('should nack if error is thrown', (done) => {
      handler = () => {
        throw new Error('foo');
      };
      rabbitConsume = async (queue, fn) => {
        await fn(validMessage);
        nack.should.have.been.calledWith(validMessage);
      };
      invokeConsume(done);
    });

    it('should ack if error is UnprocessableError', (done) => {
      handler = () => {
        throw new UnprocessableError();
      };
      rabbitConsume = async (queue, fn) => {
        await fn(validMessage);
        ack.should.have.been.calledWith(validMessage);
      };
      invokeConsume(done);
    });
  });
});
