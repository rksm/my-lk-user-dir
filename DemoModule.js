module('users.robertkrahn.DemoModule').requires().toRun(function() {

lively.morphic.Morph.subclass('DemoMorph', {
    sayHello: function() {
        alert('Here is the Demo morph');
    },
    sayHello2: function() {
        alert('Here is the Demo morph');
    },
});

}) // end of module