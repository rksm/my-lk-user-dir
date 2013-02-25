module('users.robertkrahn.TestDemo').requires('lively.TestFramework').toRun(function() {

TestCase.subclass('users.robertkrahn.TestDemo.NewTestClass', {
    test01: function() {
        this.assert(true, 'This is an error!');
    }
});

}) // end of module