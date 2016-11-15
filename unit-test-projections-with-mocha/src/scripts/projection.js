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