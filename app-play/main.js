let first   = true           // make sure we initialize everything only once
let app     = null;


function createApp(ctx, width, height) {

    if (first) {

        ctx.fillStyle               = "black";
        // ctx.font                = "200px language_garden_regular";
        // ctx.font                = "20px language_garden_regular";
        // ctx.font                = "80px language_garden_regular";
        ctx.font                = "40px arial";

        app = App(ctx, width, height);
    }
    first = false;

    return app;

}


function App(ctx, width, height) {

    let app = {};

    // ---------------------------------------------------------------------------------------------------------------------
    // letter data
    // ---------------------------------------------------------------------------------------------------------------------

    app.letter_X        = 0;
    app.letter_Y        = 0;

    app.degree          = 0; // 45;
    app.rad             = 0;        // degree * Math.PI / 180

    // ---------------------------------------------------------------------------------------------------------------------
    // canvas to draw on
    // ---------------------------------------------------------------------------------------------------------------------

    app.width           = width;
    app.height          = height;
    app.ctx             = ctx;            // we use this to draw

    // ---------------------------------------------------------------------------------------------------------------------
    // mouse functions and data
    // ---------------------------------------------------------------------------------------------------------------------

    app.mouse_X             = 0;
    app.mouse_Y             = 0;
    app.mouseButtonIsDown   = false;
    app.mouseIsInTheBox     = false;

    app.mouseClick      = function(mouseEvent) {}
    app.mouseButtonDown = function(mouseEvent) {
        app.mouseButtonIsDown = true;
    }
    app.mouseButtonUp   = function(mouseEvent) {
        app.mouseButtonIsDown = false;
    }
    app.mouseMove       = function(mouseEvent) {

        app.prev_mouse_X = app.mouse_X;
        app.prev_mouse_Y = app.mouse_Y;

        app.mouse_X = mouseEvent.offsetX;
        app.mouse_Y = mouseEvent.offsetY;

        if (app.mouseButtonIsDown) {

            if (app.mouseIsInTheBox) {

                app.letter_X = app.mouse_X;
                app.letter_Y = app.mouse_Y;

            } else if (app.mouseIsOnTheCross) {

                const [new_to_prev_radians_diff, new_to_prev_radius_ratio] = app.getMouseRadiansAndRadiusDiff(app.letter_X, app.letter_Y, app.prev_mouse_X, app.prev_mouse_Y, app.mouse_X, app.mouse_Y)
                // console.log("mouse moved from: [" + app.prev_mouse_X + ", " + app.prev_mouse_Y + "] to [" + app.mouse_X + ", " + app.mouse_Y + "] rad diffs: " + new_to_prev_radians_diff)
                app.rad += new_to_prev_radians_diff;
                console.log(app.rad);

            }

        }

        app.repaint();



    }

    // ---------------------------------------------------------------------------------------------------------------------
    // graphical calculations
    // ---------------------------------------------------------------------------------------------------------------------

    app.getMouseRadiansAndRadiusDiff = function (stableX, stableY, prev_mouse_X, prev_mouse_Y, newMouseX, newMouseY) {

        const prev_mouse_radius         = Math.sqrt(Math.abs(stableX - prev_mouse_X)    * Math.abs(stableX - prev_mouse_X)  + Math.abs(stableY - prev_mouse_Y)  * Math.abs(stableY - prev_mouse_Y))
        const new_mouse_radius          = Math.sqrt(Math.abs(stableX - newMouseX)       * Math.abs(stableX - newMouseX)     + Math.abs(stableY - newMouseY)     * Math.abs(stableY - newMouseY))
        const new_to_prev_radius_ratio  = new_mouse_radius / prev_mouse_radius;

        const prev_mouse_rads           = Math.asin((prev_mouse_Y - stableY)  / prev_mouse_radius);
        const new_mouse_rads            = Math.asin((newMouseY - stableY)     / new_mouse_radius);
        let new_to_prev_radians_diff    = new_mouse_rads - prev_mouse_rads;
        if (newMouseX < stableX) {
            new_to_prev_radians_diff *= -1;
        }

        console.log(prev_mouse_rads + " - " + new_mouse_rads + " => " + new_to_prev_radians_diff)

        return [ new_to_prev_radians_diff, new_to_prev_radius_ratio ] ;

    }

    // ---------------------------------------------------------------------------------------------------------------------
    // graphical elements
    // ---------------------------------------------------------------------------------------------------------------------

    app.repaint = function() {

        ctx.clearRect(0, 0, width, height);
        app.draw();

    }

    app.draw = function() {

        app.drawLetter(app.letter_X, app.letter_Y);
        app.drawBorder("orange");
        app.drawMouseCross("green");

    }

    app.drawBorder = function(color) {

        ctx.save();

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.moveTo(0, 0)
        ctx.lineTo(0, height);
        ctx.lineTo(width, height);
        ctx.lineTo(width, 0)
        ctx.lineTo(0, 0);
        ctx.stroke();

        ctx.restore();

    }

    app.drawMouseCross = function(color) {

        ctx.save()

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(app.mouse_X, 0);
        ctx.lineTo(app.mouse_X, height);
        ctx.moveTo(0, app.mouse_Y);
        ctx.lineTo(width, app.mouse_Y);
        ctx.moveTo(app.mouse_X, 0);
        ctx.stroke();

        ctx.fillText("[" + app.mouse_X + ", " + app.mouse_Y + "]", 0, height);

        ctx.restore();


    }

    app.drawLetter = function(x, y) {

        ctx.save();

        const letters               = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "G", "K", "L", "M", "N", "O", "P"];
        const letter                = letters[12];

        ctx.font                    = "200px language_garden_regular";
        const letterWidth           = ctx.measureText(letter).width     // SHOULD BE TAKEN AFTER PROPER FONT IT SELECTED!
        const letterHeight          = (ctx.measureText(letter).fontBoundingBoxAscent + ctx.measureText(letter).fontBoundingBoxDescent) / 2 * 1.29;

        const middleOfTheLetterX    = x;
        const middleOfTheLetterY    = y;

        const startOfTheLetterX     = Math.round(middleOfTheLetterX - letterWidth / 2);
        const startOfTheLetterY     = Math.round(middleOfTheLetterY + letterHeight / 2);


        // -------------------------------------------------------------------------------------------------------------
        // draw rotated letter
        // -------------------------------------------------------------------------------------------------------------

        ctx.translate(middleOfTheLetterX, middleOfTheLetterY);
        ctx.rotate(app.rad);
        ctx.translate(-middleOfTheLetterX, -middleOfTheLetterY);

        app.drawRotatedLetter(letter, middleOfTheLetterX, middleOfTheLetterY, app.rad, startOfTheLetterX, startOfTheLetterY);
        app.drawRotatedLetterBox(middleOfTheLetterX, middleOfTheLetterY, app.rad, startOfTheLetterX, startOfTheLetterY, letterWidth, letterHeight);
        app.drawRotatedCross(middleOfTheLetterX, middleOfTheLetterY, app.rad, startOfTheLetterX, startOfTheLetterY, letterWidth, letterHeight);

        ctx.restore();

        app.drawLetterMetadata(startOfTheLetterX, startOfTheLetterY, letterWidth, letterHeight, app.rad);

    }

    app.drawRotatedLetter = function(symbol, middleOfTheLetterX, middleOfTheLetterY, rad, startOfTheLetterX, startOfTheLetterY) {

        ctx.beginPath();
        ctx.strokeStyle = "red"
        ctx.fillText(symbol, startOfTheLetterX, startOfTheLetterY);

    }

    app.drawRotatedLetterBox = function(middleOfTheLetterX, middleOfTheLetterY, rad, startOfTheLetterX, startOfTheLetterY, letterWidth, letterHeight) {

        ctx.beginPath();
        // ctx.strokeStyle = "green";
        ctx.moveTo(startOfTheLetterX, startOfTheLetterY);
        ctx.lineTo(startOfTheLetterX + letterWidth, startOfTheLetterY);
        ctx.lineTo(startOfTheLetterX + letterWidth, startOfTheLetterY - letterHeight);
        ctx.lineTo(startOfTheLetterX, startOfTheLetterY - letterHeight);
        ctx.lineTo(startOfTheLetterX, startOfTheLetterY);
        ctx.closePath();

        app.mouseIsInTheBox = ctx.isPointInPath(app.mouse_X, app.mouse_Y);
        if (app.mouseIsInTheBox) {
            ctx.strokeStyle = "blue";
            ctx.canvas.style.cursor = "move";
        } else {
            ctx.strokeStyle = "red";
            ctx.canvas.style.cursor = "";
        }

        ctx.stroke();

    }

    app.drawRotatedCross = function(middleOfTheLetterX, middleOfTheLetterY, rad, startOfTheLetterX, startOfTheLetterY, letterWidth, letterHeight) {

        ctx.beginPath();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 5;
        ctx.moveTo(startOfTheLetterX - 30, middleOfTheLetterY)
        ctx.lineTo(startOfTheLetterX + letterWidth + 30, middleOfTheLetterY);
        ctx.moveTo(middleOfTheLetterX, startOfTheLetterY - letterHeight - 30);
        ctx.lineTo(middleOfTheLetterX, startOfTheLetterY + 30);

        app.mouseIsOnTheCross = ctx.isPointInStroke(app.mouse_X, app.mouse_Y);
        if (!app.mouseIsInTheBox) {
            if (app.mouseIsOnTheCross) {
                ctx.strokeStyle = "blue";
                ctx.canvas.style.cursor = "pointer";
            } else {
                ctx.strokeStyle = "red";
                ctx.canvas.style.cursor = "";
            }
        }

        ctx.lineWidth = 1;          // resetting
        ctx.stroke();

    }

    app.drawLetterMetadata = function(startOfTheLetterX, startOfTheLetterY, letterWidth, letterHeight, rad) {

        ctx.save();

        const degree = app.rad * 180 / Math.PI;

        const symbolMetadata =

            "[x:" + startOfTheLetterX       + ", y:" + startOfTheLetterY        + "] " +
            "[w:" + Math.round(letterWidth) + ", h:" + Math.round(letterHeight) + "] " +
            "[d:" + Math.round(degree)      + ", r:" + rad                      + "]";

        const symbolMetadataLength = ctx.measureText(symbolMetadata).width
        ctx.fillText(symbolMetadata, width - symbolMetadataLength, 30)

        ctx.restore();


    }

    app.letter_X = Math.round(width / 2);
    app.letter_Y = Math.round(height  / 2);

    app.repaint();

    return app;

}
