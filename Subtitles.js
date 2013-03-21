module('users.robertkrahn.Subtitles').requires('cop.Layers', 'lively.morphic').toRun(function() {

cop.create('SubTitleLayer')
.refineClass(lively.morphic.World, {

    get doNotSerialize() { return cop.proceed().concat('subtitleMorph') },
    get showSubtitles() { return true },

    onKeyDown: function(evt) {
        if (!this.showSubtitles) return cop.proceed();
        var keysPressed = Event.pressedKeyString(evt),
            next = (keysPressed === 'Command-F2')
                || (this.isFocused() && keysPressed === 'Space'),
            prev = (keysPressed === 'Command-F1');
        if (!next && !prev) return cop.proceed(evt);
        prev && this.decSubtitlePos();
        next && this.incSubtitlePos();
        this.showCurrentSubtitle();
        evt.stop();
        return true;
    },

    incSubtitlePos: function() {
        this.subtitlePos = (this.subtitlePos + 1) % (this.getSubtitles().length || 1);
    },

    decSubtitlePos: function() {
        this.subtitlePos = Math.max(this.subtitlePos - 1, 0);
    },

    getSubtitlePos: function() {
        return this.subtitlePos = this.subtitlePos || 0;
    },

    getSubtitles: function() {
        var text = this.get('subtitles'),
            subtitles = text && text.textString.split('\n');
        return subtitles || [];
    },

    getSubtitleCenter: function() {
        var b = this.visibleBounds();
        return pt(b.center().x, b.height - 200);
    },

    showCurrentSubtitle: function() {
        if (!this.subtitleMorph) {
            this.subtitleMorph = new lively.morphic.Text(lively.rect(0,0, 900, 20));
            // styling the subtitles
            var style = {borderWidth: 0, fontSize: 32, fill: null, fixedHeight: false, fixedWidth: true};
            if (this.get('subtitleStyle')) {
                try {
                    var s = '(' + this.get('subtitleStyle').textString + ')';
                    style = Object.extend(style, eval(s))
                } catch(e) { alert(e) /*fail silently*/ }
            }
            this.subtitleMorph.applyStyle(style);
        };

        this.subtitleMorph.fit();

        var subtitle = this.getSubtitles()[this.getSubtitlePos()];
        if (subtitle == '') {
            this.subtitleMorph.dissolve(400);
        } else {
            this.subtitleMorph.appear(400, this)
        }
        if (subtitle && subtitle != '') this.subtitleMorph.setTextString(subtitle);

        this.subtitleMorph.setExtent(this.subtitleMorph.getTextExtent())

        var offset = pt(20, -40),
            frame = this.get('videoFrame') ? this.get('videoFrame').bounds() : this.visibleBounds();
        this.subtitleMorph.setExtent(this.subtitleMorph.getExtent().withX(frame.width - 2*offset.x));
        this.subtitleMorph.align(
            this.subtitleMorph.bounds().bottomCenter(),
            frame.bottomCenter().addXY(0, offset.y));
    },

})
.beGlobal();
cop.create('ShowKeysLayer')
.refineClass(lively.morphic.World, {
    onKeyDown: function(evt) {
        var keyMorph = this.get('keys'), showKeys = !!keyMorph;
        if (showKeys) {
            var keys = Event.pressedKeyString(evt, {
                ignoreModifiersIfNoCombo: true,
                ignoreKeys: ['Command-F1', 'Command-F2']
            });
            if (keys) {
                keyMorph.textString = keys;
                // keyMorph = that
                keyMorph.addStyleClassName('pressed');
                (function() {
                    keyMorph.removeStyleClassName('pressed');
                }).delay(.3);
            } else {
                keyMorph.textString = '';
            }
            keyMorph.fit();
        }
        return cop.proceed(evt);
    }
})
.beGlobal();

}) // end of module
