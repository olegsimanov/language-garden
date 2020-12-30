
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


        maxVirtualIndex:                1000,                   // "resolution" - so many virtual dots on the curve will fit inside this.endX and this.startX

        lettersCoordinates:             [],                     // letters coordinates and data on the bezier curve
        letterBoxPaths:                 [],                     // letter 2d shapes
        bezierCurveControlPointPath:    null,
        handleSelectionRadius:          20,


        // -------------------------------------------------------------------------------------------------------------
        // manipulation methods
        // -------------------------------------------------------------------------------------------------------------


        // changeCoordinates: function (points) {
        //     if (points.length === 8) {
        //         this.startX     = parseFloat(points[0]); this.startY     = parseFloat(points[1]);
        //         this.control1X  = parseFloat(points[2]); this.control1Y  = parseFloat(points[3]);
        //         this.control2X  = parseFloat(points[2]); this.control2Y  = parseFloat(points[3]);
        //         // this.control2X  = parseFloat(points[4]); this.control2Y  = parseFloat(points[5]);            // we have to keep the second control point in order to be able to support quadratic bezier curve later
        //         this.endX       = parseFloat(points[6]); this.endY       = parseFloat(points[7]);
        //     }
        // },

        changeText: function (text) {
            this.text = text;
        },


        // -------------------------------------------------------------------------------------------------------------
        // main method to draw the curved word
        // -------------------------------------------------------------------------------------------------------------


        draw: function (ctx) {

            const virtualPointsCoordinates      = this.calculateVirtualPointsCoordinates(this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
            this.letterPaddingInPx              = this.calculatePaddingBetweenLetters(virtualPointsCoordinates, this.text.length - 1);
            this.lettersCoordinates             = this.calculateLettersCoordinates(ctx, virtualPointsCoordinates, this.letterPaddingInPx);
            this.letterBoxPaths                 = this.calculateLetterBoxPaths(this.lettersCoordinates);
            this.bezierCurveControlPointPath    = this.calculateBezierCurveControlPointPath(this.control1X, this.control1Y, this.handleSelectionRadius);

            // this.drawBezierCurveUsingAPI(ctx);                                   // for comparison purposes
            this.drawWord(ctx, this.lettersCoordinates, this.letterBoxPaths);
            this.drawVirtualPoints(ctx, virtualPointsCoordinates);
            this.drawDebugInfo(ctx, this.letterBoxPaths, this.bezierCurveControlPointPath);

        },


        // -------------------------------------------------------------------------------------------------------------
        // calculations functions (output of these functions is used to draw curve and letters
        // -------------------------------------------------------------------------------------------------------------

        accumulatedDistanceFromStart :  0,                      // current curve length (distance is summed up by calculating the hypotenuse between virtual points on the curve)

        calculateVirtualPointsCoordinates: function (startX, startY, control1X, control1Y, control2X, control2Y, endX, endY) {

            const virtualPointsCoordinates = [];

            for (let vi = 0; vi < this.maxVirtualIndex; vi++) {

                let currentVirtualIndexCoordinates      = this.calculateQuadraticBezierCurveCoordinates(vi       / this.maxVirtualIndex, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY);
                let nextVirtualIndexCoordinates         = this.calculateQuadraticBezierCurveCoordinates((vi + 1) / this.maxVirtualIndex, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY);
                let rotation_hypotenuse_accHypotenuse   = this.calculate_Rotation_HypotenuseToNextPoint_And_AccumulativeHypotenuseFromStart(currentVirtualIndexCoordinates, nextVirtualIndexCoordinates);

                virtualPointsCoordinates.push( { pointOnTheBezierCurve: currentVirtualIndexCoordinates, nextPointOnTheBezierCurve: nextVirtualIndexCoordinates, rotation_hypotenuse_accHypotenuse: rotation_hypotenuse_accHypotenuse } );

            }

            this.curveLength                    = this.accumulatedDistanceFromStart;   // saving current accumulated distance from start
            this.accumulatedDistanceFromStart   = 0;                                    // resetting accumulated distance from start otherwise it will grow infinitely


            return virtualPointsCoordinates;

        },

        calculateLettersCoordinates: function(ctx, virtualPointsCoordinates, letterPaddingInPx) {

            const lettersCoordinates    = [];

            for (let letterIndex = 0, vi = 0; letterIndex < this.text.length - 1; letterIndex++) {

                const letter                        = this.text[letterIndex];
                const letterWidth                   = ctx.measureText(letter).width;
                const letterHeight                  = (ctx.measureText(letter).fontBoundingBoxAscent + ctx.measureText(letter).fontBoundingBoxDescent) / 2;
                const [ nextVi, letterCoordinates ] = this.calculateSingleLetterCoordinateAt(virtualPointsCoordinates, vi, letter, letterWidth, letterHeight, letterPaddingInPx);
                lettersCoordinates.push(letterCoordinates);

                vi = nextVi;
            }

            const lastLetter            = this.text[this.text.length - 1];
            const lastLetterWidth       = ctx.measureText(lastLetter).width;
            const lastLetterHeight      = (ctx.measureText(lastLetter).fontBoundingBoxAscent + ctx.measureText(lastLetter).fontBoundingBoxDescent) / 2;
            const lastVi                = this.maxVirtualIndex - 1;
            lettersCoordinates.push(this.calculateLastLetterCoordinateAt(virtualPointsCoordinates, lastVi, lastLetter, lastLetterWidth, lastLetterHeight))

            return lettersCoordinates;

        },

        calculatePaddingBetweenLetters: function (virtualPointsCoordinates, numberOfPaddings) {

            const wordLengthInPx            = this.getWordLengthInPx(this.text);
            const curveLengthInPx           = virtualPointsCoordinates[this.maxVirtualIndex - 1].rotation_hypotenuse_accHypotenuse.distanceFromStart;
            const totalPaddingLengthInPx    = curveLengthInPx - wordLengthInPx;

            return totalPaddingLengthInPx / numberOfPaddings;
            
        },

        getWordLengthInPx: function(text) {
            let lettersWidth = 0;
            for (let i = 0; i < text.length; i++) {
                lettersWidth += ctx.measureText(text[i]).width
            }
            return lettersWidth;
        },


        calculateSingleLetterCoordinateAt: function (virtualPointsCoordinates, vi, letter, letterWidth, letterHeight, letterPaddingInPx) {

            const startOfLetter     = virtualPointsCoordinates[vi];

            vi                      = this.findVirtualPointIndexToTheRightOnTheCurveAfterDistance(virtualPointsCoordinates, vi, letterWidth / 2);
            const middleOfLetter    = virtualPointsCoordinates[vi];

            vi                      = this.findVirtualPointIndexToTheRightOnTheCurveAfterDistance(virtualPointsCoordinates, vi, letterWidth / 2);
            const endOfLetter       = virtualPointsCoordinates[vi];

            vi                      = this.findVirtualPointIndexToTheRightOnTheCurveAfterDistance(virtualPointsCoordinates, vi, letterPaddingInPx);                                    // start of next letter virtual point index

            return [ vi, {
                        start:  startOfLetter,
                        middle: middleOfLetter,
                        end:    endOfLetter,
                        rad:    middleOfLetter.rotation_hypotenuse_accHypotenuse.rad,
                        height: letterHeight  ,
                        width:  letterWidth
                    }
                ];
        },

        findVirtualPointIndexToTheRightOnTheCurveAfterDistance: function(virtualPointsCoordinates, vi, distanceToTheRightFromTheVirtualPoint) {

            for (let i = vi, x2 = 0; i < this.maxVirtualIndex; i++) {
                x2 = x2 + virtualPointsCoordinates[i].rotation_hypotenuse_accHypotenuse.hypotenuseToNextPoint;
                if (x2 >= distanceToTheRightFromTheVirtualPoint) {
                    return i;
                }
            }

            throw new Error("We should not come till here!");

        },

        calculateLastLetterCoordinateAt: function (virtualPointsCoordinates, vi, letter, letterWidth, letterHeight) {

            const endOfLetter       = virtualPointsCoordinates[vi];

            vi                      = this.findVirtualPointIndexToTheLeftOnTheCurve(virtualPointsCoordinates, vi, letterWidth / 2);
            const middleOfLetter    = virtualPointsCoordinates[vi];

            vi                      = this.findVirtualPointIndexToTheLeftOnTheCurve(virtualPointsCoordinates, vi, letterWidth / 2);
            const startOfLetter     = virtualPointsCoordinates[vi];

            return {
                    start:  startOfLetter,
                    middle: middleOfLetter,
                    end:    endOfLetter,
                    rad:    middleOfLetter.rotation_hypotenuse_accHypotenuse.rad,
                    height: letterHeight,
                    width:  letterWidth
            };
        },

        findVirtualPointIndexToTheLeftOnTheCurve: function(virtualPointsCoordinates, vi, distanceToTheRightFromTheVirtualPoint) {

            for (let i = vi, x2 = 0; i >= 0; i--) {
                x2 = x2 + virtualPointsCoordinates[i].rotation_hypotenuse_accHypotenuse.hypotenuseToNextPoint;
                if (x2 >= distanceToTheRightFromTheVirtualPoint) {
                    return i;
                }
            }

            throw new Error("We should never get here!");

        },

        calculateLetterBoxPaths: function (lettersCoordinates) {

            const lettersBoxes = [];

            for (let letterIndex = 0; letterIndex < this.text.length; letterIndex++) {
                const letterBox = this.calculateLetterBoxAt(lettersCoordinates, letterIndex);
                lettersBoxes.push(letterBox);
            }

            return lettersBoxes;

        },

        calculateLetterBoxAt: function (lettersCoordinates, letterIndex) {

            const letterCoordinates = lettersCoordinates[letterIndex];

            const alpha = - letterCoordinates.middle.rotation_hypotenuse_accHypotenuse.rad;
            const beta  = (90 * Math.PI / 180) - alpha ;
            const c     = letterCoordinates.width / 2;
            const cc    = letterCoordinates.height / 2;
            const a     = c * Math.sin(alpha);
            const b     = c * Math.sin(beta);
            const aa    = cc * Math.sin(alpha);
            const bb    = cc * Math.sin(beta);

            const zeroX = letterCoordinates.middle.pointOnTheBezierCurve.x;
            const zeroY = letterCoordinates.middle.pointOnTheBezierCurve.y;

            const letterBox = new Path2D();
            letterBox.moveTo(zeroX + aa, zeroY + bb);
            letterBox.lineTo(zeroX + b + aa, zeroY + bb - a);
            letterBox.lineTo(zeroX + b - aa, zeroY - bb - a);
            letterBox.lineTo(zeroX - b - aa, zeroY - bb + a)
            letterBox.lineTo(zeroX - b + aa, zeroY + bb + a);
            letterBox.closePath();

            return letterBox;

        },

        calculateBezierCurveControlPointPath: function (pointX, pointY, radius) {

            const path = new Path2D();
            path.arc(pointX, pointY, radius, 0, 180);
            return path;

        },



        // -------------------------------------------------------------------------------------------------------------
        // drawing functions (they are using 2d paths or directly calculations)
        // -------------------------------------------------------------------------------------------------------------

        drawVirtualPoints: function (ctx, virtualPointsCoordinates) {

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(virtualPointsCoordinates[0].pointOnTheBezierCurve.x, virtualPointsCoordinates[0].pointOnTheBezierCurve.y)

            for (let vi = 1; vi < this.maxVirtualIndex; vi++) {
                ctx.lineTo(virtualPointsCoordinates[vi].pointOnTheBezierCurve.x, virtualPointsCoordinates[vi].pointOnTheBezierCurve.y)
            }

            ctx.strokeStyle = "green";
            ctx.lineWidth = 1;

            ctx.stroke();
            ctx.restore();

        },

        drawWord: function (ctx, lettersCoordinates, lettersBoxes) {

            for (let letterIndex = 0; letterIndex < this.text.length; letterIndex++) {
                this.drawSingleLetterBoxAt(ctx, lettersBoxes, letterIndex);
                this.drawSingleLetterAt(ctx, lettersCoordinates, letterIndex);
            }

        },

        drawSingleLetterBoxAt: function (ctx, letterBoxPaths, letterIndex) {

            const letterBox = letterBoxPaths[letterIndex];

            ctx.save();
            ctx.beginPath();
            if (letterIndex === 0 || letterIndex === this.text.length - 1 ) {
                ctx.strokeStyle = "green";
            }
            ctx.stroke(letterBox)
            ctx.restore();

        },

        drawSingleLetterAt: function (ctx, lettersCoordinates, letterIndex) {

            const letterCoordinates = lettersCoordinates[letterIndex];
            const letter = this.text[letterIndex];

            ctx.save();
            ctx.beginPath();
            ctx.translate(
                letterCoordinates.middle.pointOnTheBezierCurve.x,
                letterCoordinates.middle.pointOnTheBezierCurve.y
            );
            ctx.rotate(letterCoordinates.rad);                                                  // The rotation center point is always the canvas origin. To change the center point, you will need to move the canvas by using the translate() method.
            if (letterIndex === 0 || letterIndex === this.text.length - 1 ) {
                ctx.fillStyle = "red";
            }
            ctx.fillText(letter, - letterCoordinates.width / 2, letterCoordinates.height / 2);
            ctx.restore();

        },

        // -------------------------------------------------------------------------------------------------------------
        // meta data drawing functions
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

        drawDebugInfo: function (ctx, letterBoxPaths, bezierCurveControlPointPath) {

            this.drawRoundHandle(ctx, bezierCurveControlPointPath);
            this.drawSingleLetterBoxAt(ctx, letterBoxPaths, 0);
            this.drawSingleLetterBoxAt(ctx, letterBoxPaths, this.text.length - 1);

        },

        drawRoundHandle: function (ctx, bezierCurveControlPointPath) {

            ctx.save();
            ctx.beginPath();

            ctx.strokeStyle = "red"
            ctx.stroke(bezierCurveControlPointPath);

            ctx.restore();

        },


        // -------------------------------------------------------------------------------------------------------------
        // mouse listener methods
        // -------------------------------------------------------------------------------------------------------------

        mouseIsOverMiddleHandler:       false,
        mouseIsOverFirstLetter:         false,
        mouseIsOverLastLetter:          false,
        mouseIsOverAnyOtherLetter:      false,

        isMouseCursorOverMe: function(mouse_X, mouse_Y) {

            this.mouseIsOverMiddleHandler   = ctx.isPointInPath(this.bezierCurveControlPointPath, mouse_X, mouse_Y);
            this.mouseIsOverFirstLetter     = ctx.isPointInPath(this.letterBoxPaths[0], mouse_X, mouse_Y);
            this.mouseIsOverLastLetter      = ctx.isPointInPath(this.letterBoxPaths[this.text.length - 1], mouse_X, mouse_Y);

            this.mouseIsOverAnyOtherLetter  = false;
            for (let li = 1; li < this.text.length - 2; li++) {
                if (ctx.isPointInPath(this.letterBoxPaths[li], mouse_X, mouse_Y)) {
                    this.mouseIsOverAnyOtherLetter = true;
                    break;
                }
            }

            return this.mouseIsOverMiddleHandler || this.mouseIsOverFirstLetter || this.mouseIsOverLastLetter || this.mouseIsOverAnyOtherLetter;

        },

        reactToMouseCoordinatesChanges: function(xDiff, yDiff) {

            if (this.mouseIsOverFirstLetter) {

                this.moveFirstPoint(xDiff, yDiff);
                // this.rotateWordByFirstPoint(xDiff, yDiff);

            } else if (this.mouseIsOverLastLetter) {

                this.moveLastPoint(xDiff, yDiff);
                // this.rotateWordByLastPoint(xDiff, yDiff);

            } else if (this.mouseIsOverMiddleHandler) {

                this.moveMiddlePoint(xDiff, yDiff);

            } else if (this.mouseIsOverAnyOtherLetter) {

                this.moveWholeWord(xDiff, yDiff);

            }


        },

        moveFirstPoint: function (xDiff, yDiff) {

            let newStartX = this.startX - xDiff;
            let newStartY = this.startY - yDiff;

            // checking movement on the X scale so it's between word start and end points!
            if (newStartX > this.control1X) {
                newStartX = this.control1X;
            }

            const newLettersPadding = this.calculatePaddingBetweenLetters(this.calculateVirtualPointsCoordinates(newStartX, newStartY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY), this.text.length - 1);
            if (newLettersPadding >= 0) {
                this.startX = newStartX;
                this.startY = newStartY;
            }



        },

        moveLastPoint: function (xDiff, yDiff) {

            let newEndX = this.endX - xDiff;
            let newEndY = this.endY - yDiff;

            // checking movement on the X scale so it's between word start and end points!
            if (newEndX < this.control1X) {
                newEndX = this.control1X;
            }

            const newLettersPadding = this.calculatePaddingBetweenLetters(this.calculateVirtualPointsCoordinates(this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, newEndX, newEndY), this.text.length - 1);
            if (newLettersPadding >= 0) {
                this.endX = newEndX;
                this.endY = newEndY;
            }

        },

        moveMiddlePoint: function (xDiff, yDiff) {

            let newControl1X = this.control1X - xDiff;
            let newControl1Y = this.control1Y - yDiff;

            // checking movement on the X scale so it's between word start and end points!
            if (newControl1X > this.endX - this.lettersCoordinates[this.lettersCoordinates.length - 1].width / 2) {
                newControl1X = this.endX - this.lettersCoordinates[this.lettersCoordinates.length - 1].width / 2;
            } else if (newControl1X < this.startX + this.lettersCoordinates[0].width / 2) {
                newControl1X = this.startX + this.lettersCoordinates[0].width / 2;
            }

            const newLettersPadding = this.calculatePaddingBetweenLetters(this.calculateVirtualPointsCoordinates(this.startX, this.startY, newControl1X, newControl1Y, newControl1X, newControl1Y, this.endX, this.endY), this.text.length - 1);
            if (newLettersPadding >= 0) {
                this.control1X = newControl1X;
                this.control1Y = newControl1Y;
            }

            this.control2X = this.control1X;        // since we are using simple bezier curve we have to set
            this.control2Y = this.control1Y;        // second control point to be same as first control point
        },

        moveWholeWord: function (xDiff, yDiff) {

            this.startX     -= xDiff;
            this.startY     -= yDiff;

            this.endX       -= xDiff;
            this.endY       -= yDiff;

            this.control1X  -= xDiff;
            this.control1Y  -= yDiff;

            this.control2X  = this.control1X;       // since we are using simple bezier curve we have to set
            this.control2Y  = this.control1Y;       // second control point to be same as first control point

        },

        rotateWordByFirstPoint: function(xDiff, yDiff) {



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

let curvedWord;


// ---------------------------------------------------------------------------------------------------------------------
// mouse handling logic
// ---------------------------------------------------------------------------------------------------------------------

let mouseButtonIsDown       = false;
let mouse_X                 = -1;
let mouse_Y                 = -1;
let objectUnderMouseCursor  = null;

function mouseMove(e) {

    if (!mouseButtonIsDown) {

        let isMouseCursorOverMe = curvedWord.isMouseCursorOverMe(e.offsetX, e.offsetY);
        if (isMouseCursorOverMe) {
            objectUnderMouseCursor = curvedWord;
        }

    } else if (mouseButtonIsDown) {

        const xDiff = mouse_X - e.offsetX;
        const yDiff = mouse_Y - e.offsetY;

        if (objectUnderMouseCursor !== null) {
            objectUnderMouseCursor.reactToMouseCoordinatesChanges(xDiff, yDiff);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        curvedWord.draw(ctx);

    }

    mouse_X = e.offsetX;
    mouse_Y = e.offsetY;

}


function mouseButtonDown(e) {
    mouseButtonIsDown = true;
}

function mouseButtonUp(e) {
    mouseButtonIsDown = false;
}

function mouseClick(e) {

}


// -----------------------------------------------------------------------------------------------------------------------


function startIt()
{

    if (!first) {
        return;
    }

    const canvasDiv         = document.getElementById('canvasDiv');
    canvasDiv.innerHTML     = '<canvas id="layer0" width="1200" height="800">Your browser does not support the canvas element.</canvas>'; // for IE

    canvas                  = document.getElementById('layer0');

    canvas.addEventListener('click',     mouseClick)
    canvas.addEventListener('mousedown', mouseButtonDown )
    canvas.addEventListener('mouseup',   mouseButtonUp )
    canvas.addEventListener('mousemove', mouseMove )


    ctx                     = canvas.getContext('2d');

    ctx.fillStyle           = "black";
    ctx.font                = "200px language_garden_regular";
    // ctx.font                = "40px language_garden_regular";

    // const coordinates       = "0,56,240,56,240,56,570,56";
    // const coordinates       = "0.0, 100, 100, 100, 100, 100, 300, 100";
    const coordinates       = "100,500,340,500,340,500,800,500";
    // const text              = "abcdefghijklmnopqrstuvwxyz";
    // const text              = "abcdef";
    const text              = "monkey";
    // const text              = "my";

    curvedWord = createCurvedWord(text, coordinates.split(','));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    curvedWord.draw(ctx);

    first = false;

}




