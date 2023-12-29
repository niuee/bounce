import { AnimatableAttributeHelper } from "../animatableAttribute";
import * as easeFunctions from "../easeFunctions";

export interface Animator{
    startAnimation(): void;
    stopAnimation(): void;
    pauseAnimation(): void;
    resumeAnimation(): void;
    getDuration(): number;
    animate(deltaTime: number): void;
    setUp(): void;
    tearDown(): void;
    loops(): boolean;
    setParent(parent: AnimatorContainer): void;
    detachParent(): void;
}

export interface AnimatorContainer {
    updateDuration(): void;
}

export class CompositeAnimation implements Animator, AnimatorContainer{

    private animations: Map<string, {animator: Animator, startTime?: number}>;
    private localTime: number;
    private duration: number;
    private onGoing: boolean;
    private loop: boolean;
    private setUpFn: Function;
    private tearDownFn: Function;
    private dragTime: number;
    private delayTime: number;
    private parent: AnimatorContainer | undefined;

    constructor(animations: Map<string, {animator: Animator, startTime?: number}>, loop: boolean = false, parent: AnimatorContainer | undefined = undefined, setupFn: Function = ()=>{}, tearDownFn: Function = ()=>{}){
        this.animations = animations;
        this.duration = 0;
        this.calculateDuration();
        this.localTime = this.duration + 0.1;
        this.onGoing = false;
        this.loop = loop;
        this.setUpFn = setupFn;
        this.tearDownFn = tearDownFn;
        this.delayTime = 0;
        this.dragTime = 0;
        this.parent = parent;
        this.animations.forEach((animation) => {
            animation.animator.setParent(this);
        });
    }
    
    setParent(parent: AnimatorContainer){
        this.parent = parent;
    }

    detachParent(){
        this.parent = undefined;
    }

    animate(deltaTime: number): void {
        if(!this.onGoing || this.localTime > this.duration + this.delayTime + this.dragTime){
            return;
        }
        this.localTime += deltaTime;
        this.animateChildren(deltaTime);
        this.checkTerminalAndLoop();
    }

    checkTerminalAndLoop(){
        if(this.localTime > this.duration + this.delayTime + this.dragTime){
            this.onGoing = false;
        }
        if(this.localTime > this.duration + this.delayTime + this.dragTime && this.loop){
            this.localTime = 0;
            this.onGoing = true;
        }
    }

    animateChildren(deltaTime: number){
        const prevLocalTime = this.localTime - deltaTime;
        if(this.localTime < this.delayTime){
            return;
        }
        this.animations.forEach((animation) => {
            if(animation.startTime == undefined){
                animation.startTime = 0;
            }
            if(!this.childShouldAnimate(animation, prevLocalTime)){
                this.wrapUpAnimator(animation, prevLocalTime);
                return;
            }
            if(prevLocalTime - this.delayTime < animation.startTime){
                animation.animator.animate(this.localTime - this.delayTime - animation.startTime);
            } else {
                animation.animator.animate(deltaTime);
            }
        });
    }

    childShouldAnimate(animation: {animator: Animator, startTime?: number}, prevLocalTime: number): boolean{
        if(animation.startTime == undefined){
            animation.startTime = 0;
        }
        if(this.localTime - this.delayTime >= animation.startTime && this.localTime - this.delayTime <= animation.startTime + animation.animator.getDuration()){
            return true;
        }
        return false;
    }

    wrapUpAnimator(animation: {animator: Animator, startTime?: number}, prevLocalTime: number){
        if(animation.startTime == undefined){
            animation.startTime = 0;
        }
        if(this.localTime - this.delayTime > animation.startTime + animation.animator.getDuration() && prevLocalTime - this.delayTime < animation.startTime + animation.animator.getDuration()){
            animation.animator.animate(animation.startTime + animation.animator.getDuration() - (prevLocalTime - this.delayTime));
            if(animation.animator.loops()){
                animation.animator.startAnimation();
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
        this.setUp();
        if(this.localTime > 0){
            this.localTime = 0;
        }
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
        this.tearDown();
    }

    getDuration(): number {
        return this.duration + this.delayTime + this.dragTime;
    }

    getTrueDuration(): number{
        return this.duration;
    }

    setUp(): void {
        this.setUpFn();
        this.animations.forEach((animation) => {
            animation.animator.setUp();
        });
    }

    tearDown(): void {
        this.tearDownFn();
        this.animations.forEach((animation) => {
            animation.animator.tearDown();
        });  
    }

    addAnimation(name: string, animation: Animator, startTime: number = 0){
        this.animations.set(name, {animator: animation, startTime: startTime});
        if(this.localTime > startTime){
            animation.animate(this.localTime - startTime);
        }
        animation.setParent(this);
        const endTime = startTime + animation.getDuration();
        this.duration = Math.max(this.duration, endTime);
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    addAnimationAfter(name: string, animation: Animator, afterName: string, delay: number = 0){
        let afterAnimation = this.animations.get(afterName);
        if(afterAnimation == undefined){
            return;
        }
        if(afterAnimation.startTime == undefined){
            afterAnimation.startTime = 0;
        }
        let startTime = afterAnimation.startTime + afterAnimation.animator.getDuration();
        startTime += delay;
        this.addAnimation(name, animation, startTime);
        this.calculateDuration();
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    addAnimationAdmist(name: string, animation: Animator, admistName: string, delay: number){
        let admistAnimation = this.animations.get(admistName);
        if(admistAnimation == undefined){
            return;
        }
        if(admistAnimation.startTime == undefined){
            admistAnimation.startTime = 0;
        }
        let startTime = admistAnimation.startTime + delay;
        this.addAnimation(name, animation, startTime);
        this.calculateDuration();
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    addAnimationBefore(name: string, animation: Animator, beforeName: string, aheadTime: number = 0){
        let beforeAnimation = this.animations.get(beforeName);
        if(beforeAnimation == undefined){
            return;
        }
        if(beforeAnimation.startTime == undefined){
            beforeAnimation.startTime = 0;
        }
        let startTime = beforeAnimation.startTime;
        startTime -= aheadTime;
        this.addAnimation(name, animation, startTime);
        if (startTime < 0){
            const pushOver = 0 - startTime;
            this.animations.forEach((animation) => {
                if(animation.startTime == undefined){
                    animation.startTime = 0;
                }
                animation.startTime += pushOver;
            });
        }
        this.calculateDuration();
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    removeAnimation(name: string){
        let animation = this.animations.get(name);
        let deleted = this.animations.delete(name);
        if(deleted){
            if(animation != undefined){
                animation.animator.detachParent();
            }
            this.calculateDuration();
            if(this.parent != undefined){
                this.parent.updateDuration();
            }
        }
    }

    delay(delayTime: number){
        this.delayTime = delayTime;
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    drag(dragTime: number){
        this.dragTime = dragTime;
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    updateDuration(): void {
        this.calculateDuration();
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    calculateDuration(){
        this.duration = 0;
        this.animations.forEach((animation)=>{
            if(animation.startTime == undefined){
                animation.startTime = 0;
            }
            const endTime = animation.startTime + animation.animator.getDuration();
            this.duration = Math.max(this.duration, endTime);
        });
    }

    loops(): boolean {
        return this.loop;
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
    private setUpFn: Function;
    private tearDownFn: Function;
    private parent: AnimatorContainer | undefined;

    constructor(keyFrames: Keyframe<T>[], applyAnimationValue: (value: T) => void, animatableAttributeHelper: AnimatableAttributeHelper<T>, duration: number = 1, loop: boolean = false, parent: AnimatorContainer | undefined = undefined, setUpFn: Function = ()=>{}, tearDownFn: Function = ()=>{}, easeFn: (percentage: number) => number = easeFunctions.linear){
        this.duration = duration;
        this.keyframes = keyFrames;
        this.animatableAttributeHelper = animatableAttributeHelper;
        this.applyAnimationValue = applyAnimationValue;
        this.easeFn = easeFn;
        this.onGoing = false;
        this.localTime = duration + 0.1;
        this.currentKeyframeIndex = 0;
        this.loop = loop;
        this.setUpFn = setUpFn;
        this.tearDownFn = tearDownFn;
        this.parent = parent;
    }

    startAnimation(){
        this.localTime = 0;
        this.currentKeyframeIndex = 0;
        this.onGoing = true;
        this.setUp();
    }

    stopAnimation(){
        this.onGoing = false;
        this.localTime = this.duration + 0.1;
        this.tearDown();
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
            let localTimePercentage = this.localTime / this.duration;
            let targetPercentage = this.easeFn(localTimePercentage);
            if (localTimePercentage > 1){
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
            if(this.localTime >= this.duration){
                this.onGoing = false;
            }
            if(this.localTime >= this.duration && this.loop){
                this.localTime = 0;
                this.currentKeyframeIndex = 0;
                this.onGoing = true;
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
        return animatableAttributeHelper.lerp(valuePercentage, keyframes[left - 1], keyframes[left]);
    }

    getDuration(): number{
        return this.duration;
    }

    setDuration(duration: number){
        this.duration = duration;
        if(this.parent !== undefined){
            this.parent.updateDuration();
        }
    }

    setUp(): void {
        this.setUpFn();
    }

    tearDown(): void {
        this.tearDownFn(); 
    }

    loops(): boolean {
        return this.loop;
    }

    setParent(parent: AnimatorContainer){
        this.parent = parent;
    }

    detachParent(): void {
        this.parent = undefined;
    }
}

export type Keyframe<T> = {
    percentage: number; // from 0 to 1;
    value: T;
}