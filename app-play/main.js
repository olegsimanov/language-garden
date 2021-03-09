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
    // canvas to draw on
    // ---------------------------------------------------------------------------------------------------------------------

    app.width           = width;
    app.height          = height;
    app.ctx             = ctx;            // we use this to draw

    // ---------------------------------------------------------------------------------------------------------------------
    // mouse functions and data
    // ---------------------------------------------------------------------------------------------------------------------

    app.mouse_X         = 0;
    app.mouse_Y         = 0;

    app.mouseClick      = function(mouseEvent) {}
    app.mouseButtonDown = function(mouseEvent) {}
    app.mouseButtonUp   = function(mouseEvent) {}
    app.mouseMove       = function(mouseEvent) {

        app.mouse_X = mouseEvent.offsetX;
        app.mouse_Y = mouseEvent.offsetY;

        app.repaint();

    }

    // ---------------------------------------------------------------------------------------------------------------------
    // graphical elements
    // ---------------------------------------------------------------------------------------------------------------------

    app.repaint = function() {

        ctx.clearRect(0, 0, width, height);
        app.draw();

    }

    app.draw = function() {

        app.drawBorder();
        app.drawMouseCross();
        app.drawSymbol();

    }

    app.drawBorder = function() {

        ctx.save();

        ctx.beginPath();
        ctx.strokeStyle = "orange";
        ctx.lineWidth = 5;
        ctx.moveTo(0, 0)
        ctx.lineTo(0, height);
        ctx.lineTo(width, height);
        ctx.lineTo(width, 0)
        ctx.closePath();
        ctx.stroke();

        ctx.restore();

    }

    app.drawMouseCross = function() {

        ctx.save()

        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.lineWidth = 1;
        ctx.moveTo(app.mouse_X, 0);
        ctx.lineTo(app.mouse_X, height);
        ctx.moveTo(0, app.mouse_Y);
        ctx.lineTo(width, app.mouse_Y);
        ctx.moveTo(app.mouse_X, 0);
        ctx.closePath();
        ctx.stroke();

        ctx.fillText("[" + app.mouse_X + ", " + app.mouse_Y + "]", 0, height);

        ctx.restore();


    }

    app.drawSymbol = function() {


        let canvasMiddleX = width / 2;
        let canvasMiddleY = height  / 2;
        const angle = 45 * Math.PI / 180

        ctx.save();


        // ctx.translate(middleX, middleY);
        // ctx.rotate(angle);
        // ctx.fillText("A", 0, 0);
        ctx.font = "200px language_garden_regular";
        ctx.fillText("A", canvasMiddleX, canvasMiddleY);

        ctx.restore();

    }

    app.repaint();

    return app;

}
