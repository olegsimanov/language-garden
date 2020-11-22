
function createCurvedWord(text, points) {

    return {

        text:       text,
        maxChar:    50,

        startX:     points[0],  startY:     points[1],
        control1X:  points[2],  control1Y:  points[3],
        control2X:  points[4],  control2Y:  points[5],
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
                this.startX     = points[0];
                this.startY     = points[1];
                this.control1X  = points[2];
                this.control1Y  = points[3];
                this.control2X  = points[4];
                this.control2Y  = points[5];
                this.endX       = points[6];
                this.endY       = points[7];
            }
        },

        changeText: function (text) {
            if (text.length > 0 && text.length < this.maxChar) {
                this.text = text;
            }
        },

        draw: function (ctx, width, height) {

            ctx.clearRect(0, 0,width, height);

            this.drawCurve(ctx);
            this.drawWord(ctx);

        },

        drawCurve: function (ctx) {

            ctx.save();                                                         // saves the entire state of the canvas by pushing the current state onto a stack.
            ctx.beginPath();

            ctx.moveTo(this.startX, this.startY);
            ctx.bezierCurveTo(this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);

            ctx.stroke();
            ctx.restore();                                                      // restores the most recently saved canvas state by popping the top entry in the drawing state stack. If there is no saved state, this method does nothing.

        },

        xDist : 0,

        drawWord: function (ctx) {

            const textCurve     = [];
            const concatText    = this.text.substring(0, this.maxChar);
            const curveSample   = 1000;

            let i = 0;
            for (i = 0; i < curveSample; i++) {
                let point_a = this.drawWord_Bezier2(i / curveSample, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                let point_b = this.drawWord_Bezier2((i + 1) / curveSample, this.startX, this.startY, this.control1X, this.control1Y, this.control2X, this.control2Y, this.endX, this.endY);
                let curve_c = this.drawWord_Main(point_a, point_b);
                textCurve.push( { bezier: point_a, curve: curve_c } );
            }

            let letterPadding = ctx.measureText(" ").width / 4;
            let w = concatText.length;
            let ww = Math.round(ctx.measureText(concatText).width);


            let totalPadding = (w - 1) * letterPadding;
            let totalLength = ww + totalPadding;
            let p = 0;

            let cDist = textCurve[curveSample - 1].curve.cDist;

            let z = (cDist / 2) - (totalLength / 2);

            for (i = 0; i < curveSample; i++) {
                if (textCurve[i].curve.cDist >= z) {
                    p = i;
                    break;
                }
            }

            for (i = 0; i < w; i++) {

                ctx.save();
                ctx.translate(textCurve[p].bezier.x, textCurve[p].bezier.y);
                ctx.rotate(textCurve[p].curve.rad);
                ctx.fillText(concatText[i], 0, 0);
                ctx.restore();

                x1 = ctx.measureText(concatText[i]).width + letterPadding;
                x2 = 0;
                for (j = p; j < curveSample; j++) {
                    x2 = x2 + textCurve[j].curve.dist;
                    if (x2 >= x1) {
                        p = j;
                        break;
                    }
                }
            }
        },

        drawWord_Main: function (b1, b2) {

            // Final stage which takes p, p + 1 and calculates the rotation, distance on the path and accumulates the total distance
            let rad = Math.atan(b1.mY / b1.mX);
            // this.b2 = b2;
            // this.b1 = b1;
            // let dx = (b2.x - b1.x);
            // let dx2 = (b2.x - b1.x) * (b2.x - b1.x);
            let dist = Math.sqrt(((b2.x - b1.x) * (b2.x - b1.x)) + ((b2.y - b1.y) * (b2.y - b1.y)));
            this.xDist = this.xDist + dist;
            return { rad: rad, dist: dist, cDist: this.xDist };

        },

        drawWord_BezierT: function (t, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY) {

            //calculates the tangent line to a point in the curve; later used to calculate the degrees of rotation at this point.
            const mx = (3 * (1 - t) * (1 - t) * (control1X - startX)) + ((6 * (1 - t) * t) * (control2X - control1X)) + (3 * t * t * (endX - control2X));
            const my = (3 * (1 - t) * (1 - t) * (control1Y - startY)) + ((6 * (1 - t) * t) * (control2Y - control1Y)) + (3 * t * t * (endY - control2Y));
            return [mx, my];

        },

        drawWord_Bezier2: function (t, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY) {

            // Quadratic bezier curve plotter
            const [Bezier1_X, Bezier1_Y] = this.drawWord_Bezier1(t, startX, startY, control1X, control1Y, control2X, control2Y);
            const [Bezier2_X, Bezier2_Y] = this.drawWord_Bezier1(t, control1X, control1Y, control2X, control2Y, endX, endY);
            const x = ((1 - t) * Bezier1_X) + (t * Bezier2_X);
            const y = ((1 - t) * Bezier1_Y) + (t * Bezier2_Y);
            const [slope_mx, slope_my] = this.drawWord_BezierT(t, startX, startY, control1X, control1Y, control2X, control2Y, endX, endY);

            return { t: t, x: x, y: y, mX: slope_mx, mY: slope_my };
        },

        drawWord_Bezier1: function (t, startX, startY, control1X, control1Y, control2X, control2Y) {

            // linear bezier curve plotter; used recursivly in the quadratic bezier curve calculation
            const x = ((1 - t) * (1 - t) * startX) + (2 * (1 - t) * t * control1X) + (t * t * control2X);
            const y = ((1 - t) * (1 - t) * startY) + (2 * (1 - t) * t * control1Y) + (t * t * control2Y);
            return [x, y];

        }

    };

}


function startIt()
{
    const canvasDiv         = document.getElementById('canvasDiv');
    canvasDiv.innerHTML     = '<canvas id="layer0" width="300" height="300">Your browser does not support the canvas element.</canvas>'; // for IE
    const canvas            = document.getElementById('layer0');

    let ctx                 = canvas.getContext('2d');

    ctx.fillStyle           = "black";
    ctx.font                = "18px arial black";

    let curve               = document.getElementById('curve');
    let curveText           = document.getElementById('text');

    // $(curve).keyup(function(e) { changeCurve();} );
    // $(curveText).keyup(function(e) { changeCurve();} );

    if (first)
    {
        curvedWord = createCurvedWord(curveText.value, curve.value.split(','));
        canvasDiv.addEventListener('click', function(e) {
            console.log("mouse location: ", e.x, e.y)
            curvedWord.changeCoordinates(curve.value.split(','));
            curvedWord.changeText(curveText.value)
            curvedWord.draw(ctx, canvas.width, canvas.height);
        })

        // curvedWord.changeCoordinates(curve.value.split(','));
        curvedWord.draw(ctx, canvas.width, canvas.height);
        first = false;
    }

}

// global vars section

let first = true;
let curvedWord;



