module('robert.Foo').requires('robert.Foo2').toRun(function() {

alert('Foo loaded')
Global.FooValue = 1;


}) // end of module