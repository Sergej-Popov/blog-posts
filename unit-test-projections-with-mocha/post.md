```javascript
  console.log()
```

Projections are killer feature of <a href="https://geteventstore.com/">Event Store</a>. They can be used for stream partitioning, stream joins, monitoring, pattern matching, querying and that's not nearly all. What makes projections especially great is the fact that they are written in good old JavaScript. Wait what!? Javascript as Query language!? That's right! Event Store has built in Google V8 JavaScript engine. So no more learning special DSL, if you know a bit of JavaScript you are a master of Event Store projections.

Now, being able to write projections in JavaScript opens one interesting possibility. We can unit test them. I have chosen Mocha + Chai + Synon combo. If Mocha is not your cup of tea, you can use Jasmine just as well. So let's get started!

First thing first, the boilerplate

```
  npm init
  npm i mocha --save
  npm i chai --save
```


```javascript
  //scrips/projection.js

  var fromCategory = fromCategory || require('./util');

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

```javascript
  //tests/projection_spec.js

  var expect = require("chai").expect;
  var projection = require("../scripts/util")();
  require("../scripts/projection");

  describe("Projection tests", function() {
    beforeEach(function() {
      projection.reset();
    });

    it("test 1", function() {
      projection.state = {balance: 10};
      projection.apply('cashDeposited', {deposit: 10});
      expect(projection.state.balance).to.equal(20);
    });

    it("test 2", function() {
      projection.apply('cashDeposited', {deposit: 10});
      expect(projection.state.balance).to.equal(10);
    });

    it("test non registered", function() {
      projection.apply('wkjfbwbgw', {deposit: 10});
      expect(projection.state.balance).to.equal(0);
    });

    it("test $any", function() {
      projection.apply('cashDeposited', {deposit: 10});
      projection.apply('wkjfbwbgw', {deposit: 10});
      expect(projection.state.counter).to.equal(2);
    });
  });
```

```javascript
  //scripts/utils.js

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


---
references:
Singleton: http://stackoverflow.com/a/6733919/846608