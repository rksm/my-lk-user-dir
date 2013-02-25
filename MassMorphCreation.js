module('users.robertkrahn.MassMorphCreation').requires('lively.morphic.tests.Morphic').toRun(function() {

Object.extend(Global, {
    OptimizedMorphCreator: {
        initShape: function(protoShape, newMorph, newCtx) {
            var newShape = newMorph.getShape();
            newShape.renderContextTable = protoShape.renderContextTable;
            newShape._renderContext = newCtx;
        },

        initNodes: function(morphNode, shapeNode, optTextNode, newCtx) {
            newCtx.morphNode = morphNode.cloneNode(true);
            newCtx.shapeNode = newCtx.morphNode.childNodes[0];
            if (optTextNode) {
                newCtx.textNode = optTextNode.cloneNode(true);
            }
        },

        prepareForNewRenderContextFunc: function(morph, shape, morphNode, shapeNode, optTextNode, ctx) {
            // this.setRenderContext(newCtx);
            this.renderContextTable = morph.renderContextTable;
            this._renderContext = ctx;

            // this.getShape().setRenderContext(newCtx);
            OptimizedMorphCreator.initShape(shape, this, ctx);

            // this.renderContextDispatch('init');
            OptimizedMorphCreator.initNodes(morphNode, shapeNode, optTextNode, ctx);

            // this.renderContextDispatch('append');
            // Not necessary if no owner

            // this.getShape().renderUsing(newCtx);
            // already done above

            // this.submorphs[i].prepareForNewRenderContext(newCtx.newForChild());
            // currently submorphs are not supported

            // this.registerForEvents(Config.handleOnCapture);
            this.registerForEvents(Config.handleOnCapture);

            // this.resumeStepping();
            // TODO

            // onLoad
            // TODO
        },

        nullRenderInstallerFor: function(obj) {
            var renderSelectors = Object.values(obj.renderContextTable),
                exceptions = ['getTextExtentHTML'],
                replacementInstallers = renderSelectors.collect(function(renderMethodSelector) {
                    if (exceptions.include(renderMethodSelector)) return null;
                    var klass = obj.constructor,
                        own = klass.prototype.hasOwnProperty(renderMethodSelector),
                        original = klass.prototype[renderMethodSelector],
                        replacementSpec = {};
                    replacementSpec.methodName = renderMethodSelector;
                    replacementSpec.klass = klass;
                    replacementSpec.installNop = function() {
                        klass.prototype[renderMethodSelector] = Functions.Null;
                    }
                    replacementSpec.clean = function() {
                        if (own) {
                            klass.prototype[renderMethodSelector] = original;
                        } else {
                            delete klass.prototype[renderMethodSelector];
                        }
                    }
                    return replacementSpec;
                }).select(function(ea) { return ea });
            return {
                install: function() {
                    replacementInstallers.invoke('installNop');
                },
                clean: function() {
                    replacementInstallers.invoke('clean');
                }
            }
        }
    }
});

// the unoptimized versions:
lively.morphic.Morph.createN = function(n, createFunc) {
    return Array.range(1, n).collect(createFunc);
}

// optimized:
lively.morphic.Morph.createN = function(n, createFunc) {
    var first = createFunc(),
        firstShape = first.getShape(),
        firstNode = first.renderContext().morphNode,
        firstShapeNode = first.renderContext().shapeNode,
        firstTextNode = first.renderContext().textNode,
        morphProto = lively.morphic.Morph.prototype,
        initRenderFunc = morphProto.prepareForNewRenderContext;

    if (first.owner) {
        throw new Error('createN currently does not work for morphs'
                        + 'having an owner');
    }
    if (first.submorphs.length) {
        throw new Error('createN currently does not work for morphs'
                        + 'having submorphs');
    }

    // replace prepareForNewRenderContext
    morphProto.prepareForNewRenderContext = function(ctx) {
        return OptimizedMorphCreator.prepareForNewRenderContextFunc.call(
            this, first, firstShape, firstNode, firstShapeNode, firstTextNode, ctx);
    };

    // replace render methods in shape and morph
    var morphNullRenderer = OptimizedMorphCreator.nullRenderInstallerFor(first),
        shapeNullRenderer = OptimizedMorphCreator.nullRenderInstallerFor(firstShape);
    morphNullRenderer.install();
    shapeNullRenderer.install();

    // // replace #defaultShape
    // var originalDefaultSHapeFunc = morphProto.defaultShape;
    // morphProto.defaultShape = function

    var morphs = new Array(n);
    morphs[0] = first;
    try {
        for (var i = 1; i < n; i++) {
            morphs[i] = createFunc();
        }
        return morphs;
    } finally {
        morphProto.prepareForNewRenderContext = initRenderFunc;
        morphNullRenderer.clean();
        shapeNullRenderer.clean();
    }
}


/*
 * -----
 * Tests
 * ------
 */

lively.morphic.tests.MorphTests.subclass('users.robertkrahn.MassMorphCreation.Test',
'running', {
    setUp: function($super) {
        $super();
    },
    tearDown: function($super) {
        $super();
    },
},
'testing', {
    test01CreateMultipleMorphsFunc: function() {
        var morphs = lively.morphic.Morph.createN(2, function() {
            var morph = lively.morphic.Morph.makeRectangle(0,0, 100, 100);
            morph.setFill(Color.red);
            return morph;
        });

        this.assertEquals(2, morphs.length, 'Not 2 morphs created');

        // morph and shape objects
        var m1 = morphs[0],
            shape1 = m1.getShape(),
            m2 = morphs[1],
            shape2 = m2.getShape();

        this.assert(m1 !== m2, 'morphs are identical?!');
        this.assert(shape1 !== shape2, 'shapes are identical?!');

        // morphic render state
        this.assertIdentity(m1.renderContext(), shape1.renderContext(), 'ctx 1');
        this.assertIdentity(m2.renderContext(), shape2.renderContext(), 'ctx 2');

        // DOM state
        var morphNode1 = m1.renderContext().morphNode,
            shapeNode1 = m1.renderContext().shapeNode,
            morphNode2 = m2.renderContext().morphNode,
            shapeNode2 = m2.renderContext().shapeNode;

        this.assert(morphNode1 !== morphNode2, 'morph nodes are identical?!');
        this.assert(shapeNode1 !== shapeNode2, 'morph nodes are identical?!');
        this.assert(shapeNode1.style !== shapeNode2, 'morph nodes are identical?!');

        this.assertEquals("rgb(204, 0, 0)", shapeNode1.style.backgroundColor,
                          'CSS color 1');

        this.assertEquals("rgb(204, 0, 0)", shapeNode2.style.backgroundColor,
                          'CSS color 2');
    }
});

}) // end of module