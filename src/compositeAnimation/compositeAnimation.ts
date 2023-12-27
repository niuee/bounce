import { AnimatableAttributeHelper } from "../animatableAttribute";
import * as easeFunctions from "../easeFunctions";

export interface Animator{
    startAnimation(): void;
    stopAnimation(): void;
    pauseAnimation(): void;
    resumeAnimation(): void;
    getDuration(): number;
    animate(deltaTime: number): void;
}


export class CompositeAnimation implements Animator{

    private animations: Map<string, {animator: Animator, startTime?: number}>;
    private localTime: number;
    private duration: number;
    private onGoing: boolean;
    private loop: boolean;

    constructor(animations: Map<string, {animator: Animator, startTime?: number}>, loop: boolean = false){
        this.animations = animations;
        this.duration = 0;
        this.animations.forEach((animation)=>{
            if(animation.startTime == undefined){
                animation.startTime = 0;
            }
            const endTime = animation.startTime + animation.animator.getDuration();
            this.duration = Math.max(this.duration, endTime);
        });
        this.localTime = this.duration + 0.1;
        this.onGoing = false;
        this.loop = loop;
    }

    animate(deltaTime: number): void {
        if(this.onGoing && this.localTime <= this.duration){
            const prevLocalTime = this.localTime;
            this.localTime += deltaTime;
            this.animations.forEach((animation) => {
                if(animation.startTime == undefined){
                    animation.startTime = 0;
                }
                if(this.localTime < animation.startTime || this.localTime > animation.startTime + animation.animator.getDuration()){
                    if(prevLocalTime < animation.startTime + animation.animator.getDuration()){
                        animation.animator.animate(animation.startTime + animation.animator.getDuration() - prevLocalTime);
                        animation.animator.startAnimation();
                    }
                    return;
                }
                if(prevLocalTime < animation.startTime){
                    animation.animator.animate(this.localTime - animation.startTime);
                } else {
                    animation.animator.animate(deltaTime);
                }
            });
            if(this.localTime > this.duration && this.loop){
                this.localTime = 0;
            }
        }
    }

    pauseAnimation(): void {
        this.onGoing = false;
        this.animations.forEach((animation) => {
            animation.animator.pauseAnimation();
        });
    }

    resumeAnimation(): void {
        this.onGoing = true;
        this.animations.forEach((animation) => {
            animation.animator.resumeAnimation();
        });
    }

    startAnimation(): void {
        this.onGoing = true;
        this.localTime = 0;
        this.animations.forEach((animation) => {
            animation.animator.startAnimation();
        });
    }

    stopAnimation(): void {
        this.onGoing = false;
        this.localTime = this.duration + 0.1;
        this.animations.forEach((animation) => {
            animation.animator.stopAnimation();
        });
    }

    getDuration(): number {
        return this.duration;
    }
}

export class Animation<T> implements Animator{

    private localTime: number; // local time starting from 0 up til duration
    private duration: number;
    private keyframes: Keyframe<T>[];
    private animatableAttributeHelper: AnimatableAttributeHelper<T>;
    private applyAnimationValue: (value: T) => void;
    private easeFn: (percentage: number) => number;
    private onGoing: boolean;
    private currentKeyframeIndex: number;
    private loop: boolean;

    constructor(keyFrames: Keyframe<T>[], applyAnimationValue: (value: T) => void, animatableAttributeHelper: AnimatableAttributeHelper<T>, duration: number = 1, loop: boolean = false, easeFn: (percentage: number) => number = easeFunctions.linear){
        this.duration = duration;
        this.keyframes = keyFrames;
        this.animatableAttributeHelper = animatableAttributeHelper;
        this.applyAnimationValue = applyAnimationValue;
        this.easeFn = easeFn;
        this.onGoing = false;
        this.localTime = duration + 0.1;
        this.currentKeyframeIndex = 0;
        this.loop = loop;
    }

    startAnimation(){
        this.localTime = 0;
        this.currentKeyframeIndex = 0;
        this.onGoing = true;
    }

    stopAnimation(){
        this.onGoing = false;
        this.localTime = this.duration + 0.1;
    }

    pauseAnimation(): void {
        this.onGoing = false;
    }

    resumeAnimation(): void {
        this.onGoing = true;
    }

    animate(deltaTime: number){
        if(this.onGoing && this.localTime <= this.duration){
            this.localTime += deltaTime;
            let localDeltaTimePercentage = this.localTime / this.duration;
            let targetPercentage = this.easeFn(localDeltaTimePercentage);
            if (localDeltaTimePercentage > 1){
                targetPercentage = this.easeFn(1);
            }
            let value: any;
            if(this.currentKeyframeIndex < this.keyframes.length && this.keyframes[this.currentKeyframeIndex].percentage == targetPercentage){
                value = this.keyframes[this.currentKeyframeIndex].value;
            } else {
                value = this.findValue(targetPercentage, this.keyframes, this.animatableAttributeHelper);
            }
            while(this.currentKeyframeIndex < this.keyframes.length && this.keyframes[this.currentKeyframeIndex].percentage <= targetPercentage){
                this.currentKeyframeIndex += 1;
            }
            this.applyAnimationValue(value);
            if(this.localTime > this.duration && this.loop){
                this.localTime = 0;
                this.currentKeyframeIndex = 0;
            }
        }
    }

    findValue(valuePercentage: number, keyframes: Keyframe<T>[], animatableAttributeHelper: AnimatableAttributeHelper<T>): T{
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
        if(valuePercentage == 0.4){
            console.log("-----");
            console.log("start", keyframes[left - 1]);
            console.log("end", keyframes[left]);

        }
        return animatableAttributeHelper.lerp(valuePercentage, keyframes[left - 1], keyframes[left]);
    }

    getDuration(): number{
        return this.duration;
    }
}

export type Keyframe<T> = {
    percentage: number; // from 0 to 1;
    value: T;
}