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


    app.createLetter = function(symbol, width, height, isTemplate) {

        return {

            symbol:             symbol,

            x:                  0,
            y:                  0,
            width:              width,
            height:             height,
            rad:                0,

            framePath:          new Path2D(),
            crossPath:          new Path2D(),

            isTemplate:         isTemplate,
            isHighlighted:      false,              // should have a frame
            isSelected:         false,              // should have a cross
            wasMoved:           false,


            moveBy: function(xDiff, yDiff) {

                this.x += xDiff;
                this.y += yDiff;

                this.calculateLetterCoordinates();
                this.calculateMetaCoordinates();
                this.wasMoved = true;

            },

            moveTo: function(x, y) {

                this.x = x;
                this.y = y;

                this.calculateLetterCoordinates();
                this.calculateMetaCoordinates();

            },

            draw: function(ctx) {

                this.drawName(ctx);
                this.drawMeta(ctx);

            },

            drawName: function(ctx) {

                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = "black";
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rad);
                ctx.fillText(this.symbol, 0, 0);
                // ctx.fillText(this.symbol, this.x, this.y);
                ctx.closePath();
                ctx.restore();

            },

            drawMeta: function(ctx) {

                ctx.save();

                if (this.isHighlighted) {

                    ctx.strokeStyle = "red";
                    ctx.lineWidth = 1;
                    ctx.stroke(this.framePath);

                }

                if (this.isSelected) {
                    if (!this.isTemplate) {
                        ctx.strokeStyle = "red";
                        ctx.stroke(this.crossPath);
                    }
                }

                ctx.restore();

            },

            calculateLetterCoordinates: function() {

            },

            calculateMetaCoordinates: function() {

                this.framePath = new Path2D();
                this.framePath.moveTo(this.x, this.y);
                this.framePath.lineTo(this.x, this.y - this.height);
                this.framePath.lineTo(this.x + this.width, this.y - this.height);
                this.framePath.lineTo(this.x + this.width, this.y);
                this.framePath.closePath();

                this.crossPath = new Path2D();
                this.crossPath.moveTo(this.x - 20, this.y - this.height / 2);
                this.crossPath.lineTo(this.x + this.width + 20, this.y - this.height / 2);
                this.crossPath.moveTo(this.x + this.width / 2, this.y - this.height - 20);
                this.crossPath.lineTo(this.x + this.width / 2, this.y + 20);


            },

            isMouseCursorOverMe: function(ctx, x, y) {

                return ctx.isPointInPath(this.framePath, x, y)

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
        const offsetFromTheTopBorder    = 20;
        let currentOffsetFromLeft       = gapBetweenLetters;

        const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        for (let i = 0; i < alphabet.length; i++) {

            const symbol    = alphabet[i];
            const width     = ctx.measureText(symbol).width
            const height    = (ctx.measureText(symbol).fontBoundingBoxAscent + ctx.measureText(symbol).fontBoundingBoxDescent) / 2;
            let x           = currentOffsetFromLeft;
            let y           = panelYOffset + height + offsetFromTheTopBorder

            let letter = this.createLetter(symbol, width, height,true);
            letter.moveTo(x, y)
            this.fixedLetters.push(letter)

            currentOffsetFromLeft += (width + gapBetweenLetters);

        }
    }

    app.calculateCoordinates = function (ctx, width, height) {

        this.separator.calculateCoordinates(ctx, width, height)
        this.calculateFixedLettersCoordinates(ctx, this.separator.panelYOffset);

    }

    app.redrawEverything = function (ctx, width, height) {

        console.log("redrawing...")
        ctx.clearRect(0, 0, width, height);
        if (app.letterInCreation !== undefined && app.letterInCreation !== null) {
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
        if (highlightedLetter !== undefined && highlightedLetter !== null) {

            if (highlightedLetter.isTemplate) {

                if (app.letterToBeEdited !== undefined && app.letterToBeEdited !== null) {
                    app.letterToBeEdited.isSelected = false;
                    app.letterToBeEdited = null;
                }

                highlightedLetter.triggerHighlight(false);
                app.letterInCreation = app.createLetter(highlightedLetter.symbol, highlightedLetter.width, highlightedLetter.height, false)
                app.letterInCreation.triggerHighlight(true);
                app.letterInCreation.moveTo(highlightedLetter.x, highlightedLetter.y);

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

    app.processObjectManipulation = function(e) {

        if (app.letterToBeEdited !== undefined && app.letterToBeEdited !== null) {


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

        this.separator = this.createSeparator(700);

        this.calculateCoordinates(ctx, width, height);
        this.redrawEverything(ctx, width, height);

    };


    app.init();


    return app;

}
