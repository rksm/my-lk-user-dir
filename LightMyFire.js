module('robert.LightMyFire').requires().toRun(function() {

if (!Config.isNewMorphic) return;

if (!Global.localStorage) return;

if (localStorage.lightMyFire && localStorage.lightMyFire >= 1) return;

require('lively.morphic.Core').toRun(function() {

    if (!localStorage.lightMyFire) localStorage.lightMyFire = 0;
    localStorage.lightMyFire++;

    var embedder = {
        lightMyFire: function() {
            var iFrame = lively.morphic.World.loadInIFrame('http://www.youtube.com/embed/flOvM4Z355A?rel=0&amp;autoplay=1')
            iFrame.openInWorld(pt(0,2000))
            iFrame.setVisible.bind(iFrame).curry(false).delay(1);
            iFrame.isEpiMorph = true; // no serialization
            iFrame.ignoreEvents();
        }
    }
    lively.bindings.callWhenNotNull(lively.morphic.World, 'currentWorld', embedder, 'lightMyFire');
})

}) // end of module