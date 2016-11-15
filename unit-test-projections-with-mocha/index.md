Projections are killer feature of [Event Store](https://geteventstore.com). They can be used for stream partitioning, stream joins, monitoring, pattern matching, querying and that's not nearly all. What makes projections especially great is the fact that they are written in good old JavaScript. Wait what!? Javascript as a Query language!? That's right! Event Store has built in Google V8 JavaScript engine. So no more learning special DSL, if you know a bit of JavaScript you are a master of Event Store projections.

Now, being able to write projections in JavaScript opens one interesting possibility. We can unit test them. I have chosen Mocha + Chai combo. If Mocha is not your cup of tea, you can use Jasmine just as well. So let's get started!

I assume you have basic understanding of Event Store projections and NPM.

First thing first, initialize npm project and install mocha, chai and testing utility

```
  npm init
  npm i mocha --save-dev
  npm i chai --save-dev
  npm i event-store-projection-testing --save-dev
```

Let's take a very simple (and fairly unrealistic) projection that counts all events and accumulates balance on cashDeposited event.
```javascript
//scrips/projection.js

var fromAll = fromAll || require('event-store-projection-testing').scope.fromAll;
var emit = emit || require('event-store-projection-testing').scope.emit;

fromAll()
  .when({
      '$init': function() {
        return { balance: 0, counter: 0}
      },
      '$any': function(state, event) {
        state.counter++;
      },
      cashDeposited: function(state, event) {
        state.balance += event.data.deposit;
        emit('stream-out', 'emittedEvent', {a:1});
      }
    }
  );
```

Notice the `require('event-store-projection-testing');` statement - we need this to inject a mock `fromAll` function. This is where all the trickery will happen. When projection will be executed by Event Store `fromAll` will be available so `fromAll || require('event-store-projection-testing');` will short circuit and require statement will not execute.

So what is inside the event-store-projection-testing utility? Inside is a thin wrapper around Event Store projection engine forked from Event Store itself. Which guarantees that the way the projections are tested is exactly the same way as Event Store is going to run them. You see, not only Event Store allows you to write your projections in JavaScript it also executes them in JavaScript runtime using Google V8 JavaScript engine. Want to know more? Just dig into the source code of [Event Store](https://github.com/EventStore/EventStore). Don't you love open source? =)

Time to write some unit tests!

```javascript
//tests/projection_spec.js

require('chai').should();
var projection = require('event-store-projection-testing');
require('../scripts/projection');

describe('Projection tests', function() {
  beforeEach(function() {
    projection.initialize();
  });

  it('should increment balance on cashDeposited event when initial balance is set', function() {
    projection.setState({balance: 10});
    projection.processEvent('stream-123', 'cashDeposited', {deposit: 10});
    projection.getState().balance.should.equal(20);
  });

  it('should increment balance on cashDeposited event without initial balance', function() {
    projection.processEvent('stream-123', 'cashDeposited', {deposit: 10});
    projection.getState().balance.should.equal(10);
  });

  it('should not increment balance on unregistered event', function() {
    projection.processEvent('stream-123', 'NON_EXISTING_EVENT_TYPE', {deposit: 10});
    projection.getState().balance.should.equal(0);
  });

  it('should increment counter for every event', function() {
    projection.processEvent('stream-123', 'cashDeposited', {deposit: 10});
    projection.processEvent('stream-123', 'NON_EXISTING_EVENT_TYPE', {deposit: 10});
    projection.getState().counter.should.equal(2);
  });

  it('should re-emit all cashDeposited events', function() {
    projection.processEvent('stream-123', 'cashDeposited', {deposit: 10});
    projection.processEvent('stream-123', 'cashDeposited', {deposit: 10});
    projection.processEvent('stream-123', 'cashDeposited', {deposit: 10});
    projection.emittedEvents.should.have.length(3);
  });
});
```

We can do all necessary operations and assertions now:
* Set initial state
* Apply events
* Assert on new state
* Assert events have been emited
* Reset state (`projection.initialize()`)

Run the unit tests! `node node_modules\mocha\bin\mocha tests`

Utility is agnostic to unit testing framework, you can use it with Jasmine just as well.

In the future post we will have a look into running Event Store in "In-Memory" mode for situations when unit testing is just not enough and you need more of an integration style test.

---

Links:
* Source Code: <https://github.com/Sergej-Popov/blog-posts/tree/master/unit-test-projections-with-mocha>
* event-store-projection-testing: <https://www.npmjs.com/package/event-store-projection-testing>
* Singleton pattern in JS: <http://stackoverflow.com/a/6733919/846608>
* Mocha: <https://mochajs.org/>
* Chai: <http://chaijs.com/>