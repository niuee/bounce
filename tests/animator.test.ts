import { Point } from "point2point";
import { AnimationSequence, Keyframe, PointAnimationHelper, Animator, AnimationSeq } from "../src";
import * as EasingFunctions from "../src/easeFunctions";

export class AnimationMockClass {
    private position: Point;

    constructor(position: Point){
        this.position = position;
    }

    setPosition(destinationPos: Point){
        this.position = destinationPos;
    }

    getPosition(): Point{
        return this.position
    }
}

describe("Animator Tests", ()=>{

    let testAnimator: Animator;
    let exampleObj: AnimationMockClass;

    beforeEach(()=>{

        const positionKeyframes: Keyframe<Point>[] = [];

        positionKeyframes.push({percentage: 0, value: {x: 0, y: 0}});
        positionKeyframes.push({percentage: 0.5, value: {x: 3, y: 3}});
        positionKeyframes.push({percentage: 1, value: {x: 10, y: 10}});

        exampleObj = new AnimationMockClass({x: 0, y: 0});
        const positionAnimationSequence: AnimationSequence<Point> = {
            keyframes: positionKeyframes,
            applyAnimationValue: exampleObj.setPosition.bind(exampleObj),
            animatableAttributeHelper: new PointAnimationHelper(),
        };
        testAnimator = new Animator([positionAnimationSequence]);
    });

    test("Play Animation", ()=>{
        testAnimator.startAnimation();
        const deltaTime = 0.1;
        let time = 0;
        while (time <= 1){
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
        expect(exampleObj.getPosition()).toEqual({x: 10, y: 10});
    });

    test("Without starting an animation the animated attribute won't change", ()=>{
        const deltaTime = 0.1;
        let time = 0;
        while (time <= 1){
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
        expect(exampleObj.getPosition()).toEqual({x: 0, y: 0});
    });

    test("Canceling the animation would stop the animation", ()=>{
        const deltaTime = 0.1;
        let time = 0;
        testAnimator.startAnimation();
        let expectedPosition: Point = {x: 0, y: 0};
        while (time <= 1){
            if(time == 0.4){
                testAnimator.cancelAnimation();
                expectedPosition = exampleObj.getPosition();
            }
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
        expect(exampleObj.getPosition()).toEqual(expectedPosition);
    });

    test("Animation is played according to keyframes", ()=>{
        const deltaTime = 0.01;
        let time = 0;
        testAnimator.startAnimation();
        while (time <= 1){
            if(time == 0.5){
                expect(exampleObj.getPosition()).toEqual({x: 3, y: 3});
            }
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
    });

    test("Animation that will use the extrapolation in helper", ()=>{
        testAnimator.setEasingFunction(EasingFunctions.easeInOutBack);
        const deltaTime = 0.01;
        let time = 0;
        testAnimator.startAnimation();
        while (time <= 1){
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
    });

});

describe("AnimationSeq Tests", ()=>{

    let testAnimationSeq: AnimationSeq<Point>;
    let exampleObj: AnimationMockClass;

    beforeEach(()=>{

        const positionKeyframes: Keyframe<Point>[] = [];

        positionKeyframes.push({percentage: 0, value: {x: 0, y: 0}});
        positionKeyframes.push({percentage: 0.5, value: {x: 3, y: 3}});
        positionKeyframes.push({percentage: 1, value: {x: 10, y: 10}});

        exampleObj = new AnimationMockClass({x: 0, y: 0});
        const positionAnimationSequence: AnimationSequence<Point> = {
            keyframes: positionKeyframes,
            applyAnimationValue: exampleObj.setPosition.bind(exampleObj),
            animatableAttributeHelper: new PointAnimationHelper(),
        };
        testAnimationSeq = new AnimationSeq(positionKeyframes, new PointAnimationHelper(), exampleObj.setPosition.bind(exampleObj));
    });

    test("Play Animation", ()=>{
        testAnimationSeq.startAnimation();
        const deltaTime = 0.1;
        let time = 0;
        while (time <= 1){
            testAnimationSeq.animate(deltaTime);
            time += deltaTime;
        }
        expect(exampleObj.getPosition()).toEqual({x: 10, y: 10});
    });

    test("Without starting an animation the animated attribute won't change", ()=>{
        const deltaTime = 0.1;
        let time = 0;
        while (time <= 1){
            testAnimationSeq.animate(deltaTime);
            time += deltaTime;
        }
        expect(exampleObj.getPosition()).toEqual({x: 0, y: 0});
    });

    test("Canceling the animation would stop the animation", ()=>{
        const deltaTime = 0.1;
        let time = 0;
        testAnimationSeq.startAnimation();
        let expectedPosition: Point = {x: 0, y: 0};
        while (time <= 1){
            if(time == 0.4){
                testAnimationSeq.cancelAnimation();
                expectedPosition = exampleObj.getPosition();
            }
            testAnimationSeq.animate(deltaTime);
            time += deltaTime;
        }
        expect(exampleObj.getPosition()).toEqual(expectedPosition);
    });

    test("Animation is played according to keyframes", ()=>{
        const deltaTime = 0.01;
        let time = 0;
        testAnimationSeq.startAnimation();
        while (time <= 1){
            if(time == 0.5){
                expect(exampleObj.getPosition()).toEqual({x: 3, y: 3});
            }
            testAnimationSeq.animate(deltaTime);
            time += deltaTime;
        }
    });

    test("Animation that will use the extrapolation in helper", ()=>{
        testAnimationSeq.setEasingFunction(EasingFunctions.easeInOutBack);
        const deltaTime = 0.01;
        let time = 0;
        testAnimationSeq.startAnimation();
        while (time <= 1){
            testAnimationSeq.animate(deltaTime);
            time += deltaTime;
        }
    });

})