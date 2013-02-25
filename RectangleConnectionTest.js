module('users.robertkrahn.RectangleConnectionTest').requires('lively.TestFramework').toRun(function() {

TestCase.subclass('RectanglePositionTest',
'testing', {
    testTextIsUpdated: function() {
        var rectangle = $world.get('Rectangle'),
            text = $world.get('PositionText'),
            textStringBefore = text.textString;
        rectangle.moveBy(pt(10, 10));
        this.assert(textStringBefore !== text.textString,
            'textstring hasn\'t changed');
    }
});

}) // end of module