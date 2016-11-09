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