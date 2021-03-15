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

    app.separator       = null;


    app.createLetter = function(symbol, isTemplate) {

        return {

            symbol:             symbol,

            middleOfTheLetterX: 0,
            middleOfTheLetterY: 0,
            rad:                0,
            font:               "80px language_garden_regular",

            isTemplate:         isTemplate,
            isHighlighted:      false,              // should have a frame
            isSelected:         false,              // should have a cross
            wasMoved:           false,

            moveBy: function(xDiff, yDiff) {

                this.middleOfTheLetterX += xDiff;
                this.middleOfTheLetterY += yDiff;

                this.wasMoved = true;

            },

            moveTo: function(x, y) {

                this.middleOfTheLetterX = x;
                this.middleOfTheLetterY = y;

            },

            getDetailsForContext: function(ctx) {

                ctx.font      = this.font;
                const width   = ctx.measureText(symbol).width     // SHOULD BE TAKEN AFTER PROPER FONT IT SELECTED!
                const height  = (ctx.measureText(symbol).fontBoundingBoxAscent + ctx.measureText(symbol).fontBoundingBoxDescent) / 2 * 1.29;

                const leftBottom_X       = Math.round(this.middleOfTheLetterX - width / 2);
                const leftBottom_Y       = Math.round(this.middleOfTheLetterY + height / 2);

                return { leftBottom_X, leftBottom_Y, width, height }

            },

            draw: function(ctx) {

                ctx.save();

                ctx.font        = this.font;

                const details   = this.getDetailsForContext(ctx);

                // -------------------------------------------------------------------------------------------------------------
                // draw rotated letter
                // -------------------------------------------------------------------------------------------------------------

                ctx.translate(this.middleOfTheLetterX, this.middleOfTheLetterY);
                ctx.rotate(this.rad);
                ctx.translate(-this.middleOfTheLetterX, -this.middleOfTheLetterY);

                this.drawRotatedLetter(symbol, this.middleOfTheLetterX, this.middleOfTheLetterY, this.rad, details.leftBottom_X, details.leftBottom_Y);
                this.drawRotatedLetterBox(this.middleOfTheLetterX, this.middleOfTheLetterY, this.rad, details.leftBottom_X, details.leftBottom_Y, details.width, details.height);
                this.drawRotatedCross(this.middleOfTheLetterX, this.middleOfTheLetterY, this.rad, details.leftBottom_X, details.leftBottom_Y, details.width, details.height);

                ctx.restore();

                // this.drawLetterMetadata(startOfTheLetterX, startOfTheLetterY, letterWidth, letterHeight, this.rad);

            },

            drawRotatedLetter: function(symbol, middleOfTheLetterX, middleOfTheLetterY, rad, startOfTheLetterX, startOfTheLetterY) {

                ctx.beginPath();
                ctx.strokeStyle = "red"
                ctx.fillText(symbol, startOfTheLetterX, startOfTheLetterY);

            },

            drawRotatedLetterBox: function (middleOfTheLetterX, middleOfTheLetterY, rad, startOfTheLetterX, startOfTheLetterY, letterWidth, letterHeight) {

                ctx.beginPath();
                // ctx.strokeStyle = "green";
                ctx.moveTo(startOfTheLetterX, startOfTheLetterY);
                ctx.lineTo(startOfTheLetterX + letterWidth, startOfTheLetterY);
                ctx.lineTo(startOfTheLetterX + letterWidth, startOfTheLetterY - letterHeight);
                ctx.lineTo(startOfTheLetterX, startOfTheLetterY - letterHeight);
                ctx.lineTo(startOfTheLetterX, startOfTheLetterY);
                ctx.closePath();

                this.isHighlighted = ctx.isPointInPath(app.mouse_X, app.mouse_Y);
                if (this.isHighlighted) {
                    ctx.strokeStyle = "blue";
                    ctx.canvas.style.cursor = "move";
                    ctx.stroke();
                } else {
                    ctx.strokeStyle = "red";
                    ctx.canvas.style.cursor = "";
                }

            },

            drawRotatedCross: function(middleOfTheLetterX, middleOfTheLetterY, rad, startOfTheLetterX, startOfTheLetterY, letterWidth, letterHeight) {

                ctx.beginPath();
                ctx.strokeStyle = "red";
                ctx.lineWidth = 5;
                ctx.moveTo(startOfTheLetterX - 30, middleOfTheLetterY)
                ctx.lineTo(startOfTheLetterX + letterWidth + 30, middleOfTheLetterY);
                ctx.moveTo(middleOfTheLetterX, startOfTheLetterY - letterHeight - 30);
                ctx.lineTo(middleOfTheLetterX, startOfTheLetterY + 30);

                this.isSelected = ctx.isPointInStroke(app.mouse_X, app.mouse_Y);
                if (!this.isSelected) {
                    if (app.mouseIsOnTheCross) {
                        ctx.strokeStyle = "blue";
                        ctx.canvas.style.cursor = "pointer";
                        ctx.stroke();
                    } else {
                        ctx.strokeStyle = "red";
                        ctx.canvas.style.cursor = "";
                    }
                }

                ctx.lineWidth = 1;          // resetting

            },

            isMouseCursorOverMe: function(ctx, x, y) {

                return this.isHighlighted || this.isSelected;

            },

            isOverCross: function(ctx, x, y) {

                return false;

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

                ctx.moveTo(0, this.panelYOffset);
                ctx.lineTo(width, this.panelYOffset);
                ctx.lineTo(width, this.panelYOffset + 1);
                ctx.lineTo(0, this.panelYOffset + 1);

                ctx.stroke();
                ctx.restore();

            },

            isBelow: function(letter) {

                return letter.y > panelYOffset;

            }


        }

    }

    app.createAndPositionFixedLetters = function(ctx) {

        const gapBetweenLetters         = 5;
        const offsetFromTheTopBorder    = 20;
        let currentOffsetFromLeft       = gapBetweenLetters + 15;

        // const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        const alphabet = ['a', 'b', 'c', 'd', 'e'];
        for (let i = 0; i < alphabet.length; i++) {

            const symbol        = alphabet[i];
            const letter        = this.createLetter(symbol, true);
            const details       = letter.getDetailsForContext(ctx);
            let x               = currentOffsetFromLeft + details.width / 2;
            let y               = app.separator.panelYOffset + details.height / 2 + offsetFromTheTopBorder;
            letter.moveTo(x, y);
            currentOffsetFromLeft += (details.width + gapBetweenLetters);

            this.fixedLetters.push(letter);

        }

    }

    app.redrawEverything = function (ctx, width, height) {

        console.log("redrawing...")
        ctx.clearRect(0, 0, width, height);
        if (this.letterInCreation !== undefined && this.letterInCreation !== null) {
            this.letterInCreation.draw(ctx);
        }
        this.separator.draw(ctx, width, height);
        this.fixedLetters.forEach(fl => fl.draw(ctx));
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
        if (highlightedLetter !== undefined && highlightedLetter !== null) {

            if (highlightedLetter.isTemplate) {

                if (app.letterToBeEdited !== undefined && app.letterToBeEdited !== null) {
                    app.letterToBeEdited.isSelected = false;
                    app.letterToBeEdited = null;
                }

                highlightedLetter.triggerHighlight(false);
                app.letterInCreation = app.createLetter(highlightedLetter.symbol, false)
                app.letterInCreation.triggerHighlight(true);
                app.letterInCreation.moveTo(highlightedLetter.middleOfTheLetterX, highlightedLetter.middleOfTheLetterY);

            }

        }

        app.redrawEverything(ctx, width, height);
        console.log("mouseButton pressed")
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

        if (app.letterToBeEdited !== undefined && app.letterToBeEdited !== null) {

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
                    if (app.letterToBeEdited.isMouseCursorOverMe()) {
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

        return app.fixedLetters.concat(app.movableLetters).find(l => l.isHighlighted)

    }

    app.isManipulatingObject = function() {
        return app.mouseButtonIsDown;
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


    app.processObjectManipulation = function(e) {

        if (app.letterToBeEdited !== undefined && app.letterToBeEdited !== null) {

            const [new_to_prev_radians_diff, new_to_prev_radius_ratio] = app.getMouseRadiansAndRadiusDiff(app.letterToBeEdited.middleOfTheLetterX, app.letterToBeEdited.middleOfTheLetterY, app.mouse_X, app.mouse_Y, e.offsetX, e.offsetY);
            app.letterToBeEdited.rad += new_to_prev_radians_diff;

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

        app.movableLetters.concat(app.fixedLetters).forEach(l => {

            if (l.isSelected) {

                l.triggerHighlight(false);
                if (l.isOverCross(ctx, e.offsetX, e.offsetY)) {
                    ctx.canvas.style.cursor = "pointer";
                } else {
                    ctx.canvas.style.cursor = "";
                }

            } else if (app.letterToBeEdited === undefined || app.letterToBeEdited === null) {

                l.triggerHighlight(l.isMouseCursorOverMe(ctx, e.offsetX, e.offsetY));

            }
        });

    }

    app.aLetterIsBeingCreated = function() {

        return app.letterInCreation !== undefined && app.letterInCreation !== null

    }

    app.letterBeingCreatedWasMovedToMovableLetters = function() {

        return !app.separator.isBelow(app.letterInCreation);

    }


    app.mouseClick = function (e) {

    }


    // -----------------------------------------------------------------------------------------------------------------------

    app.init = function() {

        this.separator = this.createSeparator(700);         // execution coupling! separator has to be created before fixed letters are positioned
        this.createAndPositionFixedLetters(ctx);
        this.redrawEverything(ctx, width, height);

    };


    app.init();


    return app;

}
