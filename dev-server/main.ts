import { PointCal, Point } from 'point2point';
import { integerHelperFunctions, numberHelperFunctions } from 'src';
import { Animation, CompositeAnimation, Keyframe } from 'src/composite-animation';
import { Board } from 'ue-too';


function init(): Board | undefined{
    const canvas = document.getElementById('graph') as HTMLCanvasElement;
    
    if(!canvas) {
        return;
    }

    const board = new Board(canvas);

    return board;
}

const utilBtn = document.getElementById('util-btn') as HTMLButtonElement;


const board = init();
board.alignCoordinateSystem = false;
const context = board?.context;

let radius = 10;

const keyframes: Keyframe<number>[] = [
    {
        percentage: 0,
        value: 10
    },
    {
        percentage: 1,
        value: 50
    }
];

const animation = new Animation(keyframes, (value) => {
    radius = value;    
}, numberHelperFunctions, 1000, true);

const img = new Image();
img.src = '/assets/iso-cube.png';

animation.maxLoopCount = 3;


let lastTimestamp = 0;
let rowIndex = 0;
let colIndex = 0;

const colKeyframes: Keyframe<number>[] = [
    {
        percentage: 0,
        value: 0
    },
    {
        percentage: 0.25,
        value: 1
    },
    {
        percentage: 0.5,
        value: 2
    },
    {
        percentage: 0.75,
        value: 3
    },
    {
        percentage: 1,
        value: 0
    }
];

let length = 100;
const colAnimation = new Animation(colKeyframes, (value) => {
    colIndex = value;
    length = value * 100;
}, integerHelperFunctions, 500, true);

const compositeAnimation = new CompositeAnimation();
compositeAnimation.loops = true;

compositeAnimation.maxLoopCount = 3;
utilBtn.addEventListener('click', () => {
    console.log('utilBtn clicked');
    compositeAnimation.start();
});

// compositeAnimation.addAnimation("radius", animation);
compositeAnimation.addAnimation("col", colAnimation);

function draw(timestamp: number){
    if(!board) {
        return;
    }

    board.step(timestamp);
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    compositeAnimation.animate(deltaTime);
    // context.beginPath();
    // context.arc(0, 0, 5 / board.camera.zoomLevel, 0, Math.PI * 2);
    // context.fill();
    drawArrow(context, board.camera.zoomLevel, {x: 0, y: 0}, {x: 0, y: length});
    drawArrow(context, board.camera.zoomLevel, {x: 0, y: 0}, {x: length, y: 0});
    const cos30 = Math.cos(Math.PI / 6);
    const cos60 = Math.cos(Math.PI / 3);
    context.save();

    context.transform(cos30, cos60, -cos30, cos60, 0, 0);
    context.arc(0, 0, 16, 0, Math.PI * 2);
    context.stroke();

    context.restore();
    context.beginPath();
    context.moveTo(0, 0);
    const point2 = pointConversion({x: 32, y: 0});
    context.lineTo(point2.x, point2.y);
    const point3 = pointConversion({x: 32, y: 32});
    context.lineTo(point3.x, point3.y);
    const point4 = pointConversion({x: 0, y: 32});
    context.lineTo(point4.x, point4.y);
    context.lineTo(0, 0);
    context.closePath();
    context.stroke();
    // if(img && img.complete) {
    //     for(let j = 0; j < 12; j++){
    //         for(let i = 0; i < 12; i++){
    //             // context.beginPath();
    //             // context.rect(j * 32, i * 32, img.width, img.height);
    //             // context.stroke();
    //             const point = pointConversion({x: j * (16 / Math.cos(Math.PI / 6)), y: i * (16 / Math.cos(Math.PI / 6))});
    //             context.drawImage(img, 0, 0, 32, 32, point.x, point.y, 32, 32);
    //         }
    //     }
    // }
    requestAnimationFrame(draw);
}


function drawArrow(context: CanvasRenderingContext2D, cameraZoomLevel: number, startPoint: Point, endPoint: Point, width: number = 1, arrowRatio: number = 0.3) {
    const length = PointCal.distanceBetweenPoints(startPoint, endPoint);
    const arrowHeight = 10 < length * cameraZoomLevel * 0.5 ? 10 / cameraZoomLevel : length * 0.5;
    const offsetLength = length - arrowHeight;
    const offsetPoint = PointCal.linearInterpolation(startPoint, endPoint, offsetLength / length);
    context.beginPath();
    context.lineWidth = width / cameraZoomLevel;
    context.moveTo(startPoint.x, startPoint.y);
    context.lineTo(offsetPoint.x, offsetPoint.y);
    context.stroke();
    const unitVector = PointCal.rotatePoint(PointCal.unitVectorFromA2B(endPoint, startPoint), Math.PI / 2);
    const arrowPoint1 = PointCal.addVector(offsetPoint, PointCal.multiplyVectorByScalar(unitVector, arrowHeight*0.5));
    const arrowPoint2 = PointCal.subVector(offsetPoint, PointCal.multiplyVectorByScalar(unitVector, arrowHeight*0.5));
    context.beginPath();
    context.moveTo(endPoint.x, endPoint.y);
    context.lineTo(arrowPoint1.x, arrowPoint1.y);
    context.lineTo(arrowPoint2.x, arrowPoint2.y);
    context.closePath();
    context.fill();
}

draw(0);

// isometric point to flat world point
function pointConversion(point: Point) {
    const cos30 = Math.cos(Math.PI / 6);
    const cos60 = Math.cos(Math.PI / 3);

    return {
        x: point.x * cos30 - point.y * cos30,
        y: point.x * cos60 + point.y * cos60
    }
}
