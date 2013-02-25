module('users.robertkrahn.Canvas').requires().toRun(function() {

function canvasFillFor(ourFill, graphicContext, bnds) {
    if (ourFill == null) return null;
    if (ourFill instanceof Color) return ourFill.toString();
    var grad = null;
    if (ourFill.isLinearGradient) {
        cv = bnds.scaleByRect(ourFill.vector ||  rect(pt(0.0,0.0),pt(0.0,1.0))/*lively.paint.LinearGradient.NorthSouth*/);
        grad = graphicContext.createLinearGradient(cv.x, cv.y, cv.maxX(), cv.maxY());
    }
    if (ourFill.isRadialGradient) {
        var c = bnds.center();
        var c0 = c.scaleBy(0.7).addPt(bnds.topLeft().scaleBy(0.3));
        grad = graphicContext.createRadialGradient(c0.x, c0.y, 0, c.x, c.y, bnds.width/2);
    }
    if (grad) {
        var stops = ourFill.stops;
        for (var i=0; i<stops.length; i++)
        grad.addColorStop(stops[i].offset(), this.canvasFillFor(stops[i].color()));
        return grad;
    }
    return null;
}

lively.morphic.Shapes.Shape.subclass('DrawingCanvasShape',
'settings', {

},
'initializing HTML', {
    initHTML: function($super, ctx) {
        if (!ctx.shapeNode) {
            ctx.shapeNode = this.createCanvasElementHTML(ctx);
        }
        $super(ctx);
    },
    renderHTML: function($super, ctx) {
        $super(ctx);
        this.blank();
        this.tryRestore();
    },
    createCanvasElementHTML: function(ctx)  {
        var domInterface = ctx.domInterface,
            canvasEl = domInterface.htmlCanvas();
        ctx.ctxt2d = canvasEl.getContext("2d");
        return canvasEl;
    },
    ctxt2d: function() {
        return this.renderContext().ctxt2d;
    },
    canvasElement: function() {
        return this.renderContext().shapeNode;
    }
},
'serialization', {
    doNotSerialize: ['imageData', 'restoreInProgress'],
    storeDataURL: function() {
        this.dataURL = this.renderContext().shapeNode.toDataURL("image/png");
    },
    restoreFromDataURL: function() {
        if (this.restoreInProgress) return;
        this.restoreInProgress = true;
        var img = new Image(),
            self = this;
        img.onload = function() { // happens async
            var ctx = self.renderContext();
            ctx.ctxt2d.width = img.width;
            ctx.ctxt2d.height = img.height;
            ctx.ctxt2d.drawImage(img, 0, 0);
            self.restoreInProgress = false;
            delete self.dataURL;
        };
        img.src = this.dataURL;
    },
    storeImageData: function() {
        var ctx = this.renderContext(),
            oldW = ctx.ctxt2d.canvas.width,
            oldH = ctx.ctxt2d.canvas.height,
            imgData = oldW && oldH && ctx.ctxt2d.getImageData(0,0, oldW,  oldH);
        this.imageData = imgData;
    },
    restoreFromImageData: function() {
        if (!this.imageData) return;
        var ctx = this.renderContext();
        ctx.ctxt2d.putImageData(this.imageData, 0, 0);
        delete this.imageData;
    },
    tryRestore: function() {
        if (this.dataURL) {
            this.restoreFromDataURL();
        } else if (this.imageData) {
            this.restoreFromImageData();
        }
    },
    onstore: function(persistentCopy) {
        this.storeDataURL();
        persistentCopy.dataURL = this.dataURL;
        delete this.dataURL;
    }
},
'accessing', {
    setExtentHTML: function($super, ctx, value) {
        var extent = $super(ctx, value),
            canvas = ctx.ctxt2d.canvas;
        if (canvas.width === value.x && canvas.height === value.y) {
            return extent;
        }
        this.storeImageData();
        ctx.ctxt2d.canvas.width = value.x;
        ctx.ctxt2d.canvas.height = value.y;
        this.blank();
        this.restoreFromImageData();
        return extent;
    },

    setFillHTML: function($super, ctx, value) {
        this.blank();
        return value;
    },

},
'canvas access', {
    blank: function() {
        var ctxt2d = this.renderContext().ctxt2d;
        ctxt2d.fillStyle = canvasFillFor(this.getFill());
        ctxt2d.fillRect(0, 0, ctxt2d.canvas.width, ctxt2d.canvas.height);
    },
    putColorAt: function(color, pos, thickness) {
        thickness = thickness || 1;
        var ctxt2d = this.renderContext().ctxt2d;
        ctxt2d.save();
        ctxt2d.fillStyle = canvasFillFor(color);
        ctxt2d.beginPath();
        ctxt2d.arc(pos.x, pos.y, thickness, 0, Math.PI*2, true);
        ctxt2d.closePath();
        ctxt2d.fill();
        ctxt2d.restore();
    },
    putImage: function(imageMorph, bounds) {
        var img = imageMorph.renderContext().imgNode,
            x = bounds.left(),
            y = bounds.top(),
            w = bounds.width,
            h = bounds.height,
            ctxt = this.ctxt2d();
        ctxt.save();
        ctxt.translate(x, y);
        ctxt.rotate(imageMorph.getRotation());
        ctxt.drawImage(img, 0, 0, w, h);
        ctxt.restore();
    }
})

lively.morphic.Morph.subclass('DrawingCanvasMorph',
'settings', {
    style: {enableGrabbing: false}
},
'initializing', {
    initialize: function($super, bounds) {
        var shape = new DrawingCanvasShape(bounds.extent().extentAsRectangle());
        $super(shape);
        this.setPosition(bounds.topLeft());
    },
    getGrabShadow: function() { return null }
},
'HTML specific', {
    removeHTML: function($super, ctx) {
        this.shape.storeImageData();
        $super(ctx);
    },
    onRenderFinishedHTML: function($super, ctx) {
        $super(ctx);
    }
},
'event handling', {
    onMouseMove: function($super, evt) {
        // when click on me that I draw funny pixels inside the image
        if (this.world().clickedOnMorph !== this) {
            return $super(evt);
        }
        var localPos = this.localize(evt.hand.getPosition());
        this.shape.putColorAt(this.penColor || Color.black, localPos, this.penSize || 3);
        return true;
    }
},
'morphic', {
    addMorph: function($super, morph, optMorphBefore) {
        if (morph.shape instanceof lively.morphic.Shapes.Image) {
            this.imageWasDropped(morph);
        }
        if (morph.previousOwner && morph.previousPosition) {
            morph.previousOwner.addMorph(morph);
            morph.setPosition(morph.previousPosition);
            return;
        }
        this.world().addMorph(morph);
    },

    imageWasDropped: function(image) {
        var tfm = image.transformForNewOwner(this),
            rect = tfm.transformRectToRect(image.innerBounds()),
            r = lively.morphic.Morph.makeRectangle(rect);
        this.drawImage(image, rect);
        // this.addMorph(r);
    }
},
'drawing interface', {
    setPenSize: function(size) { this.penSize = size },
    setPenColor: function(color) { this.penColor = color },
    drawImage: function(imageMorph, bounds) {
        this.shape.putImage(imageMorph, bounds);
    }
});

}) // end of module