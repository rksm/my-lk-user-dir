module('users.robertkrahn.config').requires('lively.Traits').toRun(function() {

Config.set('maxStatusMessages', 10);


Trait('users.robertkrahn.CodeEditorRememberTrait', {
    codeEditorMenuItems: function () {
        var items = lively.ide.CodeEditor.prototype.codeEditorMenuItems.call(this),
            editor = this;
        // remember
        var rememberItems = ['Remember...', []];
        items.push(rememberItems);

        var snippets;
        function getSnippets() {
            if (snippets) return snippets;
            return snippets = JSON.parse(localStorage.robertsSnippets = localStorage.robertsSnippets || '{}');
        }

        function saveSnippet(name, content) {
            getSnippets();
            snippets[name] = content;
            localStorage.robertsSnippets = JSON.stringify(snippets);
        }

        rememberItems[1].push(['Remember snippet', function() {
            $world.prompt('Name for snippet?', function(input) {
                if (!input) { show('snippet not saved'); return }
                var name = input.replace(/[\s\\\/]+/g, '-');
                saveSnippet(name, range.isEmpty() ? editor.textString : this.getTextRange(range));
            })
            var range = editor.getSelectionRangeAce()
            self.addEvalMarker();
        }]);

        return items;
    }

});


(function setupRememeber() {
})();

(function setupDebuggingStuff() {
return;
    lively.whenLoaded(function(world) {
        world.addScript(function onBlur(evt) {
            // clearInterval(this.checkFocusInterval);
            // delete this.checkFocusInterval;
            $super(evt);
            var world = this;
            if (this.checkFocusInterval) return;
            this.checkFocusInterval = setInterval(function() {
                if (!lively.morphic.Morph.focusedMorph()) {
                    show('no morphs focused!');
                    world.focus();
                } else {
                    clearInterval(world.checkFocusInterval);
                    delete world.checkFocusInterval;
                }
            }, 1000);
        });
    });
})();

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
            pos = this.hands[0].getPosition();
        morphs.inject(pos, function(pos, win) {
            win.setPosition(pos);
            return pos.addXY(30,30);
        })
    }

});

(function setupServerSearch() {
    module('lively.ide.CommandLineInterface').load();
    Global.$search = function(string, optPathOrModule, thenDoOrMarker) {
        var path = Object.isString(optPathOrModule) ? optPathOrModule : 'lively';
        path = path.replace(/\./g, '/');
        var cmd = Strings.format("find %s -iname '*js' -exec grep -inH %s '{}' \\; ",
            '$WORKSPACE_LK/core/' + path,
            string);
        // var cmd = 'grep -nR ' + string + ' $WORKSPACE_LK/core/' + path + '/*.js';
        var thenDo = Object.isFunction(thenDoOrMarker) && thenDoOrMarker;
        var marker = !thenDo && thenDoOrMarker;
        var focused = lively.morphic.Morph.focusedMorph();
        var codeEditor = focused instanceof lively.morphic.CodeEditor && focused;
        lively.shell.exec(cmd, function(r) {
            var out = r.getStdout().split('\n')
                .map(function(line) { return line.slice(line.indexOf('/core') + 6); })
                .join('\n');
            if (out.length === 0) out = 'nothing found;'
            if (marker) { marker.textString = out }
            else if (focused) {
                focused.printObject(null, out);
            }
            thenDo && thenDo(out);
        });
        return '';
    }

    Global.doBrowseAtPointOrRegion = function(codeEditor) {
        try { 
            var str = codeEditor.getSelectionOrLineString(),
                spec = extractBrowseRefFromGrepLine(str);
            if (!spec) {
                show("cannot extract browse ref from %s", str);
            } else {
                doBrowse(spec);
            }
        } catch(e) {
            show('failure in doBrowseAtPointOrRegion: %s', e.stack);
        }
        function getCurrentBrowser(spec) {
            var focused = lively.morphic.Morph.focusedMorph(),
                win = focused && focused.getWindow(),
                widget = win && win.targetMorph.ownerWidget,
                browser = widget && widget.isSystemBrowser ? widget : null;
            return browser;
        }
        function doBrowse(spec) {
            var modWrapper =lively.ide.sourceDB().addModule(spec.fileName),
                fFragment = modWrapper.ast().getSubElementAtLine(spec.line, 20/*depth*/);
            fFragment && fFragment.browseIt(getCurrentBrowser())
        }
        function extractBrowseRefFromGrepLine(line) {
            // extractBrowseRefFromGrepLine("lively/morphic/HTML.js:235:    foo")
            // = {fileName: "lively/morphic/HTML.js", line: 235}
            var fileMatch = line.match(/((?:[^\/\s]+\/)*[^\.]+\.[^:]+):([0-9]+)/);
            return fileMatch ? {fileName: fileMatch[1], line: Number(fileMatch[2])} : null;
        }
    }
})();

lively.whenLoaded(function() {
    Trait('users.robertkrahn.WorldMenuTrait').applyTo($world, {override: ['morphMenuItems']});

    $world.alertOK('Robert\'s user config loaded');
});

(function textSetup() {

Config.addOption("textDebugging", true,
                 "used in text impl to enable / disable debugging and warnings",
                 'lively.morphic.text');

Config.set("defaultCodeFontSize", 12);
Config.set("aceDefaultTheme", "chrome");
Config.addOption("aceWorkspaceTheme", "twilight");
Config.set("aceWorkspaceTheme", "twilight");
Config.set("aceDefaultLineWrapping", false);

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

function setupEmacsKeyboardHandler(editor, handler) {
    if (editor.getKeyboardHandler() !== handler)
        editor.keyBinding.addKeyboardHandler(handler);
    editor.session.$useEmacsStyleLineStart = false;
    handler.platform = 'mac';


    // debugging:
    handler.handleKeyboard = handler.handleKeyboard.getOriginal();
    // handler.handleKeyboard = handler.handleKeyboard.getOriginal().wrap(function(proceed, data, hashId, key, keyCode) {
    //     // show(data.keyChain);
    //     // disconnect(data, 'keyChain', Global, 'show', {
    //     //     updater: function($upd, val) { keyChains.push(val); $upd(val) },
    //     //     varMapping: {keyChains: keyChains}
    //     // });
    // // var keyChainEnter = data.keyChain.length > 0 && data.keyChain;
    // // if (keyChainEnter) debugger
    // show("data %s, hashId %s, key %s, keyCode %s", data, hashId, key, keyCode);
    // var result = proceed(data, hashId, key, keyCode);
    // // var keyChainExit = data.keyChain.length > 0 && data.keyChain;
    // // (keyChainExit || keyChainEnter) && show("keyChain enter: %s, exit: %s, command: %o",
    //     // keyChainEnter, keyChainExit, result);
    //     // show("%s -> %o", data.keyChain, result)
    //     return result;
    // });
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

setupIyGoToChar = function setupIyGoToChar(keyboardHandler) {
    var debug = false;
    function iyGoToChar(editor, options) {
        var HashHandler = lively.ide.ace.require("ace/keyboard/hash_handler").HashHandler,
            iyGoToCharHandler = new HashHandler();

        iyGoToCharHandler.handleKeyboard = function(data, hashId, key, keyCode) {
            // first invocation: if a key is pressed remember this char as the char
            // to search for
            // subsequent invocations: when the same char is pressed, move to the
            // next found location of that char, other wise deactivate this mode

            // shift key or raw event
            if (hashId === 0 || hashId === 4) return {command: 'null', passEvent: true};
            if (!this.charToFind) {
                if (key && hashId === -1) {
                    this.charToFind = key;
                } else {
                    editor.keyBinding.removeKeyboardHandler(this);
                    return null;
                }
            }
            if (key !== this.charToFind) {
                debug && show('input was %s and not %s, exiting', key, this.charToFind);
                editor.keyBinding.removeKeyboardHandler(this);
                return null;
            }
            return {
                command: iyGoToCharHandler.commands.moveForwardTo,
                args: {backwards: options.backwards, needle: key, preventScroll: true, wrap: false}};
        }

        iyGoToCharHandler.attach = function(editor) {
            debug && show('iygotochar installed');
            this.$startPos = editor.getCursorPosition();
        }
        iyGoToCharHandler.detach = function(editor) {
            debug && show('iygotochar uninstalled');
            if (this.$startPos && editor.pushEmacsMark) editor.pushEmacsMark(this.$startPos, false);
        }

        iyGoToCharHandler.addCommands([{
            name: 'moveForwardTo',
            exec: function(ed, options) {
                var sel = ed.selection,
                    range = sel.getRange();
                if (options.backwards) sel.moveCursorLeft();
                options.start = sel.getSelectionLead();
                var foundRange = ed.find(options);
                if (!foundRange) {
                    if (options.backwards) sel.moveCursorRight();
                    return;
                }
                ed.selection.moveCursorToPosition(foundRange.end);
            }
        }]);
        editor.keyBinding.addKeyboardHandler(iyGoToCharHandler);
    }

    keyboardHandler.addCommands([{name: 'iyGoToChar', exec: iyGoToChar}]);
    keyboardHandler.bindKeys({"CMD-.": {command: 'iyGoToChar', args: {backwards: false}}});
    keyboardHandler.bindKeys({"CMD-,": {command: 'iyGoToChar', args: {backwards: true}}});
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

Config.addOption("codeEditorUserKeySetup", function(codeEditor) {
    var e = codeEditor.aceEditor, lkKeys = codeEditor;
    // if (codeEditor.hasRobertsKeys) return;
    codeEditor.loadAceModule(["keybinding", 'ace/keyboard/emacs'], function(emacsKeys) {
        codeEditor.hasRobertsKeys = true;
        setupEmacsKeyboardHandler(e, emacsKeys.handler);
        var kbd = emacsKeys.handler;

        // ------------------
        // key command setup
        // ------------------
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
            name: 'markword',
            exec: function(ed) {
                var sel = ed.selection;
                var range = sel.getRange();
                ed.moveCursorToPosition(range.end);
                sel.moveCursorWordRight();
                range.setEnd(sel.lead.row, sel.lead.column);
                // sel.selectToPosition(range.start);
                sel.setRange(range, true);
                // sel.setRange(ace.require('ace/range').Range.fromPoints(range.start, sel.lead), true);
            },
            multiSelectAction: 'forEach',
            readOnly: false
        }, {
            name: 'jumpToMark',
            exec: function(ed) {
                var sel = ed.selection;
                var p = sel.isEmpty() ? ed.getLastEmacsMark() : sel.anchor;
                p && ed.moveCursorToPosition(p);
            },
            readOnly: true
        }, {
            name: 'pushMark',
            exec: function(ed) {
                ed.pushEmacsMark(ed.getCursorPosition());
            },
            readOnly: true
        }, {
            name: 'moveCursorUpwardQuickly',
            exec: function(ed) {
                var currentPos = ed.getCursorPosition(),
                    firstRow = ed.renderer.getFirstFullyVisibleRow(),
                    lastRow = ed.renderer.getLastFullyVisibleRow(),
                    middleRow = firstRow+Math.floor((lastRow - firstRow)/2);
                if (currentPos.row <= firstRow) return;
                newPos = currentPos;
                if (currentPos.row <= middleRow) newPos.row = firstRow;
                else if (currentPos.row <= lastRow) newPos.row = middleRow;
                else newPos.row = lastRow;
                ed.selection.moveCursorToPosition(newPos)
            },
            readOnly: true
        }, {
            name: 'moveCursorDownwardQuickly',
            exec: function(ed) {
                var currentPos = ed.getCursorPosition(),
                    firstRow = ed.renderer.getFirstFullyVisibleRow(),
                    lastRow = ed.renderer.getLastFullyVisibleRow(),
                    middleRow = firstRow+Math.floor((lastRow - firstRow)/2);
                newPos = currentPos;
                if (currentPos.row < firstRow) newPos.row = firstRow;
                else if (currentPos.row < middleRow) newPos.row = middleRow;
                else if (currentPos.row < lastRow) newPos.row = lastRow;
                else return;
                ed.selection.moveCursorToPosition(newPos);
            },
            readOnly: true
        }, {
            name: 'joinLineAbove',
            exec: joinLine,
            multiSelectAction: 'forEach',
            readOnly: false
        }, {
            name: 'joinLineBelow',
            exec: function(ed) {
                ed.navigateDown();
                joinLine(ed);
            },
            multiSelectAction: 'forEach',
            readOnly: false
        }, {
            name: 'duplicateLine',
            exec: function(ed) { ed.execCommand('copylinesdown'); },
            multiSelectAction: 'forEach',
            readOnly: false
        }, {
            name: "movelinesup",
            exec: function(editor) { editor.moveLinesUp(); }
        }, {
            name: "movelinesdown",
            exec: function(editor) { editor.moveLinesDown(); }
        }, {
            name: "toggletruncatelines",
            exec: function(editor) {
                var lineWrapping = !codeEditor.getLineWrapping();
                show("Truncating lines %s", lineWrapping ? "enabled" : 'disabled');
                codeEditor.setLineWrapping(lineWrapping);
            }
        }, {
            name: "stringifySelection",
            exec: function(editor) {
                var sel = editor.selection;
                if (!sel || sel.isEmpty()) return;
                var range =  editor.getSelectionRange(),
                    selString = editor.session.getTextRange(range),
                    stringified = selString
                        .split('\n')
                        .invoke('replace' ,/"/g, '\\"')
                        .invoke('replace' ,/(.+)/g, '"$1\\n"')
                        .join('\n+ ');
                editor.session.doc.replace(range, stringified);
            }
        }, {
            name: "openDiffer",
            exec: function(editor) {
                require('lively.ide.tools.Differ').toRun(function() {
                    var differ = lively.BuildSpec('lively.ide.tools.Differ').createMorph().openInWorld();
                    differ.setPositionCentered($world.visibleBounds().center());
                    differ.comeForward();
                });
            }
        }, {
            name: "printinspect",
            exec: function(editor, args) {
                inspect(args)
                // show("xxx%s", );
            },
            multiSelectAction: 'forEach'
        }, {
            name: 'doBrowseAtPointOrRegion',
            exec: function(editor) {
                doBrowseAtPointOrRegion(codeEditor);
            },
            multiSelectAction: 'forEach'
        }, {
           name: "dividercomment",
           exec: function(editor) {
               editor.insert("-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-");
               editor.toggleCommentLines();
            }
        }, {
            name: "runtests",
            exec: function(ed) {
                // hack: get currently active system browser and do "run test command"
                var win = $world.getActiveWindow();
                var focus = $world.focusedMorph();
                var browser = win && win.targetMorph && win.targetMorph.ownerWidget;
                if (!browser || !browser.isSystemBrowser) {
                    alert('Currently not in a SCB!');
                    return;
                }
                var cmd = new lively.ide.RunTestMethodCommand(browser);
                if (!cmd.isActive()) {
                    alert('Not in a test method or class!');
                    return;
                }
                cmd.runTest();
                focus.focus();
            }
        }, {
            name: "toogleSCBSizing",
            exec: function(ed) {
                // hack: get currently active system browser and do "run test command"
                var win = $world.getActiveWindow(),
                    focus = $world.focusedMorph(),
                    browser = win && win.targetMorph && win.targetMorph.ownerWidget;
                if (!browser || !browser.isSystemBrowser) {
                    alert('Currently not in a SCB!'); return; }
                var div = win.targetMorph.midResizer,
                    ratio = div.getRelativeDivide(),
                    newRatio = ratio <= 0.2 ? 0.45 : 0.2;
                div.divideRelativeToParent(newRatio);
            }
        }, {
            name: "resizeWindow",
            exec: function(ed, how) {
                var bounds = $world.visibleBounds().insetBy(20);
                var win = $world.getActiveWindow();
                if (!win) return;
                switch(how) {
                    case 'fullscreen': break;
                    case 'right': bounds = bounds.withX(bounds.x + bounds.width/2);
                    case 'left': bounds = bounds.withWidth(bounds.width/2); break;
                    case 'bottom': bounds = bounds.withY(bounds.y + bounds.height/2);
                    case 'top': bounds = bounds.withHeight(bounds.height/2); break;
                    case 'small': bounds = win.normalBounds || pt(500,400).extentAsRectangle().withCenter(bounds.center()); break;
                    default: return;
                }
                if (how === 'small') {
                    delete win.normalBounds;
                } else if (!win.normalBounds) {
                    win.normalBounds = win.bounds();
                }
                win.setBounds(bounds);
            }
        }, {
            name: "describeKey",
            exec: function(ed) {
                function uninstall() {
                    commandExecHandler && ed.commands.removeEventListener('exec', commandExecHandler);
                    ed.keyBinding.$callKeyboardHandlers = ed.keyBinding.$callKeyboardHandlers.getOriginal();
                }
                var origCallKeyboardHandlers = ed.keyBinding.$callKeyboardHandlers,
                    lastKeys = [],
                    commandExecHandler = ed.commands.addEventListener('exec', function(e) {
                        uninstall();
                        e.stopPropagation();
                        e.preventDefault();
                        show('%s: %o', lastKeys.join(' '), e.command);
                        return true;
                    });
                ed.keyBinding.$callKeyboardHandlers = ed.keyBinding.$callKeyboardHandlers.wrap(function(proceed, hashId, keyString, keyCode, e) {
                    if (e) {
                        lively.morphic.EventHandler.prototype.patchEvent(e);
                        lastKeys.push(e.getKeyString({ignoreModifiersIfNoCombo: true}));
                    }
                    return proceed(hashId, keyString, keyCode, e);
                });
            }
        },
        // commandline
        {
            name: 'returnorcommandlineinput',
            exec: function(ed) {
                if (!codeEditor.isCommandLine) { ed.insert("\n"); return; }
                codeEditor.commandLineInput && codeEditor.commandLineInput(ed.getValue());
            }
        }]);

        kbd.bindKeys({"S-CMD-l r e s f": {command: "resizeWindow", args: 'fullscreen'}});
        kbd.bindKeys({"S-CMD-l r e s l": {command: "resizeWindow", args: 'left'}});
        kbd.bindKeys({"S-CMD-l r e s r": {command: "resizeWindow", args: 'right'}});
        kbd.bindKeys({"S-CMD-l r e s t": {command: "resizeWindow", args: 'top'}});
        kbd.bindKeys({"S-CMD-l r e s b": {command: "resizeWindow", args: 'bottom'}});
        kbd.bindKeys({"S-CMD-l r e s s": {command: "resizeWindow", args: 'small'}});

        kbd.bindKeys({"CMD-1": "pushMark"});
        kbd.bindKeys({"CMD-2": "jumpToMark"});
        kbd.bindKeys({"S-M-2": "markword"});

        kbd.bindKeys({"C-Up": "moveCursorUpwardQuickly"});
        kbd.bindKeys({"C-Down": "moveCursorDownwardQuickly"});

        kbd.bindKeys({"C-x C-u": "touppercase"});
        kbd.bindKeys({"C-x C-l": "tolowercase"});

        // lines
        kbd.bindKeys({"C-M-P": "addCursorAbove"});
        kbd.bindKeys({"C-M-N": "addCursorBelow"});
        kbd.bindKeys({"C-CMD-Up": "movelinesup"});
        kbd.bindKeys({"C-CMD-P": "movelinesup"});
        kbd.bindKeys({"C-CMD-Down": "movelinesdown"});
        kbd.bindKeys({"C-CMD-N": "movelinesdown"});
        kbd.bindKeys({"C-c j": "joinLineAbove"});
        kbd.bindKeys({"C-c S-j": "joinLineBelow"});
        kbd.bindKeys({'C-c p': "duplicateLine"});

        kbd.bindKeys({"S-CMD-l j s s t r": "stringifySelection"});
        kbd.bindKeys({"S-CMD-l d i f f": "openDiffer"});

        // SCb
        kbd.bindKeys({'C-c C-t': "runtests"});
        kbd.bindKeys({'S-F6': "toogleSCBSizing"});

        kbd.bindKeys({"M-.": "doBrowseAtPointOrRegion"});
        kbd.bindKeys({"S-CMD-l S-g": "doBrowseImplementors"});
        kbd.bindKeys({"S-CMD-l g": "doBrowseImplementors"});

        kbd.bindKeys({"S-CMD-l l t": "toggletruncatelines"});

        kbd.bindKeys({"S-CMD-l / d": "dividercomment"});

        // evaluation
        kbd.bindKeys({"C-x C-e": "printit"});
        // kbd.bindKeys({"CMD-i": "printinspect"});

        kbd.bindKeys({"C-h k": "describeKey"});

        kbd.bindKeys({"C-x h": "selectall"});
        kbd.bindKeys({"CMD-f": 'moveForwardToMatching'});
        kbd.bindKeys({"CMD-b": 'moveBackwardToMatching'});
        kbd.bindKeys({"S-CMD-f": 'selectToMatchingForward'});
        kbd.bindKeys({"S-CMD-b": 'selectToMatchingBackward'});

        kbd.bindKeys({"Return": 'returnorcommandlineinput'})

        setupIyGoToChar(kbd);
    });
});

})();
}) // end of module
