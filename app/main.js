
function createCurvedWord(text, points) {

    return {

        // -------------------------------------------------------------------------------------------------------------
        // curved word data
        // -------------------------------------------------------------------------------------------------------------

        text:       text,

        startX:     points[0],  startY:     points[1],
        control1X:  points[2],  control1Y:  points[3],
        control2X:  points[2],  control2Y:  points[3],
        // control2X:  points[4],  control2Y:  points[5],       // we have to keep the second control point in order to be able to support quadratic bezier curve later
        endX:       points[6],  endY:       points[7],


        accumulatedDistanceFromStart :  0,                      // current curve length (distance is summed up by calculating the hypotenuse between virtual points on the curve)
        virtualPointsCoordinates:       [],                     // virtual points coordinates on the bezier curve (points: start, control1, control2, end)
        maxVirtualIndex:                1000,                   // "resolution" - so many virtual dots on the curve will fit inside this.endX and this.startX
        lettersCoordinates:             [],                     // letters coordinates and data on the bezier curve


        selectedHandle:                 -1,
        handleSelectionRadius:          20,


        // -------------------------------------------------------------------------------------------------------------
        // manipulation methods
        // -------------------------------------------------------------------------------------------------------------


        changeCoordinates: function (points) {
            if (points.length === 8) {
                this.startX     = points[0]; this.startY     = points[1];
                this.control1X  = points[2]; this.control1Y  = points[3];
                this.control2X  = points[2]; this.control2Y  = points[3];
                // this.control2X  = points[4]; this.control2Y  = points[5];            // we have to keep the second control point in order to be able to support quadratic bezier curve later
                this.endX       = points[6]; this.endY       = points[7];
            }
        },

        changeText: function (text) {
            this.text = text;
        },


        // -------------------------------------------------------------------------------------------------------------
        // main method to draw the curved word
        // -------------------------------------------------------------------------------------------------------------


        draw: function (ctx) {

            this.accumulatedDistanceFromStart   = 0;                    // resetting accumulated distance of start otherwise it will grow infinitely
            this.virtualPointsCoordinates       = [];                   // resetting virtual points coordinates
            this.lettersCoordinates             = [];                   // resetting letters coordinates and data

            this.calculateVirtualPointsCoordinates();
            this.calculateLettersCoordinates(ctx);

            this.drawVirtualPoints(ctx);
            this.drawWord(ctx);
            this.drawDebugInfo(ctx);

        },


        // -------------------------------------------------------------------------------------------------------------
        // calculations functions (output of these functions is used to draw curve and letters
        // -------------------------------------------------------------------------------------------------------------

        calculateVirtualPointsCoordinates: function () {

            for (let vi = 0; vi < this.maxVirtualIndex; vi++) {

                let currentVirtualIndexCoordinates      = this.calculateQuadraticBezierCurveCoordinates(vi       / this.maxVirtualIndex, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                let nextVirtualIndexCoordinates         = this.calculateQuadraticBezierCurveCoordinates((vi + 1) / this.maxVirtualIndex, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                let rotation_hypotenuse_accHypotenuse   = this.calculate_Rotation_HypotenuseToNextPoint_And_AccumulativeHypotenuseFromStart(currentVirtualIndexCoordinates, nextVirtualIndexCoordinates);

                this.virtualPointsCoordinates.push( { pointOnTheBezierCurve: currentVirtualIndexCoordinates, nextPointOnTheBezierCurve: nextVirtualIndexCoordinates, rotation_hypotenuse_accHypotenuse: rotation_hypotenuse_accHypotenuse } );

            }

        },

        calculateLettersCoordinates: function(ctx) {

            const truncatedText                 = this.text.substring(0, this.maxChar);
            let lettersLengthInPx               = Math.round(ctx.measureText(truncatedText).width);
            let totalLengthInPx                 = this.virtualPointsCoordinates[this.maxVirtualIndex - 1].rotation_hypotenuse_accHypotenuse.distanceFromStart;
            let totalPaddingLengthInPx          = totalLengthInPx - lettersLengthInPx;
            let numberOfLetters                 = truncatedText.length;
            let letterPaddingInPx               = totalPaddingLengthInPx / (numberOfLetters - 1);

            for (let letterIndex = 0, vi = 0; letterIndex < numberOfLetters; letterIndex++) {
                const [ nextVi, letterCoordinates ] = this.calculateSingleLetterCoordinateAt(ctx, vi, truncatedText[letterIndex], letterPaddingInPx);
                vi = nextVi;
                this.lettersCoordinates.push(letterCoordinates);
            }

        },

        calculateSingleLetterCoordinateAt: function (ctx, vi, letter, letterPaddingInPx) {

            let startOfLetter = this.virtualPointsCoordinates[vi];

            let letterWidth = ctx.measureText(letter).width;
            for (let i = vi, x2 = 0; i < this.maxVirtualIndex; i++) {
                x2 = x2 + this.virtualPointsCoordinates[i].rotation_hypotenuse_accHypotenuse.hypotenuseToNextPoint;
                if (x2 >= letterWidth) {
                    vi = i;
                    break;
                }
            }

            let endOfLetter = this.virtualPointsCoordinates[vi];

            let radDiff = endOfLetter.rotation_hypotenuse_accHypotenuse.rad - startOfLetter.rotation_hypotenuse_accHypotenuse.rad;
            let adjustedRad = startOfLetter.rotation_hypotenuse_accHypotenuse.rad;
            if (radDiff > 0.3) {
                adjustedRad = endOfLetter.rotation_hypotenuse_accHypotenuse.rad - radDiff / 2;
            }


            for (let i = vi, x2 = 0; i < this.maxVirtualIndex; i++) {
                x2 = x2 + this.virtualPointsCoordinates[i].rotation_hypotenuse_accHypotenuse.hypotenuseToNextPoint;
                if (x2 >= letterPaddingInPx) {
                    vi = i;
                    break;
                }
            }
            return [ vi, { start: startOfLetter, end: endOfLetter, rad: adjustedRad, height: ctx.measureText(letter).actualBoundingBoxAscent, width: letterWidth } ];
        },

        // -------------------------------------------------------------------------------------------------------------
        // drawing functions (they are using output of calculation functions to draw curve and letters
        // -------------------------------------------------------------------------------------------------------------

        drawVirtualPoints: function (ctx) {

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.virtualPointsCoordinates[0].pointOnTheBezierCurve.x, this.virtualPointsCoordinates[0].pointOnTheBezierCurve.y)

            for (let vi = 1; vi < this.maxVirtualIndex; vi++) {
                ctx.lineTo(this.virtualPointsCoordinates[vi].pointOnTheBezierCurve.x, this.virtualPointsCoordinates[vi].pointOnTheBezierCurve.y)
            }

            ctx.strokeStyle = "green";
            ctx.lineWidth = 1;

            ctx.stroke();
            ctx.restore();

        },

        drawWord: function (ctx) {

            for (let letterIndex = 0; letterIndex < this.text.length; letterIndex++) {
                this.drawSingleLetterAt(ctx, letterIndex);
            }

        },

        drawSingleLetterAt: function (ctx, letterIndex) {

            const letterCoordinates = this.lettersCoordinates[letterIndex];
            const letter = this.text[letterIndex];

            ctx.save();
            ctx.beginPath();
            ctx.translate(
                letterCoordinates.start.pointOnTheBezierCurve.x,
                letterCoordinates.start.pointOnTheBezierCurve.y
            );
            ctx.rotate(letterCoordinates.rad);                                                  // The rotation center point is always the canvas origin. To change the center point, you will need to move the canvas by using the translate() method.
            if (letterIndex === 0 || letterIndex === this.text.length - 1 ) {
                ctx.fillStyle = "red";
            }
            ctx.fillText(letter, 0, 0);
            ctx.restore();

        },

        drawDebugInfo: function (ctx) {

            this.drawRoundHandle(ctx, this.control1X, this.control1Y, this.handleSelectionRadius);
            this.drawSquareHandle(ctx, this.lettersCoordinates, 0);
            this.drawSquareHandle(ctx, this.lettersCoordinates, this.text.length - 1);

        },

        drawRoundHandle: function (ctx, pointX, pointY, radius) {

            ctx.save();
            ctx.beginPath();

            ctx.arc(pointX, pointY, radius, 0, 180);
            ctx.strokeStyle = "red"
            ctx.stroke();

            if (ctx.isPointInPath(this.mouse_X, this.mouse_Y)) {

                this.mouseIsOverThisWord = true;

            }

            ctx.restore();

        },

        drawSquareHandle: function (ctx, lettersCoordinates, letterIndex) {

            ctx.save();
            ctx.beginPath();

            let letterCoordinates = lettersCoordinates[letterIndex];
            let letterHeight = letterCoordinates.height;
            let letterWidth = letterCoordinates.width;

            ctx.translate(
                letterCoordinates.start.pointOnTheBezierCurve.x,
                letterCoordinates.start.pointOnTheBezierCurve.y
            );
            ctx.rotate(letterCoordinates.rad);                                                  // The rotation center point is always the canvas origin. To change the center point, you will need to move the canvas by using the translate() method.

            ctx.strokeStyle = "red"
            ctx.strokeRect(0, 0, letterWidth, -letterHeight);

            ctx.restore();

        },


        // -------------------------------------------------------------------------------------------------------------
        // intersection functions
        // -------------------------------------------------------------------------------------------------------------


        isInsideCircle: function (ctx, mouse_x, mouse_y, point_x, point_y, radius) {

            const circle = new Path2D();
            circle.arc(point_x, point_y, radius, 0, 2 * Math.PI)
            return ctx.isPointInPath(circle, mouse_x, mouse_y);

        },


        // -------------------------------------------------------------------------------------------------------------
        // mouse listener methods
        // -------------------------------------------------------------------------------------------------------------

        mouse_X:                        -1,
        mouse_Y:                        -1,
        mouseIsOverThisWord:            false,
        mouseButtonIsDown:              false,
        mousePressedInsideFirstLetter:  false,
        mousePressedInsideLastLetter:   false,

        mouseMove: function(e, ctx) {

            this.mouse_X = e.x;
            this.mouse_Y = e.y;
            console.log(e.x + ", " + e.y);

            if (this.mouseButtonIsDown) {

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                curvedWord.draw(ctx);
            }

        },

        mouseButtonDown: function(e) {

            if (!this.mouseIsOverThisWord) {
                return;
            }
            this.mouseButtonIsDown = true;
        },

        mouseButtonUp: function(e) {
            this.mouseButtonIsDown = false;
        },

        // -------------------------------------------------------------------------------------------------------------
        // calculations helper functions
        // -------------------------------------------------------------------------------------------------------------

        calculate_Rotation_HypotenuseToNextPoint_And_AccumulativeHypotenuseFromStart: function (first, second) {

            // Final stage which takes p, p + 1 and calculates the rotation, distance on the path and accumulates the total distance

            let rad                             = Math.atan(first.mY / first.mX);                                                                               // the rotation is calculated based on tangent calculation done previously (mY and mX are output values)
            let hypotenuseToNextPoint           = Math.sqrt(((second.x - first.x) * (second.x - first.x)) + ((second.y - first.y) * (second.y - first.y)));
            this.accumulatedDistanceFromStart   = this.accumulatedDistanceFromStart + hypotenuseToNextPoint;
            return { rad: rad, hypotenuseToNextPoint: hypotenuseToNextPoint, distanceFromStart: this.accumulatedDistanceFromStart };

        },

        calculateTangentLineToAPointInTheCurve: function (t, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY) {

            // calculates the tangent line to a point in the curve; later used to calculate the degrees of rotation at this point.
            const mx = (3 * (1 - t) * (1 - t) * (control1X - startX)) + ((6 * (1 - t) * t) * (control2X - control1X)) + (3 * t * t * (endX - control2X));
            const my = (3 * (1 - t) * (1 - t) * (control1Y - startY)) + ((6 * (1 - t) * t) * (control2Y - control1Y)) + (3 * t * t * (endY - control2Y));
            return [mx, my];

        },

        calculateQuadraticBezierCurveCoordinates: function (t, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY) {

            // Quadratic bezier curve plotter
            const [X1, Y1] = this.calculateLinearBezierCurveCoordinatesFor(t, startX, startY, control1X, control1Y, control2X, control2Y);
            const [X2, Y2] = this.calculateLinearBezierCurveCoordinatesFor(t, control1X, control1Y, control2X, control2Y, endX, endY);
            const x = ((1 - t) * X1) + (t * X2);
            const y = ((1 - t) * Y1) + (t * Y2);
            const [slope_mx, slope_my] = this.calculateTangentLineToAPointInTheCurve(t, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY);

            return { t: t, x: x, y: y, mX: slope_mx, mY: slope_my };
        },

        calculateLinearBezierCurveCoordinatesFor: function (t, startX, startY, control1X, control1Y, control2X, control2Y) {

            // linear bezier curve plotter; used recursively in the quadratic bezier curve calculation
            const x = ((1 - t) * (1 - t) * startX) + (2 * (1 - t) * t * control1X) + (t * t * control2X);
            const y = ((1 - t) * (1 - t) * startY) + (2 * (1 - t) * t * control1Y) + (t * t * control2Y);
            return [x, y];

        }

    };

}


// global vars section

let first = true;       // make sure we initialize everything only once

let canvas;             // width and height
let ctx;                // we use this to draw

let curveCoordinates;
let curveText;
let curvedWord;
let isDebugInfoOn = true;


// ---------------------------------------------------------------------------------------------------------------------
// mouse handling logic
// ---------------------------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------------------------


function startIt()
{

    if (!first) {
        return;
    }

    const canvasDiv         = document.getElementById('canvasDiv');
    canvasDiv.innerHTML     = '<canvas id="layer0" width="1000" height="800">Your browser does not support the canvas element.</canvas>'; // for IE

    canvas                  = document.getElementById('layer0');

    canvas.addEventListener('click',     function (e) {})
    canvas.addEventListener('mousedown', function (e) {curvedWord.mouseButtonDown(e);})
    canvas.addEventListener('mouseup',   function (e) {curvedWord.mouseButtonUp(e);})
    canvas.addEventListener('mousemove', function (e) {curvedWord.mouseMove(e);})


    ctx                     = canvas.getContext('2d');

    ctx.fillStyle           = "black";
    ctx.font                = "200px language_garden_regular";

    curveCoordinates        = document.getElementById('coordinates');
    curveText               = document.getElementById('text');

    curvedWord = createCurvedWord(curveText.value, curveCoordinates.value.split(','));
    // curvedWord.changeCoordinates(curveCoordinates.value.split(','));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    curvedWord.draw(ctx);

    first = false;

}




