module('users.robertkrahn.demo').requires().toRun(function() {

Object.subclass('DemoClass', {

    sayHello: function() {
        alert('Hello!');
    },
    newMethod: function() {
        // enter comment here
    }});

}) // end of module
