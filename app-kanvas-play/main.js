






const width = window.innerWidth;
const height = window.innerHeight;

function createStage() {
    return new Konva.Stage({
        container: 'container',   // id of container <div>
        width: width,
        height: height,
        border: {},
    });
}

function createLayer() {
    return new Konva.Layer();
}

function createTransformer(node) {
    const tr = new Konva.Transformer({
        nodes: [node],
        centeredScaling: true,
        enabledAnchors: [
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
        ],
        visible: false,
    });
    tr.selected = false;
    return tr;
}

function createText(letter, fontSize, draggable) {

    const text = new Konva.Text({
        x: 100,
        y: 100,
        fontSize: fontSize,
        text: letter,
        draggable: draggable,
    });

    text.template = true;

    return text;
}


const stage = createStage();
const layer = createLayer();
stage.add(layer);



const upperCaseAlphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
// const upperCaseAlphabet = ['A', 'B', 'C'];
let currentLetterOffset = 10;
for (let i = 0; i < upperCaseAlphabet.length; i++) {

    const letter = createText(upperCaseAlphabet[i], 60, true);
    letter.x(currentLetterOffset);
    letter.y(height - 100);
    layer.add(letter);

    currentLetterOffset += (letter.getTextWidth() + 5)

    const tr = createTransformer(letter);
    layer.add(tr);


    letter.on('click', function() {
        console.log('mouse over letter: ' + letter.getAttr('text'));
        if (!letter.template) {

            tr.selected = !tr.selected;
            tr.visible(tr.selected);
            layer.draw();

        }

    });

    letter.on('dragend', function() {
        console.log('drag stopped with letter: ' + letter.getAttr('text'));

        if (letter.template) {

            letter.template = false; // is no longer a template because we are moving it
            const template = createText(letter.getAttr('text').toLowerCase(), letter.fontSize, false);
            template.x(100);
            template.y(100);
            template.visible(true);
            layer.add(template);
            layer.draw();

        }

    });

    letter.on('mousedown', function() {
        console.log('mouse down on letter: ' + letter.getAttr('text'));
    });

    letter.on('mouseup', function() {
        console.log('mouse up on text: ' + letter.getAttr('text'));
    });


}

layer.draw();
