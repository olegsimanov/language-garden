let first   = true           // make sure we initialize everything only once
let app     = null;


function createApp(ctx, width, height) {

    if (first) {

        ctx.fillStyle               = "black";
        // ctx.font                = "200px language_garden_regular";
        // ctx.font                = "20px language_garden_regular";
        ctx.font                    = "80px language_garden_regular";
        // ctx.font                = "40px arial";

        app = App(ctx, width, height);
    }
    first = false;

    return app;

}


function App(ctx, width, height) {

    let app = {};

    // ---------------------------------------------------------------------------------------------------------------------
    // canvas to draw on
    // ---------------------------------------------------------------------------------------------------------------------

    app.width           = width;
    app.height          = height;
    app.ctx             = ctx;            // we use this to draw

    // ---------------------------------------------------------------------------------------------------------------------
    // graphical elements
    // ---------------------------------------------------------------------------------------------------------------------

    app.fixedLetters    = [];
    app.movableLetters  = [];

    app.allLetters = function() {
        return app.movableLetters.concat(app.fixedLetters);
    }

    app.separator       = null;


    app.createLetter = function(symbol, width, height, isTemplate) {

        return {

            symbol:             symbol,

            center:             { x: 0, y: 0 },
            width:              width,
            height:             height,
            rad:                0,
            font:               "80px language_garden_regular",

            boxPath:          new Path2D(),
            crossPath:          new Path2D(),

            isTemplate:         isTemplate,
            isHighlighted:      false,              // should have a frame
            isSelected:         false,              // should have a cross
            wasMoved:           false,

            moveBy: function(xDiff, yDiff) {

                this.center.x += xDiff;
                this.center.y += yDiff;

                this.plot();
                this.wasMoved = true;

            },

            moveTo: function(x, y) {

                this.center.x = x;
                this.center.y = y;

                this.plot();

            },

            rotateBy: function(angleIncrementInRad) {
                app.letterToBeEdited.rad += angleIncrementInRad;
            },

            draw: function(ctx) {

                this.drawName(ctx);
                this.drawMeta(ctx);

            },

            drawName: function(ctx) {

                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = "black";
                ctx.translate(this.center.x, this.center.y);
                ctx.rotate(this.rad);
                ctx.translate(-this.center.x, -this.center.y);
                ctx.fillText(this.symbol, this.center.x - width / 2, this.center.y + height / 2);
                ctx.closePath();
                ctx.restore();

            },

            drawMeta: function(ctx) {

                ctx.save();

                if (this.isHighlighted) {

                    ctx.strokeStyle = "red";
                    ctx.lineWidth = 1;
                    ctx.stroke(this.boxPath);

                }

                if (this.isSelected) {
                    if (!this.isTemplate) {
                        ctx.strokeStyle = "red";
                        ctx.stroke(this.crossPath);
                    }
                }

                ctx.restore();

            },

            plot: function() {

                this.plotSymbol();
                this.plotMeta();

            },

            plotSymbol: function() {

                // its left empty because I was not able to fina a way to
                // plot a letter using the Canvas API
                // this method is kept for semantic "symmetry"

            },

            plotBox: function () {

                const alpha = - this.rad;
                const beta  = app.degreeToRadian(90) - alpha ;
                const c     = this.width / 2;
                const cc    = this.height / 2;
                const a     = c * Math.sin(alpha);
                const b     = c * Math.sin(beta);
                const aa    = cc * Math.sin(alpha);
                const bb    = cc * Math.sin(beta);

                const zeroX = this.center.x;
                const zeroY = this.center.y;

                this.boxPath = new Path2D();

                // frame with rotation

                this.boxPath.moveTo(zeroX + aa, zeroY + bb);
                this.boxPath.lineTo(zeroX + b + aa, zeroY + bb - a);
                this.boxPath.lineTo(zeroX + b - aa, zeroY - bb - a);
                this.boxPath.lineTo(zeroX - b - aa, zeroY - bb + a)
                this.boxPath.lineTo(zeroX - b + aa, zeroY + bb + a);

                // frame without rotation

                // this.boxPath.moveTo(this.center.x, this.center.y);
                // this.boxPath.lineTo(this.center.x, this.center.y - this.height);
                // this.boxPath.lineTo(this.center.x + this.width, this.center.y - this.height);
                // this.boxPath.lineTo(this.center.x + this.width, this.center.y);

                this.boxPath.closePath();


            },


            plotCross: function () {

                const alpha = - this.rad;
                const beta  = app.degreeToRadian(90) - alpha ;
                // const c     = this.width / 2;
                const c     = this.width;
                // const cc    = this.height / 2;
                const cc    = this.height;
                const a     = c * Math.sin(alpha);
                const b     = c * Math.sin(beta);
                const aa    = cc * Math.sin(alpha);
                const bb    = cc * Math.sin(beta);

                const zeroX = this.center.x;
                const zeroY = this.center.y;

                this.crossPath = new Path2D();

                this.crossPath.moveTo(zeroX, zeroY);
                this.crossPath.lineTo(zeroX + aa, zeroY + bb);
                // this.crossPath.lineTo(zeroX + b + aa, zeroY + bb - a);
                // this.crossPath.lineTo(zeroX + b - aa, zeroY - bb - a);
                // this.crossPath.lineTo(zeroX - b - aa, zeroY - bb + a)
                // this.crossPath.lineTo(zeroX - b + aa, zeroY + bb + a);

                // this.crossPath.moveTo(this.center.x - 20, this.center.y - this.height / 2);
                // this.crossPath.lineTo(this.center.x + this.width + 20, this.center.y - this.height / 2);
                // this.crossPath.moveTo(this.center.x + this.width / 2, this.center.y - this.height - 20);
                // this.crossPath.lineTo(this.center.x + this.width / 2, this.center.y + 20);

                this.crossPath.closePath();

            },

            plotMeta: function() {

                this.plotBox();
                this.plotCross();

            },

            isMouseCursorOverMe: function(ctx, x, y) {

                return ctx.isPointInPath(this.boxPath, x, y)

            },

            isOverCross: function(ctx, x, y) {

                return ctx.isPointInStroke(this.crossPath, x, y);

            },

            triggerHighlight: function(isHighlighted) {
                this.isHighlighted = isHighlighted;
            }

        }
    }

    app.createSeparator = function(panelYOffset) {

        return {

            panelYOffset:           panelYOffset,
            path:                   new Path2D(),

            draw: function(ctx, width, height) {


                ctx.save();
                ctx.strokeStyle = "black";
                ctx.lineWidth = 1;

                ctx.stroke(this.path);
                ctx.restore();

            },

            calculateCoordinates: function(ctx, width, height) {

                this.path = new Path2D();
                this.path.moveTo(0, this.panelYOffset);
                this.path.lineTo(width, this.panelYOffset);
                this.path.lineTo(width, this.panelYOffset + 1);
                this.path.lineTo(0, this.panelYOffset + 1);
                this.path.closePath();

            },

            isBelow: function(letter) {

                return letter.y > panelYOffset;

            }


        }

    }

    app.calculateFixedLettersCoordinates = function(ctx, panelYOffset) {

        const gapBetweenLetters         = 5;
        const offsetFromTheTopBorder    = 10;
        let currentOffsetFromLeft       = 0;

        const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        for (let i = 0; i < alphabet.length; i++) {

            const symbol            = alphabet[i];
            const width             = ctx.measureText(symbol).width
            const height            = (ctx.measureText(symbol).fontBoundingBoxAscent + ctx.measureText(symbol).fontBoundingBoxDescent) / 2;
            currentOffsetFromLeft   += gapBetweenLetters;                                   // beginning of the letter
            let x                   = currentOffsetFromLeft + width / 2;                    // middle of the letter
            let y                   = panelYOffset + height + offsetFromTheTopBorder

            let letter = this.createLetter(symbol, width, height,true);
            letter.moveTo(x, y)
            this.fixedLetters.push(letter)

            currentOffsetFromLeft   += width;                                               // end of the letter

        }
    }

    app.calculateCoordinates = function (ctx, width, height) {

        this.separator.calculateCoordinates(ctx, width, height)
        this.calculateFixedLettersCoordinates(ctx, this.separator.panelYOffset);

    }

    app.redrawEverything = function (ctx, width, height) {

        console.log("redrawing...")
        ctx.clearRect(0, 0, width, height);
        if (app.aLetterIsBeingCreated()) {
            app.letterInCreation.draw(ctx);
        }
        this.separator.draw(ctx, width, height);
        this.fixedLetters.forEach(fl => fl.draw(ctx))
        this.movableLetters.forEach(ml => ml.draw(ctx))

    }

    // ---------------------------------------------------------------------------------------------------------------------
    // mouse handling logic
    // ---------------------------------------------------------------------------------------------------------------------

    app.mouseButtonIsDown   = false;
    app.mouse_X             = -1;
    app.mouse_Y             = -1;

    app.letterToBeEdited    = null;             // a selected letter can be either scaled or rotated
    app.letterInCreation    = null;             // special case where a new letter is being created

    app.mouseMove   = function(e) {

        if (app.isManipulatingObject()) {

            app.processObjectManipulation(e);

        } else {

            app.highlightObjectUnderMouseCursor(e);

        }

        app.redrawEverything(ctx, width, height);

        app.mouse_X = e.offsetX;
        app.mouse_Y = e.offsetY;

    }

    app.mouseButtonDown = function(e) {

        app.mouseButtonIsDown = true;

        const highlightedLetter = app.findHighlightedLetter();
        if (app.aLetterIsHighlighted(highlightedLetter)) {

            app.processMouseDownEventWithHighlightedLetter(highlightedLetter)

        }

        app.redrawEverything(ctx, width, height);
        console.log("mouseButton pressed")
    }

    app.processMouseDownEventWithHighlightedLetter = function(highlightedLetter) {

        if (highlightedLetter.isTemplate) {

            if (app.aLetterIsBeingEdited()) {
                app.letterToBeEdited.isSelected = false;
                app.letterToBeEdited = null;
            }

            highlightedLetter.triggerHighlight(false);
            app.letterInCreation = app.createLetter(highlightedLetter.symbol, highlightedLetter.width, highlightedLetter.height, false)
            app.letterInCreation.triggerHighlight(true);
            app.letterInCreation.moveTo(highlightedLetter.center.x, highlightedLetter.center.y);

        } else {

            if (app.aLetterIsBeingEdited()) {

                app.letterToBeEdited.isSelected = false;
                app.letterToBeEdited = null;

            }

        }

    }

    app.mouseButtonUp = function(e) {

        app.mouseButtonIsDown = false;
        if (app.aLetterIsBeingCreated()) {

            if (app.letterBeingCreatedWasMovedToMovableLetters()) {
                app.movableLetters.push(app.letterInCreation);
                app.letterInCreation.wasMoved = false;
                app.letterInCreation = null;
            }

        } else {

            const highlightedLetter = app.findHighlightedLetter();

            if (highlightedLetter !== undefined && highlightedLetter !== null) {

                app.processMouseUpEventWith(highlightedLetter);

            } else {

                app.processMouseUpEventWithoutHighlightedLetter(e)

            }


        }

        app.redrawEverything(ctx, width, height);
        console.log("mouseButton released")
    }

    app.processMouseUpEventWithoutHighlightedLetter = function(e) {

        if (app.aLetterIsBeingEdited()) {

            if (app.letterToBeEdited.wasMoved) {

                app.letterToBeEdited.wasMoved = false;

            } else {

                if (app.letterToBeEdited.isMouseCursorOverMe(ctx, e.offsetX, e.offsetY)) {
                    app.letterToBeEdited.isSelected = !app.letterToBeEdited.isSelected;
                    app.letterToBeEdited.isHighlighted = !app.letterToBeEdited.isHighlighted;
                    if (!app.letterToBeEdited.isSelected) {
                        app.letterToBeEdited = null;
                    }
                }

            }
        }

    }

    app.processMouseUpEventWith = function(highlightedLetter) {

        if (app.letterToBeEdited === undefined || app.letterToBeEdited === null) {

            if (highlightedLetter.wasMoved) {

                highlightedLetter.wasMoved = false;

            } else {

                app.letterToBeEdited = highlightedLetter;
                app.letterToBeEdited.isHighlighted = false;
                app.letterToBeEdited.isSelected = true;

            }

        } else {

            if (app.letterToBeEdited !== highlightedLetter) {

                app.letterToBeEdited.isSelected = false;
                app.letterToBeEdited.isHighlighted = false;
                app.letterToBeEdited = highlightedLetter;

            } else {

                if (app.letterToBeEdited.wasMoved) {
                    app.letterToBeEdited.wasMoved = false;
                } else {
                    if (app.letterToBeEdited.isMouseCursorOverMe(ctx, app.mouse_X, app.mouse_Y)) {
                        app.letterToBeEdited.isSelected = !app.letterToBeEdited.isSelected;
                        app.letterToBeEdited.isHighlighted = !app.letterToBeEdited.isHighlighted;
                        if (!app.letterToBeEdited.isSelected) {
                            app.letterToBeEdited = null;
                        }
                    }
                }

            }

        }

    }

    app.findHighlightedLetter = function() {

        return app.allLetters().find(l => l.isHighlighted)

    }

    app.findLetterToBeMoved = function(e) {

        if (app.letterInCreation !== null) {
            return app.letterInCreation;
        }

        const highlightedLetter = app.findHighlightedLetter()
        if (highlightedLetter !== null) {
            return highlightedLetter;
        }

        return null;

    }

    app.processObjectManipulation = function(e) {

        if (app.aLetterIsBeingEdited()) {

            let centerOfTheLetter_X = app.letterToBeEdited.center.x
            let centerOfTheLetter_Y = app.letterToBeEdited.center.y;
            const [new_to_prev_radians_diff, new_to_prev_radius_ratio] = app.getMouseRadiansAndRadiusDiff(centerOfTheLetter_X,
                centerOfTheLetter_Y, app.mouse_X, app.mouse_Y, e.offsetX, e.offsetY);
            app.letterToBeEdited.rotateBy(new_to_prev_radians_diff);
            app.letterToBeEdited.plot()

        } else {

            let letterToBeMoved = app.findLetterToBeMoved(e);
            if (letterToBeMoved !== undefined && letterToBeMoved !== null) {
                let xDiff = e.offsetX - app.mouse_X;
                let yDiff = e.offsetY - app.mouse_Y;
                letterToBeMoved.moveBy(xDiff, yDiff);
            }

        }

    }

    app.highlightObjectUnderMouseCursor = function(e) {

        app.allLetters().forEach(l => {

            let mouseCursorOverMe = l.isMouseCursorOverMe(ctx, e.offsetX, e.offsetY);
            if (mouseCursorOverMe) {

                if (l.isSelected) {

                    if (l.isOverCross(ctx, e.offsetX, e.offsetY)) {
                        ctx.canvas.style.cursor = "pointer";
                    } else {
                        ctx.canvas.style.cursor = "";
                    }

                }

                l.triggerHighlight(true);

            } else {

                l.triggerHighlight(false)

            }

        });

    }

    app.getMouseRadiansAndRadiusDiff = function (stableX, stableY, prev_mouse_X, prev_mouse_Y, newMouseX, newMouseY) {

        const prev_mouse_radius         = Math.sqrt(Math.abs(stableX - prev_mouse_X)    * Math.abs(stableX - prev_mouse_X)  + Math.abs(stableY - prev_mouse_Y)  * Math.abs(stableY - prev_mouse_Y))
        const new_mouse_radius          = Math.sqrt(Math.abs(stableX - newMouseX)       * Math.abs(stableX - newMouseX)     + Math.abs(stableY - newMouseY)     * Math.abs(stableY - newMouseY))
        const new_to_prev_radius_ratio  = new_mouse_radius / prev_mouse_radius;

        const prev_mouse_rads           = Math.asin((prev_mouse_Y - stableY) / prev_mouse_radius);
        const new_mouse_rads            = Math.asin((newMouseY - stableY) / new_mouse_radius);
        let new_to_prev_radians_diff  = new_mouse_rads - prev_mouse_rads;
        if (newMouseX < stableX) {
            new_to_prev_radians_diff *= -1;
        }

        return [ new_to_prev_radians_diff, new_to_prev_radius_ratio ] ;

    }

    app.isManipulatingObject = function() {
        return app.mouseButtonIsDown;
    }

    app.aLetterIsHighlighted = function(letterToTest) {
        return letterToTest !== undefined && letterToTest !== null;
    }

    app.aLetterIsBeingCreated = function() {

        return app.letterInCreation !== undefined && app.letterInCreation !== null

    }

    app.aLetterIsBeingEdited = function() {

        return app.letterToBeEdited !== undefined && app.letterToBeEdited !== null;

    }

    app.letterBeingCreatedWasMovedToMovableLetters = function() {

        return !app.separator.isBelow(app.letterInCreation);

    }

    app.mouseClick = function (e) {

    }

    // -------------------------------------------------------------------------------------------------------------
    // utility functions
    // -------------------------------------------------------------------------------------------------------------

    app.radianToDegree = function (radian) {
        return radian * 180 / Math.PI;
    }

    app.degreeToRadian = function(degree) {
        return degree * Math.PI / 180;
    }

    // -----------------------------------------------------------------------------------------------------------------------

    app.init = function() {

        this.separator = this.createSeparator(700);

        this.calculateCoordinates(ctx, width, height);
        this.redrawEverything(ctx, width, height);

    };


    app.init();


    return app;

}
