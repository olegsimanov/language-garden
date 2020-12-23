
function createCurvedWord(text, points) {

    return {

        // -------------------------------------------------------------------------------------------------------------
        // curved word data
        // -------------------------------------------------------------------------------------------------------------

        text:       text,

        startX:     parseFloat(points[0]),  startY:     parseFloat(points[1]),
        control1X:  parseFloat(points[2]),  control1Y:  parseFloat(points[3]),
        control2X:  parseFloat(points[2]),  control2Y:  parseFloat(points[3]),
        // control2X:  parseFloat(points[4]),  control2Y:  parseFloat(points[5]),       // we have to keep the second control point in order to be able to support quadratic bezier curve later
        endX:       parseFloat(points[6]),  endY:       parseFloat(points[7]),


        accumulatedDistanceFromStart :  0,                      // current curve length (distance is summed up by calculating the hypotenuse between virtual points on the curve)
        maxVirtualIndex:                1000,                   // "resolution" - so many virtual dots on the curve will fit inside this.endX and this.startX
        virtualPointsCoordinates:       [],                     // virtual points coordinates on the bezier curve (curve defined by points: start, control1, control2, end)
        lettersCoordinates:             [],                     // letters coordinates and data on the bezier curve


        // -------------------------------------------------------------------------------------------------------------
        // manipulation methods
        // -------------------------------------------------------------------------------------------------------------


        changeCoordinates: function (points) {
            if (points.length === 8) {
                this.startX     = parseFloat(points[0]); this.startY     = parseFloat(points[1]);
                this.control1X  = parseFloat(points[2]); this.control1Y  = parseFloat(points[3]);
                this.control2X  = parseFloat(points[2]); this.control2Y  = parseFloat(points[3]);
                // this.control2X  = parseFloat(points[4]); this.control2Y  = parseFloat(points[5]);            // we have to keep the second control point in order to be able to support quadratic bezier curve later
                this.endX       = parseFloat(points[6]); this.endY       = parseFloat(points[7]);
            }
        },

        changeText: function (text) {
            this.text = text;
        },


        // -------------------------------------------------------------------------------------------------------------
        // main method to draw the curved word
        // -------------------------------------------------------------------------------------------------------------


        draw: function (ctx) {

            this.virtualPointsCoordinates       = this.calculateVirtualPointsCoordinates(this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
            this.lettersCoordinates             = this.calculateLettersCoordinates(ctx, this.virtualPointsCoordinates);

            // this.drawBezierCurveUsingAPI(ctx);                       // for comparison purposes

            this.drawWord(ctx);
            this.drawVirtualPoints(ctx);
            this.drawDebugInfo(ctx);

        },


        // -------------------------------------------------------------------------------------------------------------
        // calculations functions (output of these functions is used to draw curve and letters
        // -------------------------------------------------------------------------------------------------------------

        calculateVirtualPointsCoordinates: function (startX, startY, control1X, control1Y, control2X, control2Y, endX, endY) {

            const virtualPointsCoordinates = [];

            for (let vi = 0; vi < this.maxVirtualIndex; vi++) {

                let currentVirtualIndexCoordinates      = this.calculateQuadraticBezierCurveCoordinates(vi       / this.maxVirtualIndex, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY);
                let nextVirtualIndexCoordinates         = this.calculateQuadraticBezierCurveCoordinates((vi + 1) / this.maxVirtualIndex, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY);
                let rotation_hypotenuse_accHypotenuse   = this.calculate_Rotation_HypotenuseToNextPoint_And_AccumulativeHypotenuseFromStart(currentVirtualIndexCoordinates, nextVirtualIndexCoordinates);

                virtualPointsCoordinates.push( { pointOnTheBezierCurve: currentVirtualIndexCoordinates, nextPointOnTheBezierCurve: nextVirtualIndexCoordinates, rotation_hypotenuse_accHypotenuse: rotation_hypotenuse_accHypotenuse } );

            }

            this.accumulatedDistanceFromStart = 0;      // resetting accumulated distance from start otherwise it will grow infinitely

            return virtualPointsCoordinates;

        },

        calculateLettersCoordinates: function(ctx, virtualPointsCoordinates) {

            const lettersCoordinates    = [];
            const letterPaddingInPx     = this.calculatePaddingBetweenLetters(ctx, virtualPointsCoordinates, this.text.length - 1);

            for (let letterIndex = 0, vi = 0; letterIndex < this.text.length; letterIndex++) {
                const [ nextVi, letterCoordinates ] = this.calculateSingleLetterCoordinateAt(ctx, virtualPointsCoordinates, vi, this.text[letterIndex], letterPaddingInPx);
                vi = nextVi;
                lettersCoordinates.push(letterCoordinates);
            }

            return lettersCoordinates;

        },

        calculatePaddingBetweenLetters: function (ctx, virtualPointsCoordinates, numberOfLetters) {

            const lettersLengthInPx         = Math.round(ctx.measureText(this.text).width);
            const totalLengthInPx           = virtualPointsCoordinates[this.maxVirtualIndex - 1].rotation_hypotenuse_accHypotenuse.distanceFromStart;
            const totalPaddingLengthInPx    = totalLengthInPx - lettersLengthInPx;

            return totalPaddingLengthInPx / numberOfLetters;
            
        },

        calculateSingleLetterCoordinateAt: function (ctx, virtualPointsCoordinates, vi, letter, letterPaddingInPx) {

            const startOfLetter     = virtualPointsCoordinates[vi];

            const letterWidth       = ctx.measureText(letter).width;

            vi                      = this.findVirtualPointIndexAfterDistance(virtualPointsCoordinates, vi, letterWidth / 2);      // middle of letter virtual point index
            const middleOfLetter    = virtualPointsCoordinates[vi];

            vi                      = this.findVirtualPointIndexAfterDistance(virtualPointsCoordinates, vi, letterWidth / 2);                                          // end of letter virtual point index
            const endOfLetter       = virtualPointsCoordinates[vi];

            vi                      = this.findVirtualPointIndexAfterDistance(virtualPointsCoordinates, vi, letterPaddingInPx);                                    // start of next letter virtual point index

            return [ vi, {
                        start:  startOfLetter,
                        middle: middleOfLetter,
                        end:    endOfLetter,
                        rad:    middleOfLetter.rotation_hypotenuse_accHypotenuse.rad,
                        height: ctx.measureText(letter).actualBoundingBoxAscent,
                        width:  letterWidth
                    }
                ];
        },

        findVirtualPointIndexAfterDistance: function(virtualPointsCoordinates, vi, distanceToTheRightFromTheVirtualPoint) {

            for (let i = vi, x2 = 0; i < this.maxVirtualIndex; i++) {
                x2 = x2 + virtualPointsCoordinates[i].rotation_hypotenuse_accHypotenuse.hypotenuseToNextPoint;
                if (x2 >= distanceToTheRightFromTheVirtualPoint) {
                    return i;
                }
            }

            return this.maxVirtualIndex;          // last letter reached

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

        // -------------------------------------------------------------------------------------------------------------
        // mouse listener methods
        // -------------------------------------------------------------------------------------------------------------

        mouse_X:                        -1,
        mouse_Y:                        -1,
        mouseIsOverMiddleHandler:       false,
        mouseIsOverFirstLetter:         false,
        mouseIsOverLastLetter:          false,
        mouseButtonIsDown:              false,
        mousePressedInsideFirstLetter:  false,
        mousePressedInsideLastLetter:   false,
        handleSelectionRadius:          20,


        mouseMove: function(e, ctx) {

            if (!this.mouseButtonIsDown) {

                this.mouseIsOverMiddleHandler   = this.isInsideCircle(ctx, this.mouse_X, this.mouse_Y, this.control1X, this.control1Y, this.handleSelectionRadius);
                this.mouseIsOverFirstLetter     = this.isInsideLetter(ctx, this.mouse_X, this.mouse_Y, 0);
                this.mouseIsOverLastLetter      = this.isInsideLetter(ctx, this.mouse_X, this.mouse_Y, this.text.length - 1);

                this.mouseIsOverAnyOtherLetter  = false;
                for (let li = 1; li < this.text.length - 2; li++) {
                    if (this.isInsideLetter(ctx, this.mouse_X, this.mouse_Y, li)) {
                        this.mouseIsOverAnyOtherLetter = true;
                        break;
                    }
                }

                // console.log("mouseIsOverMiddleHandler: " + this.mouseIsOverMiddleHandler + ", mouseIsOverFirstLetter: " + this.mouseIsOverFirstLetter + ", mouseIsOverLastLetter: " + this.mouseIsOverLastLetter + ", mouseIsOverAnyOtherLetter: " + this.mouseIsOverAnyOtherLetter);

            } else if (this.mouseButtonIsDown) {


                const xDiff = parseFloat(this.mouse_X - e.offsetX);
                const yDiff = parseFloat(this.mouse_Y - e.offsetY);

                if (this.mouseIsOverFirstLetter) {

                    const oldStartX = this.startX;
                    this.startX -= xDiff;
                    this.startY -= yDiff;

                    // checking movement on the X scale so it's between word start and end points!
                    if (this.startX > this.control1X) {
                        this.startX = this.control1X;
                    }

                    const newVirtualPointsCoordinates   = this.calculateVirtualPointsCoordinates(this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                    // const newCurveLength                = newVirtualPointsCoordinates[this.maxVirtualIndex - 1].rotation_hypotenuse_accHypotenuse.distanceFromStart;
                    // const currentCurveLength            = this.virtualPointsCoordinates[this.maxVirtualIndex - 1].rotation_hypotenuse_accHypotenuse.distanceFromStart;
                    // const currentLetterPaddingInPx      = this.calculatePaddingBetweenLetters(ctx, this.virtualPointsCoordinates, this.text.length - 1);
                    const newLettersPadding             = this.calculatePaddingBetweenLetters(ctx, newVirtualPointsCoordinates, this.text.length - 1);
                    if (newLettersPadding < 0.1 && xDiff < 0) {
                        // console.log("adjusting startX from: " + this.startX + " to " + oldStartX);
                        this.startX = oldStartX;        // rolling back previous value
                    }

                    // console.log(" startX: " + this.startX + ", new padding: " + newLettersPadding + ", current padding: " + currentLetterPaddingInPx + ", new curve distance: " + newCurveLength + ", current curve distance: " + currentCurveLength + ", xDiff: " + xDiff)


                } else if (this.mouseIsOverLastLetter) {

                    const oldEndX = this.endX;
                    this.endX -= xDiff;
                    this.endY -= yDiff;

                    // checking movement on the X scale so it's between word start and end points!
                    if (this.endX < this.control1X) {
                        this.endX = this.control1X;
                    }

                    const newVirtualPointsCoordinates   = this.calculateVirtualPointsCoordinates(this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                    // const newCurveLength                = newVirtualPointsCoordinates[this.maxVirtualIndex - 1].rotation_hypotenuse_accHypotenuse.distanceFromStart;
                    // const currentCurveLength            = this.virtualPointsCoordinates[this.maxVirtualIndex - 1].rotation_hypotenuse_accHypotenuse.distanceFromStart;
                    // const currentLetterPaddingInPx      = this.calculatePaddingBetweenLetters(ctx, this.virtualPointsCoordinates, this.text.length - 1);
                    const newLettersPadding             = this.calculatePaddingBetweenLetters(ctx, newVirtualPointsCoordinates, this.text.length - 1);
                    if (newLettersPadding < 0.1 && xDiff >= 0) {
                        // console.log("adjusting endX from: " + this.endX + " to " + oldEndX);
                        this.endX = oldEndX;            // rolling back previous value
                    }

                    // console.log(" endX: " + this.endX + ", new padding: " + newLettersPadding + ", current padding: " + currentLetterPaddingInPx + ", new curve distance: " + newCurveLength + ", current curve distance: " + currentCurveLength + ", xDiff: " + xDiff)



                } else if (this.mouseIsOverMiddleHandler) {

                    if (this.mouse_X !== -1 && this.mouse_Y !== -1) {

                        this.control1X -= xDiff;
                        this.control1Y -= yDiff;

                        // checking movement on the X scale so it's between word start and end points!
                        if (this.control1X > this.endX) {
                            this.control1X = this.endX;
                        } else if (this.control1X < this.startX) {
                            this.control1X = this.startX;
                        }

                        // since we are using simple bezier curve we have to set second control point to be same as first control point
                        this.control2X = this.control1X;
                        this.control2Y = this.control1Y;
                    }

                } else {        // move the whole word

                    this.startX     -= xDiff;
                    this.startY     -= yDiff;

                    this.endX       -= xDiff;
                    this.endY       -= yDiff;

                    this.control1X  -= xDiff;
                    this.control1Y  -= yDiff;

                    // since we are using simple bezier curve we have to set second control point to be same as first control point
                    this.control2X = this.control1X;
                    this.control2Y = this.control1Y;

                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                curveCoordinates.value = [this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY].join(',');
                curvedWord.draw(ctx);
            }

            this.mouse_X = e.offsetX;
            this.mouse_Y = e.offsetY;

        },

        mouseButtonDown: function(e) {

            if (!(this.mouseIsOverFirstLetter || this.mouseIsOverMiddleHandler || this.mouseIsOverLastLetter || this.mouseIsOverAnyOtherLetter)) {
                return;
            }
            this.mouseButtonIsDown = true;
        },

        mouseButtonUp: function(e) {
            this.mouseButtonIsDown = false;
        },

        // -------------------------------------------------------------------------------------------------------------
        // intersection functions
        // -------------------------------------------------------------------------------------------------------------


        isInsideCircle: function (ctx, mouse_x, mouse_y, point_x, point_y, radius) {

            ctx.save();
            const circle = new Path2D();
            circle.arc(point_x, point_y, radius, 0, 2 * Math.PI)

            ctx.strokeStyle = 'transparent';
            ctx.stroke(circle);
            ctx.restore();

            return ctx.isPointInPath(circle, mouse_x, mouse_y);

        },

        isInsideLetter: function (ctx, mouse_x, mouse_y, letterIndex) {

            ctx.save();
            ctx.beginPath();

            let letterCoordinates = this.lettersCoordinates[letterIndex];
            let letterHeight = letterCoordinates.height;
            let letterWidth = letterCoordinates.width;

            ctx.translate(
                letterCoordinates.start.pointOnTheBezierCurve.x,
                letterCoordinates.start.pointOnTheBezierCurve.y
            );
            ctx.rotate(letterCoordinates.rad);                                                  // The rotation center point is always the canvas origin. To change the center point, you will need to move the canvas by using the translate() method.

            ctx.closePath();
            ctx.strokeStyle = "transparent"
            ctx.rect(0, 0, letterWidth, -letterHeight);
            ctx.stroke();

            ctx.restore();

            return ctx.isPointInPath(mouse_x, mouse_y);

        },

        // -------------------------------------------------------------------------------------------------------------
        // debug functions
        // -------------------------------------------------------------------------------------------------------------

        drawBezierCurveUsingAPI: function(ctx) {

            ctx.save();
            ctx.beginPath();

            ctx.moveTo(this.startX, this.startY)
            ctx.bezierCurveTo(this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);

            ctx.strokeStyle = "purple";
            ctx.stroke();
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

            ctx.restore();

        },

        drawSquareHandle: function (ctx, lettersCoordinates, letterIndex) {

            ctx.save();
            ctx.beginPath();

            let letterCoordinates   = lettersCoordinates[letterIndex];
            let letterHeight        = letterCoordinates.height;
            let letterWidth         = letterCoordinates.width;

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
        // bezier curve calculations helper functions
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
    canvas.addEventListener('mousemove', function (e) {curvedWord.mouseMove(e, ctx);})


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




