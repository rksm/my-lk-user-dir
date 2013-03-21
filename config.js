module('users.robertkrahn.config').requires('lively.Traits').toRun(function() {

Object.extend(users.robertkrahn, {
    currentBaseURL: document.URL.toString().split('&#')[0],
    connectEmacs: function(optSwankhost) {
        // users.robertkrahn.connectEmacs();
        var swankhost = optSwankhost || localStorage.swankhost || 'localhost';
        window.swank_server = "http://" + swankhost + ":8009/";
        JSLoader.loadJs(window.swank_server + 'swank-js/swank-js-inject.js', function() {
            console.log("swank-js connected NOW!");
        });
        window.localStorage.lastActiveSwankURL = this.currentBaseURL;
    },
    reconnectEmacs: function() {
        if (window.localStorage.lastActiveSwankURL === this.currentBaseURL) {
            this.connectEmacs();
        }
    }
});

(function initEmacs () {
    users.robertkrahn.reconnectEmacs();
})();

(function loadAutocompletion() {
    // module('projects.ToolTabs.Autocompletion').load();
})();

(function loadAdvancedSyntaxHighlighting() {
    Config.set("advancedSyntaxHighlighting", true)
})();

(function setupShortcuts() {
    function modifySel(dir, select) {
        return function(morph) {
            var sel = morph.domSelection();
            sel && sel.modify(select ? 'extend' : 'move', dir, 'lineboundary');
            return true;
        }
    }

    require('lively.morphic.TextCore').toRun(function() {
        lively.morphic.Text.prototype.shortcutHandlers = [];
        var handler = new lively.morphic.Text.ShortcutHandler();
        handler.addBindings('<ctrl>+e', modifySel('right'),
                            '<ctrl>+a', modifySel('left'),
                            '<ctrl>+E', modifySel('right', true),
                            '<ctrl>+A', modifySel('left', true)//,
                            // '<ctrl>+q', function(text) { text.doVarDeclClean() }
        );
        lively.morphic.Text.prototype.shortcutHandlers.push(handler);

        // var handler = new lively.morphic.Text.ShortcutHandler();
        // handler.addBindings('<ctrl>+e', modifySel('right'));
        // lively.morphic.Text.prototype.shortcutHandlers.push(handler);
    });
})();


// menu extensions
Trait('users.robertkrahn.WorldMenuTrait', {

    robertsMenuItems: function() {
        return [
            ["Title", this.openPartItem.bind(this).curry('Title', 'PartsBin/Text')],
            ["Note", this.openPartItem.bind(this).curry('MetaNoteText', 'PartsBin/Text')],
            ["Todo list", this.openPartItem.bind(this).curry('TodoList', 'PartsBin/Productivity/')],
            ["Restack windows", this.restackMorphs.bind(this, function(ea) { return ea.isWindow; })],
            ["Restack SCBs", this.restackMorphs.bind(this, function(ea) {
                return ea.isWindow
                    && ea.targetMorph
                    && ea.targetMorph.ownerWidget
                    && ea.targetMorph.ownerWidget.isSystemBrowser; })]
        ];
    },

    morphMenuItems: function() {
        var items = this.constructor.prototype.morphMenuItems.apply(this),
            splicePos;
        items.detect(function(item, i) { splicePos = i; return item[0] === "Tools" });
        items.splice(splicePos, 0, ['Robert', this.robertsMenuItems()]);
        return items;
    },

    restackMorphs: function(filter) {
        var morphs = this.submorphs.select(filter),
            pos = this.visibleBounds().topLeft().addXY(40,40);
        morphs.inject(pos, function(pos, win) {
            win.setPosition(pos);
            return pos.addXY(30,30);
        })
    }

});

lively.whenLoaded(function() {
    Trait('users.robertkrahn.WorldMenuTrait').applyTo($world, {override: ['morphMenuItems']});

    $world.alertOK('Robert\'s user config loaded');
});

(function textSetup() {

Config.addOption("textDebugging", true,
                 "used in text impl to enable / disable debugging and warnings",
                 'lively.morphic.text');

Config.set("defaultCodeFontSize", 8);
// Config.set("aceDefaultTheme", "tomorrow_night");


Config.addOption("codeEditorUserKeySetup", function(codeEditor) {
    // var keyHandler = aceEditor.commands;
    var e = codeEditor.aceEditor, lkKeys = codeEditor;
    codeEditor.loadAceModule(["keybinding", 'ace/keyboard/emacs'], function(emacsKeys) {
//alert('running codeEditorUserKeySetup ' + emacsKeys.handler.commands.removeSelectionOrLine)

        e.setKeyboardHandler(emacsKeys.handler);
        var kbd = e.getKeyboardHandler();

        e.session.$useEmacsStyleLineStart = false;

        kbd.platform = 'mac';
        kbd.bindKeys({"C-x h": "selectall"})
        kbd.bindKeys({"C-x C-u": "touppercase"})
        kbd.bindKeys({"C-x C-l": "tolowercase"})
        
        // kbd.addCommands([{
        //     name: 'keyboardQuit',
        //         // exports.setMarkMode(null);
        // }]);
        function joinLine(ed) {
            var pos = ed.getCursorPosition(),
                rowString = ed.session.doc.getLine(pos.row),
                whitespaceMatch = rowString.match(/^\s*/),
                col = (whitespaceMatch && whitespaceMatch[0].length) || 0;
            ed.moveCursorToPosition({row: pos.row, column: col});
            ed.removeToLineStart();
            ed.remove('left');
        }
        
        kbd.addCommands([{
            name: 'joinLineAbove',
            bindKey: "C-c j",
            exec: joinLine,
            multiSelectAction: 'forEach',
            readOnly: false
        }, {
            name: 'joinLineBelow',
            bindKey: "C-c S-j",
            exec: function(ed) {
                ed.navigateDown();
                joinLine(ed);
            },
            multiSelectAction: 'forEach',
            readOnly: false
        }, {
            name: 'duplicateLine',
            bindKey: 'C-c p',
            exec: function(ed) { ed.execCommand('copylinesdown'); },
            multiSelectAction: 'forEach',
            readOnly: false
        }, {
            name: "movelinesup",
            bindKey: {win: "M-Up", mac: "C-CMD-Up"},
            exec: function(editor) { editor.moveLinesUp(); }
        }, {
            name: "movelinesdown",
            bindKey: {win: "M-Down", mac: "C-CMD-Down"},
            exec: function(editor) { editor.moveLinesDown(); }
        }]);


        // kbd.addCommand({name: 'doit', exec: lkKeys.doit.bind(lkKeys, false) });
        // kbd.addCommand({name: 'printit', exec: lkKeys.doit.bind(lkKeys, true)});
        // kbd.addCommand({name: 'doListProtocol', exec: lkKeys.doListProtocol.bind(lkKeys)});
        // kbd.bindKeys({"s-d": 'doit', "s-p": 'printit', "S-s-p": 'doListProtocol'});
    });
});

})();
}) // end of module