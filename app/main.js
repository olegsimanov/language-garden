
function createCurvedWord(text, points) {

    return {

        text:       text,
        maxChar:    50,

        startX:     points[0],  startY:     points[1],
        control1X:  points[2],  control1Y:  points[3],
        control2X:  points[2],  control2Y:  points[3],
        // control2X:  points[4],  control2Y:  points[5],
        endX:       points[6],  endY:       points[7],

        accumulatedDistanceFromStart : 0,      // current curve length (distance is summed up by calculating the hypotenuse between current letter starting point and next letter starting point)

        changeCoordinates: function (points) {
            if (points.length === 8) {
                this.startX     = points[0]; this.startY     = points[1];
                this.control1X  = points[2]; this.control1Y  = points[3];
                this.control2X  = points[2]; this.control2Y  = points[3];
                // this.control2X  = points[4]; this.control2Y  = points[5];
                this.endX       = points[6]; this.endY       = points[7];
            }
        },

        changeText: function (text) {
            this.text = text;
        },

        draw: function (ctx, width, height) {

            this.accumulatedDistanceFromStart = 0;                  // resetting accumulated distance of start otherwise it will grow infinitely
            ctx.clearRect(0, 0, width, height);

            // this.drawCurveUsingApi(ctx);
            // this.drawWordUsingCustomCalculations_original(ctx);

            let customBezierCurveCoordinates = this.calculateCurveCoordinatesUsingCustomCalculations();

            // this.drawCurveUsingCustomCalculations(ctx, customBezierCurveCoordinates);
            this.drawWordUsingCustomCalculations(ctx, customBezierCurveCoordinates);
            this.drawDebugInfo(ctx);


        },

        drawDebugInfo: function (ctx) {


            function drawHandle(ctx, pointX, pointY, radius) {

                ctx.save();
                ctx.beginPath();

                ctx.arc(pointX, pointY, radius, 0, 180);
                ctx.strokeStyle = "red"
                ctx.stroke();

                ctx.restore();

            }

            drawHandle(ctx, parseFloat(this.control1X), parseFloat(this.control1Y), 20);

        },

        drawCurveUsingApi: function (ctx) {

            ctx.save();                                                         // saves the entire state of the canvas by pushing the current state onto a stack.
            ctx.beginPath();                                                    // starts a new path by emptying the list of sub-paths.

            ctx.moveTo(this.startX, this.startY);                               // begins a new sub-path at the point specified by the given (x, y) coordinates
            ctx.bezierCurveTo(this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);

            ctx.strokeStyle = "red";
            ctx.stroke();                                                       // strokes (outlines) the current or given path with the current stroke style
            ctx.restore();                                                      // restores the most recently saved canvas state by popping the top entry in the drawing state stack. If there is no saved state, this method does nothing.

        },

        calculateCurveCoordinatesUsingCustomCalculations: function () {

            const coordinates       = [];
            const maxVirtualIndex   = 1000;                                     // "resolution" - so many virtual dots on the curve will fit inside this.endX and this.startX

            for (let vi = 0; vi < maxVirtualIndex; vi++) {

                let currentVirtualIndexCoordinates      = this.calculateQuadraticBezierCurveCoordinates(vi       / maxVirtualIndex, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                let nextVirtualIndexCoordinates         = this.calculateQuadraticBezierCurveCoordinates((vi + 1) / maxVirtualIndex, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                let rotation_hypotenuse_accHypotenuse   = this.calculate_Rotation_HypotenuseToNextPoint_And_AccumulativeHypotenuseFromStart(currentVirtualIndexCoordinates, nextVirtualIndexCoordinates);

                coordinates.push( { pointOnTheBezierCurve: currentVirtualIndexCoordinates, nextPointOnTheBezierCurve: nextVirtualIndexCoordinates, rotation_hypotenuse_accHypotenuse: rotation_hypotenuse_accHypotenuse } );

            }

            return { coordinates, maxVirtualIndex };

        },


        drawCurveUsingCustomCalculations: function (ctx, bezierCurve) {

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(bezierCurve.coordinates[0].pointOnTheBezierCurve.x, bezierCurve.coordinates[0].pointOnTheBezierCurve.y)

            for (let vi = 1; vi < bezierCurve.maxVirtualIndex; vi++) {
                ctx.lineTo(bezierCurve.coordinates[vi].pointOnTheBezierCurve.x, bezierCurve.coordinates[vi].pointOnTheBezierCurve.y)
            }

            ctx.strokeStyle = "green";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

        },

        drawWordUsingCustomCalculations: function (ctx, bezierCurve) {

            const truncatedText                 = this.text.substring(0, this.maxChar);
            let lettersLengthInPx               = Math.round(ctx.measureText(truncatedText).width);
            let totalLengthInPx                 = bezierCurve.coordinates[bezierCurve.maxVirtualIndex - 1].rotation_hypotenuse_accHypotenuse.distanceFromStart;
            let totalPaddingLengthInPx          = totalLengthInPx - lettersLengthInPx;
            let numberOfLetters                 = truncatedText.length;
            let letterPaddingInPx               = totalPaddingLengthInPx / (numberOfLetters - 1);

            for (let letterIndex = 0, vi = 0; letterIndex < numberOfLetters; letterIndex++) {
                const drawBox = letterIndex === 0 || letterIndex === numberOfLetters - 1
                vi = this.drawSingleLetterAt(ctx, bezierCurve, vi, truncatedText[letterIndex], letterPaddingInPx, drawBox);
            }


        },

        drawSingleLetterAt: function (ctx, bezierCurve, vi, letter, letterPaddingInPx, drawBox) {

            let startOfLetter = bezierCurve.coordinates[vi];

            let letterWidth = ctx.measureText(letter).width;
            for (let i = vi, x2 = 0; i < bezierCurve.maxVirtualIndex; i++) {
                x2 = x2 + bezierCurve.coordinates[i].rotation_hypotenuse_accHypotenuse.hypotenuseToNextPoint;
                if (x2 >= letterWidth) {
                    vi = i;
                    break;
                }
            }

            let endOfLetter = bezierCurve.coordinates[vi];

            let radDiff = endOfLetter.rotation_hypotenuse_accHypotenuse.rad - startOfLetter.rotation_hypotenuse_accHypotenuse.rad;
            let adjustedRad = startOfLetter.rotation_hypotenuse_accHypotenuse.rad;
            if (radDiff > 0.3) {
                adjustedRad = endOfLetter.rotation_hypotenuse_accHypotenuse.rad - radDiff / 2;
            }

            ctx.save();
            ctx.beginPath();
            ctx.translate(startOfLetter.pointOnTheBezierCurve.x, startOfLetter.pointOnTheBezierCurve.y);
            ctx.rotate(adjustedRad);                                                  // The rotation center point is always the canvas origin. To change the center point, you will need to move the canvas by using the translate() method.

            if (isDebugInfoOn && (drawBox)) {
                const letterHeight = ctx.measureText(letter).actualBoundingBoxAscent;
                ctx.fillStyle = "green";
                ctx.rect(0, 0 - letterHeight, letterWidth, letterHeight);
                ctx.stroke();
            }


            ctx.fillText(letter, 0, 0);
            ctx.restore();


            for (let i = vi, x2 = 0; i < bezierCurve.maxVirtualIndex; i++) {
                x2 = x2 + bezierCurve.coordinates[i].rotation_hypotenuse_accHypotenuse.hypotenuseToNextPoint;
                if (x2 >= letterPaddingInPx) {
                    vi = i;
                    break;
                }
            }
            return vi;
        },

        // -------------------------------------------------------------------------------------------------------------
        // archived functions
        // -------------------------------------------------------------------------------------------------------------

        // drawWordUsingCustomCalculations_original: function (ctx) {
        //
        //     const bezierCurveCoordinates    = [];
        //     const maxVirtualIndex           = 1000;
        //     const truncatedText             = this.text.substring(0, this.maxChar);
        //
        //     for (let vi = 0; vi < maxVirtualIndex; vi++) {
        //
        //         let currentVirtualIndexCoordinates  = this.calculateQuadraticBezierCurveCoordinates(vi       / maxVirtualIndex, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
        //         let nextVirtualIndexCoordinates     = this.calculateQuadraticBezierCurveCoordinates((vi + 1) / maxVirtualIndex, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
        //         let rotation_distance               = this.calculate_Rotation_HypotenuseToNextPoint_And_AccumulativeHypotenuseFromStart(currentVirtualIndexCoordinates, nextVirtualIndexCoordinates);
        //
        //         bezierCurveCoordinates.push( { pointOnTheBezierCurve: currentVirtualIndexCoordinates, nextPointOnTheBezierCurve: nextVirtualIndexCoordinates, rotationAndDistanceOnThePath: rotation_distance } );
        //
        //     }
        //
        //
        //     let numberOfLetters                 = truncatedText.length;
        //
        //     let letterPaddingInPx               = ctx.measureText(" ").width / 4;
        //     let totalPaddingLengthInPx          = (numberOfLetters - 1) * letterPaddingInPx;
        //     let lettersLengthInPx               = Math.round(ctx.measureText(truncatedText).width);
        //     let totalLengthInPx                 = lettersLengthInPx + totalPaddingLengthInPx;
        //     let hypotenuseDistOfTheLastPoint    = bezierCurveCoordinates[maxVirtualIndex - 1].rotationAndDistanceOnThePath.distanceFromStart;
        //     let z                               = (hypotenuseDistOfTheLastPoint / 2) - (totalLengthInPx / 2);
        //
        //     let vi                              = this.findVirtualIndexOfTheFirstLetter(bezierCurveCoordinates, maxVirtualIndex, z);
        //
        //     for (let letterIndex = 0; letterIndex < numberOfLetters; letterIndex++) {
        //
        //         ctx.save();
        //         ctx.translate(bezierCurveCoordinates[vi].pointOnTheBezierCurve.x, bezierCurveCoordinates[vi].pointOnTheBezierCurve.y);
        //         ctx.rotate(bezierCurveCoordinates[vi].rotationAndDistanceOnThePath.rad);
        //         ctx.fillText(truncatedText[letterIndex], 0, 0);
        //         ctx.restore();
        //
        //         let widthOfCurrentLetterPlusPaddingInPx = ctx.measureText(truncatedText[letterIndex]).width + letterPaddingInPx;
        //         let x2 = 0;
        //         for (let i = vi; i < maxVirtualIndex; i++) {
        //             x2 = x2 + bezierCurveCoordinates[i].rotationAndDistanceOnThePath.hypotenuseToNextPoint;
        //             if (x2 >= widthOfCurrentLetterPlusPaddingInPx) {
        //                 vi = i;
        //                 break;
        //             }
        //         }
        //     }
        //
        //
        // },

        // -------------------------------------------------------------------------------------------------------------
        // helper functions
        // -------------------------------------------------------------------------------------------------------------

        findVirtualIndexOfTheFirstLetter: function (bezierCurveWordsCoordinates, maxVirtualIndex, z) {

            let i;
            for (i = 0; i < maxVirtualIndex; i++) {

                if (bezierCurveWordsCoordinates.coordinates[i].rotation_hypotenuse_accHypotenuse.distanceFromStart >= z) {
                    break;
                }

            }
            return i;
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

function mouseClickListener(e) {

    // console.log("mouse location: ", e.x, e.y)
    curvedWord.changeCoordinates(curveCoordinates.value.split(','));
    curvedWord.changeText(curveText.value)
    curvedWord.draw(ctx, canvas.width, canvas.height);

}

let mouseButtonPressed = false;
let mouse_X = 0;
let mouse_Y = 0;
let movingPoint = -1;
let radius = 50;

function mouseButtonDownListener(e) {

    mouseButtonPressed = true;
    mouse_X = e.x - 14;
    mouse_Y = e.y - 60;

    let coordinates         = curveCoordinates.value.split(',')

    if (isCloseToThePoint(mouse_X, mouse_Y, parseFloat(coordinates[0]) + radius * 2, parseFloat(coordinates[1]), radius)) {

        movingPoint = 0;
        // console.log("is close to the start point");

    } else if (isCloseToThePoint(mouse_X, mouse_Y, parseFloat(coordinates[2]) + radius, parseFloat(coordinates[3]), radius)) {

        movingPoint = 1;
        // console.log("is close to the middle point point")

    } else if (isCloseToThePoint(mouse_X, mouse_Y, parseFloat(coordinates[6]), parseFloat(coordinates[7]), radius)) {

        movingPoint = 2;
        // console.log("is close to the end point")

    }
    else {
        movingPoint = 3;
        // console.log("moving the whole word")
    }


}

function mouseButtonUpListener(e) {
    mouseButtonPressed = false;
    mouse_X = 0;
    mouse_Y = 0;
    movingPoint = -1;
}

function mouseMoveListener(e) {

    if (!mouseButtonPressed) {
        return;
    }

    let coordinates         = curveCoordinates.value.split(',')

    if (movingPoint === 0) {

        // moving beginning point
        coordinates[0]          = (parseFloat(coordinates[0]) + e.movementX).toString();
        coordinates[1]          = (parseFloat(coordinates[1]) + e.movementY).toString();

    } else if (movingPoint === 1) {

        // moving middle point
        coordinates[2]          = (parseFloat(coordinates[2]) + e.movementX).toString();
        coordinates[3]          = (parseFloat(coordinates[3]) + e.movementY).toString();

    } else if (movingPoint === 2) {

        // moving right outer point
        coordinates[6]          = (parseFloat(coordinates[6]) + e.movementX).toString();
        coordinates[7]          = (parseFloat(coordinates[7]) + e.movementY).toString();

    } else if (movingPoint === 3) {

        // moving the whole word

        // moving beginning point
        coordinates[0]          = (parseFloat(coordinates[0]) + e.movementX).toString();
        coordinates[1]          = (parseFloat(coordinates[1]) + e.movementY).toString();

        // moving middle point
        coordinates[2]          = (parseFloat(coordinates[2]) + e.movementX).toString();
        coordinates[3]          = (parseFloat(coordinates[3]) + e.movementY).toString();

        // moving right outer point
        coordinates[6]          = (parseFloat(coordinates[6]) + e.movementX).toString();
        coordinates[7]          = (parseFloat(coordinates[7]) + e.movementY).toString();


    }

    curveCoordinates.value  = coordinates.toString();


    // console.log(coordinates[3]);
    curvedWord.changeCoordinates(curveCoordinates.value.split(','))
    curvedWord.draw(ctx, canvas.width, canvas.height);
    // console.log(`${e.movementY}, ${coordinates[3]}`);
    // console.log(coordinates[3]);
}

function isCloseToThePoint(mouse_x, mouse_y, point_x, point_y, radius) {

    return (mouse_x < point_x && mouse_x > point_x - radius * 2)
        && (mouse_y > point_y - radius * 2 && mouse_y < point_y + 100)

}


// -----------------------------------------------------------------------------------------------------------------------


function startIt()
{

    if (!first) {
        return;
    }

    const canvasDiv         = document.getElementById('canvasDiv');
    canvasDiv.innerHTML     = '<canvas id="layer0" width="1000" height="800">Your browser does not support the canvas element.</canvas>'; // for IE

    canvas                  = document.getElementById('layer0');

    canvas.addEventListener('click',     mouseClickListener)
    canvas.addEventListener('mousedown', mouseButtonDownListener)
    canvas.addEventListener('mouseup',   mouseButtonUpListener)
    canvas.addEventListener('mousemove', mouseMoveListener)


    ctx                     = canvas.getContext('2d');

    ctx.fillStyle           = "black";
    ctx.font                = "200px language_garden_regular";

    curveCoordinates        = document.getElementById('coordinates');
    curveText               = document.getElementById('text');

    curvedWord = createCurvedWord(curveText.value, curveCoordinates.value.split(','));
    // curvedWord.changeCoordinates(curveCoordinates.value.split(','));
    curvedWord.draw(ctx, canvas.width, canvas.height);

    first = false;

}




