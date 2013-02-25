module('users.robertkrahn.Tests').requires('lively.TestFramework').toRun(function() {

TestCase.subclass('users.robertkrahn.Tests.ShortcutTests',
'running', {
    setUp: function($super) {
        this.targetMock = {};
        this.sut = new lively.morphic.Text.ShortcutHandler();
        this.sut.target = this.targetMock;
    },
},
'testing', {
    testCreateEvtSpecFromShortcutStringForCtrl: function() {
        var spec = this.sut.parseShortcut('<ctrl>+e');
        this.assert(spec.ctrl, 'ctrl not recognized');
        this.assertEquals(spec.charCode, 'E'.charCodeAt(0), '"e" not recognized');
    },
    testAddBinding: function() {
        this.sut.addBinding('<ctrl>+e');
        var bindings = this.sut.bindings();
        this.assertEquals(1, bindings.length, 'did not register binding');
        this.assert(bindings[0].evtSpec.ctrl, 'ctrl not recognized');
        this.assertEquals('e', bindings[0].evtSpec.charPressed, 'e not recognized');
    },
    testInvokeCtrlEvt: function() {
        var wasCalled = false,
            targetMatched = false,
            expectedTarget = this.targetMock;
        this.sut.addBinding('<ctrl>+n', function(target) {
            wasCalled = true;
            targetMatched = expectedTarget === target;
            return true;
        });
        this.sut.invoke(this.createKeyboardEvent({type: 'keydown', charCode: 'F'.charCodeAt(0), ctrl: true}), expectedTarget);
        this.assert(!wasCalled, 'wrong invocation');
        var retVal = this.sut.invoke(this.createKeyboardEvent({type: 'keydown', charCode: 'N'.charCodeAt(0), ctrl: true}), expectedTarget);
        this.assert(wasCalled, 'not invoked!');
        this.assert(targetMatched, 'target was not passed');
        this.assert(retVal, 'wrong return value');
    },
});


}) // end of module