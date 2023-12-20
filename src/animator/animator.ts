import * as easeFunctions from "../easeFunctions";
import { AnimatableAttributeHelper } from "../animatableAttribute";
import { Point } from "point2point";

export type Keyframe<T> = {
    percentage: number; // from 0 to 1;
    value: T;
}

export type AnimationSequence<T> = {
    startPercentage?:number;
    keyframes: Keyframe<T>[];
    applyAnimationValue: (value: T) => void;
    animatableAttributeHelper: AnimatableAttributeHelper<T>;
    easeFn?: (percentage: number) => number;
}

export class AnimationGroup{

    private timePercentage: number;
    private duration: number;
    private keyframesList: AnimationSequence<any>[];
    private currentKeyframeIndex: number[];
    private loop: boolean;
    private currentTime: number;
    private onGoing: boolean;

    constructor(keyframes: AnimationSequence<any>[], duration: number = 1, loop: boolean = false){
        this.timePercentage = 1.1;
        this.duration = duration;
        this.keyframesList = keyframes;
        this.loop = loop;
        this.currentKeyframeIndex = Array(this.keyframesList.length).fill(0);
        this.currentTime = 0;
        this.onGoing = false;
    }

    startAnimation(){
        this.timePercentage = 0;
        this.currentTime = 0;
        this.onGoing = true;
    }

    cancelAnimation(){
        this.timePercentage = 1.1;
        this.currentKeyframeIndex = Array(this.keyframesList.length).fill(0);
        this.onGoing = false;
        this.currentTime = 0;
    }

    pauseAnimation(){
        this.onGoing = false;
    }

    resumeAnimation(){
        this.onGoing = true;
    }

    // delta time should be in seconds
    animate(deltaTime: number){
        if(this.timePercentage <= 1 && this.onGoing){
            this.currentTime += deltaTime;
            let currentDeltaTimePercentage = deltaTime / this.duration;
            let targetTimePercentage = this.timePercentage + currentDeltaTimePercentage;
            for(let index = 0; index < this.keyframesList.length; index++){
                const animationSequence = this.keyframesList[index];
                if(animationSequence.startPercentage != undefined && animationSequence.startPercentage > this.timePercentage){
                    continue;
                }
                if (animationSequence.easeFn == undefined){
                    animationSequence.easeFn = easeFunctions.easeInOutSine;
                }
                let targetPercentage = animationSequence.easeFn(targetTimePercentage);
                if (targetTimePercentage > 1){
                    targetPercentage = animationSequence.easeFn(1);
                }
                const curFrameNumber = this.currentKeyframeIndex[index];
                let value: any;
                if(curFrameNumber < animationSequence.keyframes.length && animationSequence.keyframes[curFrameNumber].percentage == targetPercentage){
                    value = animationSequence.keyframes[curFrameNumber].value;
                } else {
                    value = this.findValue(targetPercentage, animationSequence.keyframes, animationSequence.animatableAttributeHelper);
                }
                while(this.currentKeyframeIndex[index] < animationSequence.keyframes.length && animationSequence.keyframes[this.currentKeyframeIndex[index]].percentage <= targetPercentage){
                    this.currentKeyframeIndex[index] += 1;
                }
                animationSequence.applyAnimationValue(value);
            }
            this.timePercentage = targetTimePercentage;
            if(this.timePercentage > 1 && this.loop){
                this.timePercentage = 0;
            }
        }
    }

    findValue(valuePercentage: number, keyframes: Keyframe<any>[], animatableAttributeHelper: AnimatableAttributeHelper<any>): any{
        if(valuePercentage > 1){
            return animatableAttributeHelper.lerp(valuePercentage, keyframes[keyframes.length - 2], keyframes[keyframes.length - 1]);
        }
        if(valuePercentage < 0){
            return animatableAttributeHelper.lerp(valuePercentage, keyframes[1], keyframes[0]);
        }
        let left = 0;
        let right = keyframes.length - 1;
        while (left <= right) {
            let mid = left + Math.floor((right - left) / 2);
            if(keyframes[mid].percentage == valuePercentage) {
                return keyframes[mid].value;
            } else if(keyframes[mid].percentage < valuePercentage){
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return animatableAttributeHelper.lerp(valuePercentage, keyframes[left - 1], keyframes[left]);
    }

    setDuration(duration: number){
        if(!this.onGoing && this.currentTime == 0){
            this.duration = duration;
        }
    }

}
