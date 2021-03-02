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

            framePath:          new Path2D(),
            crossPath:          new Path2D(),

            isTemplate:         isTemplate,
            isHighlighted:      false,
            isEditable:         false,
            isBeingCloned:      false,


            moveBy: function(xDiff, yDiff) {

                this.x += xDiff;
                this.y += yDiff;

                this.calculateLetterCoordinates();
                this.calculateMetaCoordinates();

            },

            moveTo: function(x, y) {

                this.x = x;
                this.y = y;

                this.calculateLetterCoordinates();
                this.calculateMetaCoordinates();

            },

            draw: function(ctx) {

                this.drawName(ctx);
                this.drawFrame(ctx);

            },

            drawName: function(ctx) {

                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = "black";
                // ctx.translate(x, y);
                // ctx.rotate(radsToRotate);
                // ctx.fillText(letter, 0, 0);
                ctx.fillText(this.symbol, this.x, this.y);
                ctx.closePath();
                ctx.restore();

            },

            drawFrame: function(ctx) {

                ctx.save();

                if (this.isHighlighted) {

                    ctx.strokeStyle = "red";
                    ctx.lineWidth = 1;
                    ctx.stroke(this.framePath);

                    if (!this.isTemplate) {
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
                this.crossPath.moveTo(this.x, this.y - this.height / 2);
                this.crossPath.lineTo(this.x + this.width, this.y - this.height / 2);
                this.crossPath.moveTo(this.x + this.width / 2, this.y - this.height);
                this.crossPath.lineTo(this.x + this.width / 2, this.y);


            },

            isMouseCursorOverMe: function(ctx, x, y) {

                return ctx.isPointInPath(this.framePath, x, y)

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
            isHighlighted:          false,

            draw: function(ctx, width, height) {


                ctx.save();
                ctx.strokeStyle = "black";
                if (this.isHighlighted) {
                    ctx.lineWidth = 3;
                } else {
                    ctx.lineWidth = 1;
                }

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

            isMouseCursorOverMe: function(ctx, x, y) {

                return ctx.isPointInPath(this.path, x, y);

            },

            triggerHighlight: function(isHighlighted) {
                this.isHighlighted = isHighlighted;
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
        if (app.selectedLetter !== undefined && app.selectedLetter !== null) {
            app.selectedLetter.draw(ctx);
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
    app.selectedLetter      = null;

    app.mouseMove   = function(e) {

        if (app.mouseButtonIsDown) {

            if (app.selectedLetter !== null) {
                let xDiff = e.offsetX - app.mouse_X;
                let yDiff = e.offsetY - app.mouse_Y;
                app.selectedLetter.moveBy(xDiff, yDiff);
            }

        } else {

            // highlight object under mouse cursor
            app.movableLetters.concat(app.fixedLetters).forEach(l => l.triggerHighlight(l.isMouseCursorOverMe(ctx, e.offsetX, e.offsetY)));
            app.separator.triggerHighlight(app.separator.isMouseCursorOverMe(ctx, e.offsetX, e.offsetY));
        }

        app.redrawEverything(ctx, width, height);

        app.mouse_X = e.offsetX;
        app.mouse_Y = e.offsetY;

    }

    app.mouseButtonDown = function(e) {
        app.mouseButtonIsDown = true;
        const highlightedLetter = app.fixedLetters.concat(app.movableLetters).find(l => l.isHighlighted)
        if (highlightedLetter !== undefined && highlightedLetter !== null) {
            if (highlightedLetter.isTemplate) {
                highlightedLetter.triggerHighlight(false);
                app.selectedLetter = app.createLetter(highlightedLetter.symbol, highlightedLetter.width, highlightedLetter.height, false)
                app.selectedLetter.triggerHighlight(true);
                app.selectedLetter.isBeingCloned = true;
                app.selectedLetter.moveTo(highlightedLetter.x, highlightedLetter.y);
            } else {
                app.selectedLetter = highlightedLetter;
            }
        }
    }

    app.mouseButtonUp = function(e) {
        app.mouseButtonIsDown = false;
        if (app.selectedLetter !== undefined && app.selectedLetter !== null) {
            if (!app.separator.isBelow(app.selectedLetter) && app.selectedLetter.isBeingCloned) {
                app.movableLetters.push(app.selectedLetter);
                app.selectedLetter.isBeingCloned = false;
            }
            app.selectedLetter = null;
        }
        app.redrawEverything(ctx, width, height);
    }

    app.mouseClick = function (e) {

        // use this method with shift pressed to select multiple letters?

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
