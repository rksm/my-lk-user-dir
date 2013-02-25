module('users.robertkrahn.WindowNavigation').requires('lively.morphic.Widgets', 'lively.morphic.tests.Helper').toRun(function() {

(function installKeyEventHandler() {
    $("body").off('keydown');
//    $("body").off('keyup');
    var winSwitcher
    $("body").bind('keydown', function(evt) {
        if (evt.keyCode === 116) {
            evt.stopPropagation();
            winSwitcher = winSwitcher || lively.PartsBin.getPart("WindowSwitcher", "PartsBin/Controls");
            winSwitcher.open();
            return true;
        }
//        if (evt.ctrlKey && evt.keyCode !== 17) inspect(evt);
    });
})();

Object.subclass('users.robertkrahn.WindowNavigation.WindowManager',
'initialzing', {
    initialize: function(containerMorph) {
        this.root = containerMorph;
    }
},
'accessing', {
    getWindows: function() {
        return this.root.submorphs.select(function(ea) { return ea.isWindow; });
    },
    findWindow: function(func) { return this.getWindows().detect(func); }
},
'interaction', {
    activate: function(morphOrTitleOrName) {
        if (!morphOrTitleOrName) return;
        var win = morphOrTitleOrName.isMorph && morphOrTitleOrName;
        if (!win) {
            win = this.findWindow(function(ea) { ea.getTitle() === morphOrTitleOrName; });
        }
        if (!win) {
            win = this.findWindow(function(ea) { ea.getName === morphOrTitleOrName; });
        }
        if (!win) return;
        win.comeForward();
    }
});

AsyncTestCase.subclass('users.robertkrahn.tests.WindowNavigation.WindowManager', lively.morphic.tests.TestCase.prototype,
'running', {
    setUp: function($super) {
        $super();
        this.createWorld();
        this.sut = new users.robertkrahn.WindowNavigation.WindowManager(this.world);
    }
},
'testing', {
    testGetListOfWindows: function() {
        this.world.addFramedMorph(lively.morphic.Morph.makeRectangle(0,0, 100, 100), 'A', pt(20, 20));
        this.world.addTextWindow({title: 'B', content: 'foo', position: pt(10,10)});
        var windows = this.sut.getWindows();
        this.assertEqualState(['A', 'B'], windows.invoke('getTitle'));
        this.done();
    },
    testSelectWindow: function() {
        this.world.addCodeEditor({title: 'A', content: 'foo', position: pt(10,10)});
        this.world.addCodeEditor({title: 'B', content: 'bar', position: pt(20,20)});
        var windows = this.sut.getWindows();
        this.assertEqualState(['A', 'B'], windows.invoke('getTitle'));
        this.delay(function() {
            this.sut.activate(windows[0]);
            this.assert(windows[0].targetMorph.isFocused(), 'code editor in window A not focused');
            this.sut.activate('B');
        }, 0);
        this.delay(function() {
            this.assert(windows[1].targetMorph.isFocused(), 'code editor in window B not focused');
            this.done();
        }, 50);
    }
});

}) // end of module