Projections are killer feature of [Event Store](https://geteventstore.com). They can be used for stream partitioning, stream joins, monitoring, pattern matching, querying and that's not nearly all. What makes projections especially great is the fact that they are written in good old JavaScript. Wait what!? Javascript as Query language!? That's right! Event Store has built in Google V8 JavaScript engine. So no more learning special DSL, if you know a bit of JavaScript you are a master of Event Store projections.

Now, being able to write projections in JavaScript opens one interesting possibility. We can unit test them. I have chosen Mocha + Chai combo. If Mocha is not your cup of tea, you can use Jasmine just as well. So let's get started!

I assume you have basic understanding of Event Store projections and NPM.

First thing first, let initialize npm project and install mocha, chai and testing utility

```
  npm init
  npm i mocha --save-dev
  npm i chai --save-dev
  npm i event-store-projection-testing --save-dev
```

Let's take a very simple (and fairly unrealistic) projection that counts all events and accumulated balance on cashDeposited event.
```javascript
//scrips/projection.js

var fromCategory = fromCategory || require('event-store-projection-testing');

fromCategory()
  .when({
      '$init': function() {
        return { balance: 0, counter: 0}
      },
      '$any': function(state, event) {
        state.counter++;
      },
      cashDeposited: function(state, event) {
        state.balance += event.deposit;
      }
    }
  );
```

Notice the `require('event-store-projection-testing');` statement - we need this to inject a mock `fromCategory` function. This is where all the trickery will happen. When projection will be executed by Event Store `fromCategory` will be available so `fromCategory || require('event-store-projection-testing');` will short circuit and require statement will not execute. Let's see what is inside the `event-store-projection-testing`:

```javascript
function fromCategory() {
  if (arguments.callee._singletonInstance) {
    return arguments.callee._singletonInstance;
  }
  arguments.callee._singletonInstance = this;

  this.subscriptions = {}
  this.state = {};
  this.when = function(subscriptions) {
    this.subscriptions = subscriptions;
    if (subscriptions && subscriptions['$init'])
      this.state = subscriptions['$init']();
  };

  this.apply = function(eventName, event) {
    if (!this.subscriptions) return;

    if (this.subscriptions[eventName])
      this.subscriptions[eventName](this.state, event);

    if (this.subscriptions['$any'])
      this.subscriptions['$any'](this.state, event);
  };

  this.reset = function() {
    this.state = (this.subscriptions && this.subscriptions['$init']) ? this.subscriptions['$init']() : {};
  }
}
new fromCategory();

module.exports = fromCategory;
```

Our util is a singleton implementation of `fromCategory`

Why singleton? Simply because we need a way to remember what subcriptions our projection has registered. Projection is not a module, so we cannot inject an instance of `fromCategory` when invoking it. Instead we trick it to use our mock when `fromCategory` is not available. 

Time to write some unit tests!

```javascript
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
```

We can do all necessary operations and assertions now:
* Set initial state
* Apply events
* Assert on new state
* Assert on subcriptions registered 
* Reset state

Run the unit tests! `node node_modules\mocha\bin\mocha tests`

Utility is agnostic to unit testing framework, you can use it with Jasmine just as well. You don't have to use it from NPM package too, just copy it in your project if you like.

In the future post we will have a look into running Event Store in "In-Memory" mode for the situations when unit testing is just not enough and you need more of an integration style test.

---
Links:
* Source Code: <https://github.com/Sergej-Popov/blog-posts/tree/master/unit-test-projections-with-mocha>
* event-store-projection-testing: <https://www.npmjs.com/package/event-store-projection-testing>
* Singleton pattern in JS: <http://stackoverflow.com/a/6733919/846608>
* Mocha: <https://mochajs.org/>
* Chai: <http://chaijs.com/>