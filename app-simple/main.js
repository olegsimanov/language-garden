// global vars section

let first = true;       // make sure we initialize everything only once

let canvas;             // width and height
let ctx;                // we use this to draw

let letters = [];
let fixedLetters = []


// ---------------------------------------------------------------------------------------------------------------------
// mouse handling logic
// ---------------------------------------------------------------------------------------------------------------------

let mouseButtonIsDown       = false;
let mouse_X                 = -1;
let mouse_Y                 = -1;
let objectUnderMouseCursor  = null;

function mouseMove(e) {

    if (!mouseButtonIsDown) {

        objectUnderMouseCursor = letters.find(l => l.isMouseCursorOverMe(e.offsetX, e.offsetY));

    } else if (mouseButtonIsDown) {

        // if (objectUnderMouseCursor !== null) {
        //     const whatToDoWithMouse = objectUnderMouseCursor.reactToMouseCoordinatesChanges(mouse_X, mouse_Y, e.offsetX, e.offsetY);
        // }

        // ctx.clearRect(0, 0, canvas.width, canvas.height);

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


function init() {

    const canvasDiv = document.getElementById('canvasDiv');
    canvasDiv.innerHTML = '<canvas id="layer0" width="1000" height="800">Your browser does not support the canvas element.</canvas>'; // for IE

    canvas = document.getElementById('layer0');

    canvas.addEventListener('click', mouseClick)
    canvas.addEventListener('mousedown', mouseButtonDown)
    canvas.addEventListener('mouseup', mouseButtonUp)
    canvas.addEventListener('mousemove', mouseMove)

    ctx = canvas.getContext('2d');

    ctx.fillStyle = "black";
    // ctx.font                = "200px language_garden_regular";
    // ctx.font                = "20px language_garden_regular";
    ctx.font = "80px language_garden_regular";
    // ctx.font                = "40px arial";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

}

function startIt() {

    if (!first) {
        return;
    }
    init();

    first = false;

}




