
function createCurvedWord(text, points) {

    return {

        text:       text,
        maxChar:    50,

        startX:     points[0],  startY:     points[1],
        control1X:  points[2],  control1Y:  points[3],
        control2X:  points[2],  control2Y:  points[3],
        // control2X:  points[4],  control2Y:  points[5],
        endX:       points[6],  endY:       points[7],

        // changeCoordinates: function (startX, startY, control1X, control1Y, control2X, control2Y, endX, endY) {
        //
        //     this.startX     = startX;
        //     this.startY     = startY;
        //     this.control1X  = control1X;
        //     this.control1Y  = control1Y;
        //     this.control2X  = control2X;
        //     this.control2Y  = control2Y;
        //     this.endX       = endX;
        //     this.endY       = endY;
        //
        // },

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

            ctx.clearRect(0, 0, width, height);

            this.drawCurveUsingApi(ctx);
            this.drawCurveUsingCustomCalculations(ctx);
            this.drawWordUsingCustomCalculations(ctx);

        },

        drawCurveUsingApi: function (ctx) {

            ctx.save();                                                         // saves the entire state of the canvas by pushing the current state onto a stack.
            ctx.beginPath();                                                    // starts a new path by emptying the list of sub-paths.

            ctx.moveTo(this.startX, this.startY);                               // begins a new sub-path at the point specified by the given (x, y) coordinates
            ctx.bezierCurveTo(this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);

            // let offset = 15;
            // ctx.moveTo(this.startX - offset/1.5, this.startY - offset);
            // ctx.bezierCurveTo(this.control1X, this.control1Y - offset, this.control2X, this.control2Y - offset, this.endX, this.endY - offset);

            ctx.strokeStyle = "red";
            ctx.stroke();                                                       // strokes (outlines) the current or given path with the current stroke style
            ctx.restore();                                                      // restores the most recently saved canvas state by popping the top entry in the drawing state stack. If there is no saved state, this method does nothing.

        },

        drawCurveUsingCustomCalculations: function (ctx) {

            const bezierCurveCoordinates    = [];
            const maxVirtualIndex           = 1000;

            for (let vi = 0; vi < maxVirtualIndex; vi++) {

                let currentVirtualIndexCoordinates  = this.coordinatesOnTheBezierCurveFor(vi       / maxVirtualIndex, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                let nextVirtualIndexCoordinates     = this.coordinatesOnTheBezierCurveFor((vi + 1) / maxVirtualIndex, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                let rotation_distance               = this.calculateRotationAndDistanceOnThePathFor(currentVirtualIndexCoordinates, nextVirtualIndexCoordinates);

                bezierCurveCoordinates.push( { pointOnTheBezierCurve: currentVirtualIndexCoordinates, nextPointOnTheBezierCurve: nextVirtualIndexCoordinates, rotationAndDistanceOnThePath: rotation_distance } );

            }

            ctx.save();
            ctx.moveTo(bezierCurveCoordinates[0].pointOnTheBezierCurve.x, bezierCurveCoordinates[0].pointOnTheBezierCurve.y)

            for (let vi = 1; vi < maxVirtualIndex; vi++) {
                ctx.lineTo(bezierCurveCoordinates[vi].pointOnTheBezierCurve.x, bezierCurveCoordinates[vi].pointOnTheBezierCurve.y)
            }

            ctx.strokeStyle = "green";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

        },

        drawWordUsingCustomCalculations: function (ctx) {

            const bezierCurveCoordinates    = [];
            const maxVirtualIndex           = 1000;
            const truncatedText             = this.text.substring(0, this.maxChar);

            for (let vi = 0; vi < maxVirtualIndex; vi++) {

                let currentVirtualIndexCoordinates  = this.coordinatesOnTheBezierCurveFor(vi       / maxVirtualIndex, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                let nextVirtualIndexCoordinates     = this.coordinatesOnTheBezierCurveFor((vi + 1) / maxVirtualIndex, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                let rotation_distance               = this.calculateRotationAndDistanceOnThePathFor(currentVirtualIndexCoordinates, nextVirtualIndexCoordinates);

                bezierCurveCoordinates.push( { pointOnTheBezierCurve: currentVirtualIndexCoordinates, nextPointOnTheBezierCurve: nextVirtualIndexCoordinates, rotationAndDistanceOnThePath: rotation_distance } );

            }


            let numberOfLetters                 = truncatedText.length;

            let letterPaddingInPx               = ctx.measureText(" ").width / 4;
            let totalPaddingLengthInPx          = (numberOfLetters - 1) * letterPaddingInPx;
            let lettersLengthInPx               = Math.round(ctx.measureText(truncatedText).width);
            let totalLengthInPx                 = lettersLengthInPx + totalPaddingLengthInPx;
            let hypotenuseDistOfTheLastPoint    = bezierCurveCoordinates[maxVirtualIndex - 1].rotationAndDistanceOnThePath.cDist;
            let z                               = (hypotenuseDistOfTheLastPoint / 2) - (totalLengthInPx / 2);

            let vi                              = this.findVirtualIndexOfTheFirstLetter(bezierCurveCoordinates, maxVirtualIndex, z);

            for (let letterIndex = 0; letterIndex < numberOfLetters; letterIndex++) {

                ctx.save();
                ctx.translate(bezierCurveCoordinates[vi].pointOnTheBezierCurve.x, bezierCurveCoordinates[vi].pointOnTheBezierCurve.y);
                ctx.rotate(bezierCurveCoordinates[vi].rotationAndDistanceOnThePath.rad);
                ctx.fillText(truncatedText[letterIndex], 0, 0);
                ctx.restore();

                let x1 = ctx.measureText(truncatedText[letterIndex]).width + letterPaddingInPx;
                let x2 = 0;
                for (let j = vi; j < maxVirtualIndex; j++) {
                    x2 = x2 + bezierCurveCoordinates[j].rotationAndDistanceOnThePath.dist;
                    if (x2 >= x1) {
                        vi = j;
                        break;
                    }
                }
            }


        },


        // -------------------------------------------------------------------------------------------------------------
        // helper functions
        // -------------------------------------------------------------------------------------------------------------

        findVirtualIndexOfTheFirstLetter: function (bezierCurveCoordinates, maxVirtualIndex, z) {

            let i;
            for (i = 0; i < maxVirtualIndex; i++) {

                if (bezierCurveCoordinates[i].rotationAndDistanceOnThePath.cDist >= z) {
                    break;
                }

            }
            return i;
        },

        xDist : 0,      // current distance (distance is summed up by calculating the hypotenuse between current letter starting point and next letter starting point)

        calculateRotationAndDistanceOnThePathFor: function (first, second) {

            // Final stage which takes p, p + 1 and calculates the rotation, distance on the path and accumulates the total distance

            let rad     = Math.atan(first.mY / first.mX);                                                                               // the rotation is calculated based on tangent calculation done previously (mY and mX are output values)
            let dist    = Math.sqrt(((second.x - first.x) * (second.x - first.x)) + ((second.y - first.y) * (second.y - first.y)));     // pythagoras
            this.xDist  = this.xDist + dist;
            return { rad: rad, dist: dist, cDist: this.xDist };

        },

        calculateTangentLineToAPointInTheCurve: function (t, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY) {

            // calculates the tangent line to a point in the curve; later used to calculate the degrees of rotation at this point.
            const mx = (3 * (1 - t) * (1 - t) * (control1X - startX)) + ((6 * (1 - t) * t) * (control2X - control1X)) + (3 * t * t * (endX - control2X));
            const my = (3 * (1 - t) * (1 - t) * (control1Y - startY)) + ((6 * (1 - t) * t) * (control2Y - control1Y)) + (3 * t * t * (endY - control2Y));
            return [mx, my];

        },

        coordinatesOnTheBezierCurveFor: function (t, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY) {

            // Quadratic bezier curve plotter
            const [Bezier1_X, Bezier1_Y] = this.drawWord_Bezier1(t, startX, startY, control1X, control1Y, control2X, control2Y);
            const [Bezier2_X, Bezier2_Y] = this.drawWord_Bezier1(t, control1X, control1Y, control2X, control2Y, endX, endY);
            const x = ((1 - t) * Bezier1_X) + (t * Bezier2_X);
            const y = ((1 - t) * Bezier1_Y) + (t * Bezier2_Y);
            const [slope_mx, slope_my] = this.calculateTangentLineToAPointInTheCurve(t, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY);

            return { t: t, x: x, y: y, mX: slope_mx, mY: slope_my };
        },

        drawWord_Bezier1: function (t, startX, startY, control1X, control1Y, control2X, control2Y) {

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


// ---------------------------------------------------------------------------------------------------------------------
// mouse handling logic
// ---------------------------------------------------------------------------------------------------------------------

let mouseButtonPressed = false;
let mouse_X = 0;
let mouse_Y = 0;

function mouseClickListener(e) {

    // console.log("mouse location: ", e.x, e.y)
    curvedWord.changeCoordinates(curveCoordinates.value.split(','));
    curvedWord.changeText(curveText.value)
    curvedWord.draw(ctx, canvas.width, canvas.height);

}

function mouseButtonDownListener(e) {

    mouseButtonPressed = true;
    mouse_X = e.x;
    mouse_Y = e.y;

}

function mouseButtonUpListener(e) {
    mouseButtonPressed = false;
    mouse_X = 0;
    mouse_Y = 0;
}

function mouseMoveListener(e) {

    if (!mouseButtonPressed) {
        return;
    }

    let coordinates         = curveCoordinates.value.split(',')

    // moving right outer point
    // let newX_MiddlePoint    = parseFloat(coordinates[2]) + e.movementX;
    // let newX_EndPoint       = parseFloat(coordinates[6]) + e.movementX;
    // coordinates[2]          = newX_MiddlePoint.toString();
    // coordinates[6]          = newX_EndPoint.toString();

    // moving right outer point
    let newX                = parseFloat(coordinates[2]) + e.movementX;
    let newY                = parseFloat(coordinates[3]) + e.movementY;
    coordinates[2]          = newX.toString();
    coordinates[3]          = newY.toString();


    curveCoordinates.value  = coordinates.toString();


    // console.log(coordinates[3]);
    curvedWord.changeCoordinates(curveCoordinates.value.split(','))
    curvedWord.draw(ctx, canvas.width, canvas.height);
    // console.log(`${e.movementY}, ${coordinates[3]}`);
    // console.log(coordinates[3]);
}

// -----------------------------------------------------------------------------------------------------------------------


function startIt()
{

    if (!first) {
        return;
    }

    const canvasDiv         = document.getElementById('canvasDiv');
    canvasDiv.innerHTML     = '<canvas id="layer0" width="700" height="700">Your browser does not support the canvas element.</canvas>'; // for IE

    canvasDiv.addEventListener('click',     mouseClickListener)
    canvasDiv.addEventListener('mousedown', mouseButtonDownListener)
    canvasDiv.addEventListener('mouseup',   mouseButtonUpListener)
    canvasDiv.addEventListener('mousemove', mouseMoveListener)

    canvas                  = document.getElementById('layer0');
    ctx                     = canvas.getContext('2d');

    ctx.fillStyle           = "black";
    ctx.font                = "70px arial blue";

    curveCoordinates        = document.getElementById('coordinates');
    curveText               = document.getElementById('text');

    curvedWord = createCurvedWord(curveText.value, curveCoordinates.value.split(','));
    // curvedWord.changeCoordinates(curveCoordinates.value.split(','));
    curvedWord.draw(ctx, canvas.width, canvas.height);

    first = false;

}




