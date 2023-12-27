import * as easeFunctions from "../easeFunctions";
import { AnimatableAttributeHelper } from "../animatableAttribute";

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

export type AnimationSequence<T> = {
    startTime?: number; // this is the time in parent group
    duration: number;
    keyframes: Keyframe<T>[];
    applyAnimationValue: (value: T) => void;
    animatableAttributeHelper: AnimatableAttributeHelper<T>;
    easeFn?: (percentage: number) => number;
    setUp?: Function;
    tearDown?: Function;
}

export class AnimationGroup{

    private startTime: number; // this is the time in parent group
    private localTime: number; // local time starting from 0 up til duration
    private duration: number;
    private keyframesList: AnimationSequence<any>[];
    private animationStartTimes: number[];
    private currentKeyframeIndex: number[];
    private loop: boolean;
    private onGoing: boolean;

    constructor(startTime: number = 0, keyframes: AnimationSequence<any>[], duration: number = 1, loop: boolean = false){
        this.startTime = startTime;
        this.duration = duration;
        this.keyframesList = keyframes;
        this.loop = loop;
        this.currentKeyframeIndex = Array(this.keyframesList.length).fill(0);
        this.animationStartTimes = Array(this.keyframesList.length).fill(0);
        this.onGoing = false;
        const computedDuration = this.keyframesList.reduce((currentMax, animationSequence, index) => {
            if(animationSequence.startTime == undefined){
                animationSequence.startTime = 0;
            }
            this.animationStartTimes[index] = animationSequence.startTime;
            const endTime = animationSequence.startTime + animationSequence.duration;
            return Math.max(currentMax, endTime);
        }, 0);
        this.duration = computedDuration;
        this.localTime = duration + 0.1;
    }

    setStartTime(startTime: number){
        if(!this.onGoing && this.localTime > this.duration){
            this.startTime = startTime;
        }
    }

    getStartTime(): number{
        return this.startTime;
    }

    getDuration(): number{
        return this.duration;
    }

    startAnimation(){
        this.localTime = 0;
        this.onGoing = true;
        this.currentKeyframeIndex = Array(this.keyframesList.length).fill(0);
        this.keyframesList.forEach((animationSequence, index) => {
            if(animationSequence.setUp != undefined){
                animationSequence.setUp();
            }
        });
        this.animate(0);
    }

    cancelAnimation(){
        this.localTime = this.duration + 0.1;
        this.currentKeyframeIndex = Array(this.keyframesList.length).fill(0);
        this.onGoing = false;
        this.keyframesList.forEach((animationSequence, index) => {
            if(animationSequence.tearDown != undefined){
                animationSequence.tearDown();
            }
        });
    }

    pauseAnimation(){
        this.onGoing = false;
    }

    resumeAnimation(){
        this.onGoing = true;
    }

    // delta time should be in seconds
    animate(deltaTime: number){
        if(this.localTime <= this.duration && this.onGoing){
            this.localTime += deltaTime;
            for(let index = 0; index < this.keyframesList.length; index++){
                const animationSequence = this.keyframesList[index];
                const animationStartTime = this.animationStartTimes[index];
                if(animationStartTime > this.localTime){
                    continue;
                }
                
                if (animationSequence.easeFn == undefined){
                    animationSequence.easeFn = easeFunctions.easeInOutSine;
                }
                let localDeltaTimePercentage = (this.localTime - animationStartTime) / animationSequence.duration;
                let targetPercentage = animationSequence.easeFn(localDeltaTimePercentage);
                if (localDeltaTimePercentage > 1){
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
            if(this.localTime > this.duration && this.loop){
                this.localTime = 0;
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
        if(!this.onGoing && this.localTime > this.duration){
            this.duration = duration;
        }
    }

    addAnimtaionSequence(animationSequence: AnimationSequence<any>){
        if (this.onGoing || (this.localTime < this.duration && this.localTime > 0)){
            return;
        }
        this.keyframesList.push(animationSequence);
        this.currentKeyframeIndex.push(0);
        this.duration = this.keyframesList.reduce((currentMax, animationSequence) => {
            if(animationSequence.startTime == undefined){
                animationSequence.startTime = 0;
            }
            const endTime = animationSequence.startTime + animationSequence.duration;
            return Math.max(currentMax, endTime);
        }, 0);
    }

    appendBufferTime(time: number){
        if (this.onGoing || (this.localTime < this.duration && this.localTime > 0)){
            return;
        }
        this.duration += time;
    }

    prependBufferTime(time: number){
        if (this.onGoing || (this.localTime < this.duration && this.localTime > 0)){
            return;
        }
        this.duration += time;
        this.keyframesList.forEach((animationSequence, index) => {
            if(animationSequence.startTime == undefined){
                animationSequence.startTime = 0;
            }
            this.animationStartTimes[index] = animationSequence.startTime + time;
        });
    }
}

export type AnimationSequenceLegacy<T> = {
    stagger?: {
        startPercentage: number;
        keyframePercentageIsRelative: boolean; // relative will gurantee to play the entire animation sequence from 0 percentage; // if not relative, the animation sequence will be played at the starting percentage. 
    }
    keyframes: Keyframe<T>[];
    applyAnimationValue: (value: T) => void;
    animatableAttributeHelper: AnimatableAttributeHelper<T>;
    easeFn?: (percentage: number) => number;
    setUp?: Function;
    tearDown?: Function;
}

export class AnimationGroupLegacy{

    private timePercentage: number;
    private duration: number;
    private keyframesList: AnimationSequenceLegacy<any>[];
    private currentKeyframeIndex: number[];
    private loop: boolean;
    private currentTime: number;
    private onGoing: boolean;

    constructor(keyframes: AnimationSequenceLegacy<any>[], duration: number = 1, loop: boolean = false){
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
        this.currentKeyframeIndex = Array(this.keyframesList.length).fill(0);
        this.keyframesList.forEach((animationSequence, index) => {
            if(animationSequence.setUp != undefined){
                animationSequence.setUp();
            }
        });
    }

    cancelAnimation(){
        this.timePercentage = 1.1;
        this.currentKeyframeIndex = Array(this.keyframesList.length).fill(0);
        this.onGoing = false;
        this.currentTime = 0;
        this.keyframesList.forEach((animationSequence, index) => {
            if(animationSequence.tearDown != undefined){
                animationSequence.tearDown();
            }
        });
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
                if(animationSequence.stagger != undefined && animationSequence.stagger.startPercentage > targetTimePercentage){
                    continue;
                }
                if (animationSequence.easeFn == undefined){
                    animationSequence.easeFn = easeFunctions.easeInOutSine;
                }
                let targetPercentage = animationSequence.easeFn(targetTimePercentage);
                if (animationSequence.stagger != undefined && animationSequence.stagger.keyframePercentageIsRelative){
                    targetPercentage =  animationSequence.easeFn((targetTimePercentage - animationSequence.stagger.startPercentage) / (1 - animationSequence.stagger.startPercentage));
                }
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