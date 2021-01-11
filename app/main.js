
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
            this.lettersCoordinates             = this.calculateLettersCoordinates(ctx, virtualPointsCoordinates, this.calculatePaddingBetweenLetters(this.getCurveLengthInPx(virtualPointsCoordinates), this.text.length - 1));                  // ctx here is used to get letter height and width
            this.letterBoxPaths                 = this.calculateLetterBoxPaths(this.lettersCoordinates);
            this.bezierCurveControlPointPath    = this.calculateBezierCurveControlPointPath(this.control1X, this.control1Y, ctx.measureText(this.text[0]).width / 1.5);
            this.perpendicularPath              = this.calculatePerpendicularPath(this.startX, this.startY, this.endX, this.endY, this.control1X, this.control1Y);

            // this.drawBezierCurveUsingAPI(ctx);                                   // for comparison purposes
            this.drawWord(ctx, this.lettersCoordinates, this.letterBoxPaths);
            // this.drawVirtualPoints(ctx, virtualPointsCoordinates);
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
            const beta  = this.degreeToRadian(90) - alpha ;
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

        calculatePerpendicularPath: function(x1, y1, x2, y2, xm, ym) {

            const [intersect_x, intersect_y]    = this.getIntersectionPointBetweenBaseLineAndPerpendicularToTheBase(x1, y1, x2, y2, xm, ym);

            const path = new Path2D();

            path.moveTo(xm, ym);
            path.lineTo(intersect_x, intersect_y);
            path.moveTo(x1, y1);
            path.lineTo(x2, y2);
            path.lineTo(xm, ym);
            path.lineTo(x1, y1);

            return path;

        },

        getCurveLengthInPx: function (virtualPointsCoordinates) {
            return virtualPointsCoordinates[this.maxVirtualIndex - 1].rotation_hypotenuse_accHypotenuse.distanceFromStart;
        },

        calculatePaddingBetweenLetters: function (curveLengthInPx, numberOfPaddings) {

            const wordLengthInPx            = this.getWordLengthInPx(this.text);
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
                // this.drawSingleLetterBoxAt(ctx, lettersBoxes, letterIndex);
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
            const letter            = this.text[letterIndex];

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
            // this.drawPerpendicular(ctx);
            // this.drawSingleLetterBoxAt(ctx, letterBoxPaths, 0);
            // this.drawSingleLetterBoxAt(ctx, letterBoxPaths, this.text.length - 1);

        },

        drawRoundHandle: function (ctx, bezierCurveControlPointPath) {

            ctx.save();
            ctx.beginPath();

            ctx.strokeStyle = "red"
            ctx.stroke(bezierCurveControlPointPath);

            ctx.restore();

        },

        drawPerpendicular: function(ctx) {

            ctx.save();
            ctx.beginPath();

            ctx.strokeStyle = "red";
            ctx.stroke(this.perpendicularPath);

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
            for (let li = 1; li < this.text.length - 1; li++) {
                if (ctx.isPointInPath(this.letterBoxPaths[li], mouse_X, mouse_Y)) {
                    this.mouseIsOverAnyOtherLetter = true;
                    break;
                }
            }

            return this.mouseIsOverMiddleHandler || this.mouseIsOverFirstLetter || this.mouseIsOverLastLetter || this.mouseIsOverAnyOtherLetter;

        },

        getMouseRadiansAndRadiusDiff: function (stableX, stableY, prev_mouse_X, xDiff, prev_mouse_Y, yDiff) {

            const newMouseX         = prev_mouse_X - xDiff;
            const newMouseY         = prev_mouse_Y - yDiff;
            const prev_mouse_radius = Math.sqrt(Math.abs(stableX - prev_mouse_X)    * Math.abs(stableX - prev_mouse_X)  + Math.abs(stableY - prev_mouse_Y)  * Math.abs(stableY - prev_mouse_Y))
            const new_mouse_radius  = Math.sqrt(Math.abs(stableX - newMouseX)       * Math.abs(stableX - newMouseX)     + Math.abs(stableY - newMouseY)     * Math.abs(stableY - newMouseY))
            const prev_mouse_rads   = Math.asin((prev_mouse_Y - stableY) / prev_mouse_radius);
            const new_mouse_rads    = Math.asin((newMouseY - stableY) / new_mouse_radius);
            const radians_diff      = new_mouse_rads - prev_mouse_rads;
            const radius_diff       = new_mouse_radius / prev_mouse_radius;

            return [ radians_diff, radius_diff ] ;

        },

        reactToMouseCoordinatesChanges: function(prev_mouse_X, prev_mouse_Y, xDiff, yDiff) {

            if (this.mouseIsOverFirstLetter) {

                const [ mouse_radians_diff, mouse_radius_diff ] = this.getMouseRadiansAndRadiusDiff(this.endX, this.endY, prev_mouse_X, xDiff, prev_mouse_Y, yDiff);

                // this.moveFirstPoint(xDiff, yDiff);
                // this.rotateWordWithInverseDimitryBendByFirstPoint(xDiff, yDiff);
                return this.rotateAndStretchWordByFirstPoint(xDiff, yDiff, mouse_radians_diff, mouse_radius_diff);

            } else if (this.mouseIsOverLastLetter) {

                const [ mouse_radians_diff, mouse_radius_diff ] = this.getMouseRadiansAndRadiusDiff(this.startX, this.startY, prev_mouse_X, xDiff, prev_mouse_Y, yDiff);

                // if (this.radianToDegree(Math.abs(mouse_rads_diff)) < 1) {
                //     this.moveLastPoint(xDiff, yDiff);
                // } else {
                    // this.rotateWordWithInverseDimitryBendByLastPoint(xDiff, yDiff);
                    return this.rotateAndStretchWordByLastPoint(xDiff, yDiff, mouse_radians_diff, mouse_radius_diff);
                // }

            } else if (this.mouseIsOverMiddleHandler) {

                return this.moveMiddlePoint(xDiff, yDiff);

            } else if (this.mouseIsOverAnyOtherLetter) {

                return this.moveWholeWord(xDiff, yDiff);

            }


        },

        moveFirstPoint: function (xDiff, yDiff) {

            let newStartX = this.startX - xDiff;
            let newStartY = this.startY - yDiff;

            // checking movement on the X scale so it's between word start and end points!
            if (newStartX > this.control1X) {
                newStartX = this.control1X;
            }

            const lineLength        = this.getCurveLengthInPx(this.calculateVirtualPointsCoordinates(newStartX, newStartY, this.control1X, this.control1Y, this.control1X, this.control1Y, this.endX, this.endY));
            const newLettersPadding = this.calculatePaddingBetweenLetters(lineLength, this.text.length - 1);
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

            const lineLength        = this.getCurveLengthInPx(this.calculateVirtualPointsCoordinates(this.startX, this.endY, this.control1X, this.control1Y, this.control1X, this.control1Y, newEndX, newEndY));
            const newLettersPadding = this.calculatePaddingBetweenLetters(lineLength, this.text.length - 1);
            if (newLettersPadding >= 0) {
                this.endX = newEndX;
                this.endY = newEndY;
            }

        },

        moveMiddlePoint: function (xDiff, yDiff) {

            let newControl1X = this.control1X - xDiff;
            let newControl1Y = this.control1Y - yDiff;

            // checking movement on the X scale so it's between word start and end points!
            if (newControl1X > this.endX - this.lettersCoordinates[this.lettersCoordinates.length - 1].width) {
                newControl1X = this.endX - this.lettersCoordinates[this.lettersCoordinates.length - 1].width;
            } else if (newControl1X < this.startX + this.lettersCoordinates[0].width) {
                newControl1X = this.startX + this.lettersCoordinates[0].width;
            }

            const lineLength        = this.getCurveLengthInPx(this.calculateVirtualPointsCoordinates(this.startX, this.startY, newControl1X, newControl1Y, newControl1X, newControl1Y, this.endX, this.endY));
            const newLettersPadding = this.calculatePaddingBetweenLetters(lineLength, this.text.length - 1);
            if (newLettersPadding < 0) {
                return;
            }

            const baseLength                            = this.getShortestDistanceBetweenPoints(this.startX, this.startY, this.endX, this.endY);
            const [prev_intersect_x, prev_intersect_y]  = this.getIntersectionPointBetweenBaseLineAndPerpendicularToTheBase(this.startX, this.startY, this.endX, this.endY, this.control1X, this.control1Y);
            const previousPerpendicularToTheBaseLength  = this.getShortestDistanceBetweenPoints(prev_intersect_x, prev_intersect_y, this.control1X, this.control1Y);
            const [intersect_x, intersect_y]            = this.getIntersectionPointBetweenBaseLineAndPerpendicularToTheBase(this.startX, this.startY, this.endX, this.endY, newControl1X, newControl1Y);
            const perpendicularToTheBaseLength          = this.getShortestDistanceBetweenPoints(intersect_x, intersect_y, newControl1X, newControl1Y);

            if (perpendicularToTheBaseLength <= baseLength * 0.3 || previousPerpendicularToTheBaseLength >= perpendicularToTheBaseLength)
            {

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

        rotateWordWithInverseDimitryBendByFirstPoint: function(xDiff, yDiff) {

            let newStartX       = this.startX - xDiff;
            let newStartY       = this.startY - yDiff;

            let newControl1X    = this.control1X - xDiff;
            let newControl1Y    = this.control1Y - yDiff;

            // const lineLength = this.getCurveLengthInPx(this.calculateVirtualPointsCoordinates(newStartX, newStartY, newControl1X, newControl1Y, newControl1X, newControl1Y, this.endX, this.endY));
            const lineLength        = this.getShortestDistanceBetweenPoints(newStartX, newStartY, this.endX, this.endY);
            const newLettersPadding = this.calculatePaddingBetweenLetters(lineLength, this.text.length - 1);
            if (newLettersPadding >= 0 && newControl1X <= this.endX - this.lettersCoordinates[0].width / 2) {

                this.startX = newStartX;
                this.startY = newStartY;

                this.control1X = newControl1X;
                this.control1Y = newControl1Y;

            } else if (newLettersPadding >= 0) {

                this.startY     = newStartY;
                this.control1Y  = newControl1Y;

            } else {

                this.startY     = newStartY;
                this.control1Y  = newControl1Y;
                this.startX     = this.startX - Math.abs(xDiff * 1.5);          // TODO: calculate startX based on a proper mathematical calculation and not a magic number
                this.control1X  = this.control1X - Math.abs(xDiff * 1.5);       // TODO: calculate startX based on a proper mathematical calculation and not a magic number

            }

            console.log(newLettersPadding);


            this.control2X = this.control1X;        // since we are using simple bezier curve we have to set
            this.control2Y = this.control1Y;        // second control point to be same as first control point


        },

        rotateWordWithInverseDimitryBendByLastPoint: function(xDiff, yDiff) {

            let newEndX         = this.endX - xDiff;
            let newEndY         = this.endY - yDiff;

            let newControl1X    = this.control1X - xDiff;
            let newControl1Y    = this.control1Y - yDiff;

            // const lineLength = this.getCurveLengthInPx(this.calculateVirtualPointsCoordinates(this.startX, this.startY, newControl1X, newControl1Y, newControl1X, newControl1Y, newEndX, newEndY));
            const lineLength        = this.getShortestDistanceBetweenPoints(this.startX, this.startY, newEndX, newEndY);
            const newLettersPadding = this.calculatePaddingBetweenLetters(lineLength, this.text.length - 1);
            if (newLettersPadding >= 0 && newControl1X >= this.startX + this.lettersCoordinates[0].width / 2) {

                this.endX = newEndX;
                this.endY = newEndY;

                this.control1X = newControl1X;
                this.control1Y = newControl1Y;

            } else if (newLettersPadding >= 0) {

                this.endY       = newEndY;
                this.control1Y  = newControl1Y;

            } else {

                this.endY       = newEndY;
                this.control1Y  = newControl1Y;
                this.endX       = this.endX + Math.abs(xDiff * 1.5);            // TODO: calculate startX based on a proper mathematical calculation and not a magic number
                this.control1X  = this.control1X + Math.abs(xDiff * 1.5);       // TODO: calculate startX based on a proper mathematical calculation and not a magic number

            }

            console.log(newLettersPadding);


            this.control2X = this.control1X;        // since we are using simple bezier curve we have to set
            this.control2Y = this.control1Y;        // second control point to be same as first control point


        },

        rotateAndStretchWordByFirstPoint: function(xDiff, yDiff, mouse_radians_diff, mouse_radius_diff) {

            if (xDiff === 0 && yDiff === 0) {
                return; // no rotation
            }


            const start_radius      = Math.sqrt(Math.abs(this.startX - this.endX)       * Math.abs(this.startX - this.endX)         + Math.abs(this.startY - this.endY)         * Math.abs(this.startY - this.endY));
            const middle_radius     = Math.sqrt(Math.abs(this.endX - this.control1X)    * Math.abs(this.endX - this.control1X)      + Math.abs(this.endY - this.control1Y)      * Math.abs(this.endY - this.control1Y));

            const s_rads            = Math.asin((this.startY - this.endY) / start_radius);
            const s_newRads         = s_rads + mouse_radians_diff;

            const m_rads            = Math.asin((this.control1Y - this.endY) / middle_radius);
            const m_newRads         = m_rads + mouse_radians_diff;

            const newStartX         = this.endX - start_radius * mouse_radius_diff * Math.cos(s_newRads);
            const newStartY         = this.endY + start_radius * mouse_radius_diff * Math.sin(s_newRads);

            const newControl1X      = this.endX - middle_radius * Math.cos(m_newRads);
            const newControl1Y      = this.endY + middle_radius * Math.sin(m_newRads);

            if (newControl1X > this.endX - this.lettersCoordinates[0].width / 2) {
                return;         // don't allow middle point to go in front of the end point when rotating
            }

            if (newStartX > newControl1X) {
                return;         // don't allow start poing to go to the right of the middle point
            }

            const lineLength        = this.getShortestDistanceBetweenPoints(newStartX, newStartY, this.endX, this.endY);
            const newLettersPadding = this.calculatePaddingBetweenLetters(lineLength, this.text.length - 1);
            if (newLettersPadding >= 0) {

                this.startX = newStartX;
                this.startY = newStartY;

                this.control1X = newControl1X;
                this.control1Y = newControl1Y;


            } else {

                mouse_radius_diff = 1;  // just rotate don't squeeze

                const newStartX         = this.endX - start_radius * mouse_radius_diff * Math.cos(s_newRads);
                const newStartY         = this.endY + start_radius * mouse_radius_diff * Math.sin(s_newRads);

                this.startX = newStartX;
                this.startY = newStartY;

                this.control1X = newControl1X;
                this.control1Y = newControl1Y;

            }

            this.control2X = this.control1X;
            this.control2Y = this.control1Y;


        },

        rotateAndStretchWordByLastPoint: function(xDiff, yDiff, mouse_radians_diff, mouse_radius_diff) {

            if (xDiff === 0 && yDiff === 0) {
                return; // no rotation
            }


            const end_radius        = Math.sqrt(Math.abs(this.startX - this.endX)       * Math.abs(this.startX - this.endX)         + Math.abs(this.startY - this.endY)         * Math.abs(this.startY - this.endY));
            const middle_radius     = Math.sqrt(Math.abs(this.startX - this.control1X)  * Math.abs(this.startX - this.control1X)    + Math.abs(this.startY - this.control1Y)    * Math.abs(this.startY - this.control1Y));

            const e_rads            = Math.asin((this.endY - this.startY) / end_radius);
            const e_newRads         = e_rads + mouse_radians_diff;

            const m_rads            = Math.asin((this.control1Y - this.startY) / middle_radius);
            const m_newRads         = m_rads + mouse_radians_diff;

            const newEndX           = this.startX + end_radius * mouse_radius_diff * Math.cos(e_newRads);
            const newEndY           = this.startY + end_radius * mouse_radius_diff * Math.sin(e_newRads);

            const newControl1X      = this.startX + middle_radius * Math.cos(m_newRads);
            const newControl1Y      = this.startY + middle_radius * Math.sin(m_newRads);

            if (newControl1X < this.startX + this.lettersCoordinates[0].width / 2) {
                return;         // don't allow middle point to go in front of the start point
            }

            if (newEndX < newControl1X) {
                return;         // don't allow end point to go in front of the middle point
            }

            const lineLength        = this.getShortestDistanceBetweenPoints(this.startX, this.startY, newEndX, newEndY);
            const newLettersPadding = this.calculatePaddingBetweenLetters(lineLength, this.text.length - 1);
            if (newLettersPadding >= 0) {

                this.endX = newEndX;
                this.endY = newEndY;

                this.control1X = newControl1X;
                this.control1Y = newControl1Y;

            } else {

                mouse_radius_diff = 1;  // just rotate don't squeeze

                const newEndX           = this.startX + end_radius * mouse_radius_diff * Math.cos(e_newRads);
                const newEndY           = this.startY + end_radius * mouse_radius_diff * Math.sin(e_newRads);

                this.endX = newEndX;
                this.endY = newEndY;

                this.control1X = newControl1X;
                this.control1Y = newControl1Y;


            }

            this.control2X = this.control1X;
            this.control2Y = this.control1Y;

        },

        // -------------------------------------------------------------------------------------------------------------
        // geometrical functions
        // -------------------------------------------------------------------------------------------------------------

        // https://math.semestr.ru/line/equation.php
        // https://math.semestr.ru/line/perpendicular.php

        getIntersectionPointBetweenBaseLineAndPerpendicularToTheBase: function(x1, y1, x2, y2, xm, ym) {

            let x = xm;
            let y = y1;

            if (y1 !== y2) {

                x = (xm * (x2 - x1) / ((-1) * y2 - (-1) * y1)  + (-1) * ym - (-1) * y1 + x1 * ((-1) * y2 - (-1) * y1) / (x2 - x1)) / (((-1) * y2 - (-1) * y1) / (x2 - x1) + (x2 - x1) / ((-1) * y2 - (-1) * y1));
                y = (-1) * (x * (((-1) * y2 - (-1) * y1) / (x2 - x1)) - x1 * (((-1) * y2 - (-1) * y1) / (x2 - x1)) + (-1) * y1);

            }

            return [x, y];

        },

        getShortestDistanceBetweenPoints: function(x1, y1, x2, y2) {

            const a = Math.abs(x1 - x2)
            const b = Math.abs(y1 - y2);
            return Math.sqrt(a * a + b * b);

        },

        // -------------------------------------------------------------------------------------------------------------
        // utility functions
        // -------------------------------------------------------------------------------------------------------------

        radianToDegree: function (radian) {
            return radian * 180 / Math.PI;
        },

        degreeToRadian: function (degree) {
            return degree * Math.PI / 180;
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
            const whatToDoWithMouse = objectUnderMouseCursor.reactToMouseCoordinatesChanges(mouse_X, mouse_Y, xDiff, yDiff);
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
    canvasDiv.innerHTML     = '<canvas id="layer0" width="1000" height="800">Your browser does not support the canvas element.</canvas>'; // for IE

    canvas                  = document.getElementById('layer0');

    canvas.addEventListener('click',     mouseClick)
    canvas.addEventListener('mousedown', mouseButtonDown )
    canvas.addEventListener('mouseup',   mouseButtonUp )
    canvas.addEventListener('mousemove', mouseMove )


    ctx                     = canvas.getContext('2d');

    ctx.fillStyle           = "black";
    // ctx.font                = "200px language_garden_regular";
    // ctx.font                = "20px language_garden_regular";
    ctx.font                = "80px language_garden_regular";
    // ctx.font                = "40px arial";

    // const coordinates       = "0,56,240,56,240,56,570,56";
    // const coordinates       = "0.0, 100, 100, 100, 100, 100, 300, 100";
    const coordinates       = "100,500,340,500,340,500,800,500";
    // const text              = "abcdefghijklmnopqrstuvwxyz";
    // const text              = "abcdefghijkl";
    // const text              = "abcdef";
    const text              = "monkey";
    // const text              = "my";

    curvedWord = createCurvedWord(text, coordinates.split(','));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    curvedWord.draw(ctx);

    first = false;

}




