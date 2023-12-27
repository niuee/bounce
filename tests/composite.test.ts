import {Animation, Animator, CompositeAnimation, AnimationSequence, Keyframe, PointAnimationHelper, NumberAnimationHelper} from "../src";
import { Point } from "point2point";


class AnimationMockClass {
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

describe("Animation Class Tests", ()=>{

    let testAnimator: Animation<Point>;
    let exampleObj: AnimationMockClass;

    beforeEach(()=>{

        const positionKeyframes: Keyframe<Point>[] = [];

        positionKeyframes.push({percentage: 0, value: {x: 0, y: 0}});
        positionKeyframes.push({percentage: 0.5, value: {x: 3, y: 3}});
        positionKeyframes.push({percentage: 1, value: {x: 10, y: 10}});

        exampleObj = new AnimationMockClass({x: 0, y: 0});
        const positionAnimationSequence: AnimationSequence<Point> = {
            duration: 1,
            keyframes: positionKeyframes,
            applyAnimationValue: (value: Point) => {exampleObj.setPosition(value);},
            animatableAttributeHelper: new PointAnimationHelper(),
        };
        testAnimator = new Animation(positionKeyframes, (value: Point)=>{exampleObj.setPosition(value)}, new PointAnimationHelper());
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

    test("Stopping the animation would stop the animation", ()=>{
        const deltaTime = 0.1;
        let time = 0;
        testAnimator.startAnimation();
        let expectedPosition: Point = {x: 0, y: 0};
        while (time <= 1){
            if(time == 0.4){
                testAnimator.stopAnimation();
                expectedPosition = exampleObj.getPosition();
            }
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
        expect(exampleObj.getPosition()).toEqual(expectedPosition);
    });

    test("Animation is played according to keyframes", ()=>{
        const deltaTime = 0.1;
        let time = 0;
        testAnimator.startAnimation();
        while (time <= 1){
            if(time == 0.5){
                expect(exampleObj.getPosition().x).toBeCloseTo(3);
                expect(exampleObj.getPosition().y).toBeCloseTo(3);
            }
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
    });

    test("Animation that will use the extrapolation in helper", ()=>{
        const deltaTime = 0.01;
        let time = 0;
        testAnimator.startAnimation();
        while (time <= 1){
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
    });

});

describe("Composite Animation Tests", ()=>{

    let testAnimator: CompositeAnimation;
    let firstAnimation: Animation<Point>;
    let secondAnimation: Animation<number>;
    let exampleObj: AnimationMockClass;
    let animatedNumber: number;

    beforeEach(()=>{
        animatedNumber = 0;
        const positionKeyframes: Keyframe<Point>[] = [];

        positionKeyframes.push({percentage: 0, value: {x: 0, y: 0}});
        positionKeyframes.push({percentage: 0.5, value: {x: 3, y: 3}});
        positionKeyframes.push({percentage: 1, value: {x: 10, y: 10}});
        let numberKeyframes: Keyframe<number>[] = [
            {percentage: 0, value: 0},
            {percentage: 0.5, value: 3},
            {percentage: 1, value: 10},
        ];
        exampleObj = new AnimationMockClass({x: 0, y: 0});
        firstAnimation = new Animation(positionKeyframes, (value: Point)=>{exampleObj.setPosition(value)}, new PointAnimationHelper());
        secondAnimation = new Animation(numberKeyframes, (value: number)=>{animatedNumber = value}, new NumberAnimationHelper());
        let animationMap = new Map<string, {animator: Animator, startTime: number}>();
        animationMap.set("first", {animator: firstAnimation, startTime: 0});
        animationMap.set("second", {animator: secondAnimation, startTime: 0});
        testAnimator = new CompositeAnimation(animationMap);
    });

    test("Without starting an animation the animated attribute won't change", ()=>{
        const deltaTime = 0.1;
        let time = 0;
        while (time <= 1){
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
        expect(exampleObj.getPosition()).toEqual({x: 0, y: 0});
        expect(animatedNumber).toEqual(0);
    });

    test("Stopping the animation would stop the animation", ()=>{
        const deltaTime = 0.1;
        let time = 0;
        testAnimator.startAnimation();
        let expectedPosition: Point = {x: 0, y: 0};
        let expectedNumber: number = 0;
        while (time <= 1){
            if(time == 0.4){
                testAnimator.pauseAnimation();
                expectedPosition = exampleObj.getPosition();
                expectedNumber = animatedNumber;
            }
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
        expect(exampleObj.getPosition()).toEqual(expectedPosition);
        expect(animatedNumber).toBeCloseTo(2.4);
    });

    test("Animation is played according to keyframes", ()=>{
        const deltaTime = 0.1;
        let time = 0;
        testAnimator.startAnimation();
        while (time <= 1){
            if(time == 0.5){
                expect(exampleObj.getPosition().x).toBeCloseTo(3);
                expect(exampleObj.getPosition().y).toBeCloseTo(3);
                expect(animatedNumber).toBeCloseTo(3);
            }
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
    });

    test("Animation that will use the extrapolation in helper", ()=>{
        const deltaTime = 0.01;
        let time = 0;
        testAnimator.startAnimation();
        while (time <= 1){
            testAnimator.animate(deltaTime);
            time += deltaTime;
        }
    });

});