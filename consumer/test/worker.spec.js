/**
 * Unit tests for worker
 */
import {consume, initHandlers} from '../src/worker';
import {UnprocessableError} from '../src/common/errors';
import { EVENT } from '../config/constants';
import './setup';

describe('worker', () => {
  describe('consume', () => {
    const queueName = 'sample-queue';
    const exchangeName = 'sample-exchange';
    const validMessage = {
      content: JSON.stringify({ sampleData: 'foo' }),
      properties: { correlationId : 'unit-tests'},
      fields: { routingKey: exchangeName }
    };
    let handler;
    let ack;
    let nack;
    let assertQueue;
    let assertExchange;
    let bindQueue;
    let rabbitConsume;
    let exchangeHandlerSpy = sinon.spy();
    let fakeExchangeHandlerSpy = sinon.spy();
    let channelPublishSpy = sinon.spy();

    beforeEach(() => {
      handler = sinon.spy();
      ack = sinon.spy();
      nack = sinon.spy();
      assertQueue = sinon.spy();
      assertExchange = sinon.spy();
      bindQueue = sinon.spy();

      initHandlers({
        [exchangeName] : exchangeHandlerSpy,
        'fakeExchange' : fakeExchangeHandlerSpy
      })
    });

    /**
     * Invoke the worker consume method using current parameters
     * @param done the mocha done function
     */
    function invokeConsume(done) {
      consume({
        ack,
        nack,
        assertExchange,
        bindQueue,
        assertQueue,
        consume: async (queue, fn) => {
          try {
            await rabbitConsume(queue, fn);
            done();
          } catch (e) {
            done(e);
          }
        },
      }, exchangeName, queueName,
      {
        publish: channelPublishSpy
      });
    }

    it('should consume and ack a message successfully', (done) => {
      rabbitConsume = async (queue, fn) => {
        expect(queue).to.equal(queueName);
        await fn(validMessage);
        assertQueue.should.have.been.calledWith(queueName, { durable: true });
        exchangeHandlerSpy.should.have.been.calledWith(sinon.match.any, { sampleData: 'foo' });
        fakeExchangeHandlerSpy.should.not.have.been.called;
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

    it('should ack, with message being copied to temp queue, if error is thrown', (done) => {
      initHandlers({
        [exchangeName] : () => {
          throw new Error('foo');
        }
      })
      rabbitConsume = async (queue, fn) => {
        await fn(validMessage);
        ack.should.have.been.calledWith(validMessage);
        channelPublishSpy.should.have.been.calledWith(exchangeName, EVENT.ROUTING_KEY.CONNECT_TO_SF_FAILED, new Buffer(validMessage.content));
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
