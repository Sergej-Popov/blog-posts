//tests/projection_spec.js

require('chai').should();
var projection = require('event-store-projection-testing')();
require('../scripts/projection');

describe('Projection tests', function() {
  beforeEach(function() {
    projection.reset();
  });

  it('should increment balance on cashDeposited event when initial balance is set', function() {
    projection.state = {balance: 10};
    projection.apply('cashDeposited', {deposit: 10});
    projection.state.balance.should.equal(20);
  });

  it('should increment balance on cashDeposited event without initial balance', function() {
    projection.apply('cashDeposited', {deposit: 10});
    projection.state.balance.should.equal(10);
  });

  it('should not increment balance on unregistered event', function() {
    projection.apply('wkjfbwbgw', {deposit: 10});
    projection.state.balance.should.equal(0);
  });

  it('should increment counter for every event', function() {
    projection.apply('cashDeposited', {deposit: 10});
    projection.apply('wkjfbwbgw', {deposit: 10});
    projection.state.counter.should.equal(2);
  });

  it('should register cashDeposited subscription', function() {
    projection.subscriptions['cashDeposited'].should.be.a('Function');
  });
});