import { AnimatableAttributeHelper } from "../animatable-attribute";
import * as easeFunctions from "../ease-functions";

export interface Animator{
    loops: boolean;
    duration: number;
    startAnimation(): void;
    stopAnimation(): void;
    pauseAnimation(): void;
    resumeAnimation(): void;
    animate(deltaTime: number): void;
    setUp(): void;
    tearDown(): void;
    setParent(parent: AnimatorContainer): void;
    detachParent(): void;
    toggleReverse(reverse: boolean): void;
    playing: boolean;
}

export interface AnimatorContainer {
    updateDuration(): void;
    checkCyclicChildren(): boolean;
    containsAnimation(animationInInterest: Animator): boolean;
}

export class CompositeAnimation implements Animator, AnimatorContainer{

    private animations: Map<string, {animator: Animator, startTime?: number}>;
    private localTime: number;
    private _duration: number;
    private onGoing: boolean;
    private loop: boolean;
    private setUpFn: Function;
    private tearDownFn: Function;
    private dragTime: number;
    private delayTime: number;
    private parent: AnimatorContainer | undefined;

    private callbacks: Map<string, Function[]>;

    private reverse: boolean;

    constructor(animations: Map<string, {animator: Animator, startTime?: number}> = new Map(), loop: boolean = false, parent: AnimatorContainer | undefined = undefined, setupFn: Function = ()=>{}, tearDownFn: Function = ()=>{}){
        this.animations = animations;
        this._duration = 0;
        this.calculateDuration();
        this.localTime = this._duration + 0.1;
        this.onGoing = false;
        this.loop = loop;
        this.setUpFn = setupFn;
        this.tearDownFn = tearDownFn;
        this.delayTime = 0;
        this.dragTime = 0;
        this.parent = parent;
        this.callbacks = new Map();
        this.animations.forEach((animation) => {
            animation.animator.setParent(this);
        });
        this.reverse = false;
        console.log("Composite Animation created");
    }

    toggleReverse(reverse: boolean){
        if(this.reverse == reverse){
            return;
        }
        this.reverse = reverse;
        this.animations.forEach((animation) => {
            animation.animator.toggleReverse(reverse);
        });
    }
    
    setParent(parent: AnimatorContainer){
        this.parent = parent;
    }

    detachParent(){
        this.parent = undefined;
    }

    animate(deltaTime: number): void {
        if(!this.onGoing || this.localTime > this._duration + this.delayTime + this.dragTime || this.localTime < 0 || this.animations.size == 0){
            return;
        }
        this.localTime += deltaTime;
        this.animateChildren(deltaTime);
        this.checkTerminalAndLoop();
    }

    checkTerminalAndLoop(){
        if(this.localTime > this._duration + this.delayTime + this.dragTime){
            this.onGoing = false;
        }
        if(this.localTime > this._duration + this.delayTime + this.dragTime && this.loop){
            this.localTime = 0;
            this.onGoing = true;
        }
    }

    animateChildren(deltaTime: number){
        const prevLocalTime = this.localTime - deltaTime;
        if(this.localTime < this.delayTime){
            return;
        }
        this.animations.forEach((animation, name: string) => {
            if(animation.startTime == undefined){
                animation.startTime = 0;
            }
            if(!this.childShouldAnimate(animation, prevLocalTime)){
                this.wrapUpAnimator({animator: animation.animator, startTime: animation.startTime, name: name}, prevLocalTime);
                return;
            }
            if(prevLocalTime - this.delayTime < animation.startTime){
                animation.animator.animate(this.localTime - this.delayTime - animation.startTime);
            } else {
                animation.animator.animate(deltaTime);
            }
            if(this.localTime == animation.startTime + animation.animator.duration){
                console.log("animation played to the end");
            }
        });
    }

    childShouldAnimate(animation: {animator: Animator, startTime?: number}, prevLocalTime: number): boolean{
        if(animation.startTime == undefined){
            animation.startTime = 0;
        }
        if(this.localTime - this.delayTime >= animation.startTime && this.localTime - this.delayTime <= animation.startTime + animation.animator.duration){
            return true;
        }
        return false;
    }

    wrapUpAnimator(animation: {animator: Animator, startTime?: number, name: string}, prevLocalTime: number){
        if(animation.startTime == undefined){
            animation.startTime = 0;
        }
        if(this.localTime - this.delayTime > animation.startTime + animation.animator.duration && prevLocalTime - this.delayTime < animation.startTime + animation.animator.duration){
            animation.animator.animate(animation.startTime + animation.animator.duration - (prevLocalTime - this.delayTime));
            this.callbacks.get(animation.name)?.forEach((callback) => {
                callback();
            });
            if(animation.animator.loops){
                console.log("looping reset");
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
        this.localTime = this._duration + 0.1;
        this.animations.forEach((animation) => {
            animation.animator.stopAnimation();
        });
        this.tearDown();
    }

    get duration(): number {
        return this._duration + this.delayTime + this.dragTime;
    }

    // delayTime and dragTime are 
    set duration(duration: number) {
        if(duration < 0){
            return;
        }
        const originalDuration = this._duration + this.delayTime + this.dragTime;
        const scale = duration / originalDuration;
        const newDelayTime = this.delayTime * scale;
        const newDragTime = this.dragTime * scale;
        this.delayTime = newDelayTime;
        this.dragTime = newDragTime;
        this.animations.forEach((animation)=>{
            if(animation.startTime == undefined){
                animation.startTime = 0;
            }
            animation.startTime *= scale;
            animation.animator.duration *= scale;
        });
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    getTrueDuration(): number{
        return this._duration;
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

    addAnimation(name: string, animation: Animator, startTime: number = 0, endCallback: Function = ()=>{}){
        if(this.animations.has(name)){
            return;
        }
        if(this.parent !== undefined && this.parent.containsAnimation(animation)){
            return;
        }
        this.animations.set(name, {animator: animation, startTime: startTime});
        console.log("animation name", name);
        if(this.callbacks.get(name) == undefined || this.callbacks.get(name).length == 0){
            this.callbacks.set(name, []);
        }
        this.callbacks.get(name)?.push(endCallback);
        animation.setParent(this);
        if(this.localTime > startTime){
            animation.animate(this.localTime - startTime);
        }
        const endTime = startTime + animation.duration;
        this._duration = Math.max(this._duration, endTime);
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
        let startTime = afterAnimation.startTime + afterAnimation.animator.duration;
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

    removeDelay(){
        this.delayTime = 0;
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    removeDrag(){
        this.dragTime = 0;
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    updateDuration(): void {
        if(this.checkCyclicChildren()){
            return;
        }
        this.calculateDuration();
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    calculateDuration(){
        this._duration = 0;
        this.animations.forEach((animation)=>{
            if(animation.startTime == undefined){
                animation.startTime = 0;
            }
            const endTime = animation.startTime + animation.animator.duration;
            this._duration = Math.max(this._duration, endTime);
        });
    }
    
    get loops(): boolean {
        return this.loop;
    }

    set loops(loop: boolean) {
        this.loop = loop;
    }

    checkCyclicChildren(): boolean {
        const allChildren: Animator[] = [];
        allChildren.push(this);
        const visited = new Set<Animator>();
        while(allChildren.length > 0){
            const current = allChildren.pop();
            if(current == undefined){
                continue;
            }
            if(visited.has(current)){
                return true;
            }
            visited.add(current);
            if(current instanceof CompositeAnimation){
                current.animations.forEach((animation) => {
                    allChildren.push(animation.animator);
                });
            }
        }
        return false;
    }

    containsAnimation(animationInInterest: Animator): boolean {
        if(this.parent !== undefined){
            return this.parent.containsAnimation(animationInInterest);
        }
        const allChildren: Animator[] = [];
        allChildren.push(this);
        const visited = new Set<Animator>();
        while(allChildren.length > 0){
            const current = allChildren.pop();
            if(current == undefined){
                continue;
            }
            if(current == animationInInterest){
                return true;
            }
            if(visited.has(current)){
                continue;
            }
            visited.add(current);
            if(current instanceof CompositeAnimation){
                current.animations.forEach((animation) => {
                    allChildren.push(animation.animator);
                });
            }
        }
        return false;
    }

    get playing(): boolean {
        return this.onGoing;
    }
}

export class Animation<T> implements Animator{

    private localTime: number; // local time starting from 0 up til duration
    private _duration: number;
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
    private delayTime: number = 0;
    private dragTime: number = 0;

    private reverse: boolean = false;

    constructor(keyFrames: Keyframe<T>[], applyAnimationValue: (value: T) => void, animatableAttributeHelper: AnimatableAttributeHelper<T>, duration: number = 1, loop: boolean = false, parent: AnimatorContainer | undefined = undefined, setUpFn: Function = ()=>{}, tearDownFn: Function = ()=>{}, easeFn: (percentage: number) => number = easeFunctions.linear){
        this._duration = duration;
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

    toggleReverse(reverse: boolean){
        this.reverse = reverse;
    }

    startAnimation(){
        this.localTime = 0;
        this.currentKeyframeIndex = 0;
        this.onGoing = true;
        this.setUp();
    }

    stopAnimation(){
        this.onGoing = false;
        this.localTime = this._duration + 0.1;
        this.tearDown();
    }

    pauseAnimation(): void {
        this.onGoing = false;
    }

    resumeAnimation(): void {
        this.onGoing = true;
    }

    get playing(): boolean {
        return this.onGoing;
    }

    animate(deltaTime: number){
        if(this.onGoing && this.localTime <= this._duration){
            this.localTime += deltaTime;
            let localTimePercentage = this.localTime / this._duration;
            let targetPercentage = this.easeFn(localTimePercentage);
            if (localTimePercentage > 1){
                targetPercentage = this.easeFn(1);
            }
            let value: any;
            // console.log("currentKeyframeIndex", this.currentKeyframeIndex, "length", this.keyFrames.length);
            if(this.currentKeyframeIndex < this.keyframes.length && (this.reverse ? 1 - this.keyframes[this.currentKeyframeIndex].percentage == targetPercentage : this.keyframes[this.currentKeyframeIndex].percentage == targetPercentage) ){
                value = this.keyframes[this.currentKeyframeIndex].value;
            } else {
                value = this.findValue(targetPercentage, this.keyframes, this.animatableAttributeHelper);
            }
            if(this.reverse){
                while(this.currentKeyframeIndex >= 0 && 1 - this.keyframes[this.currentKeyframeIndex].percentage <= targetPercentage){
                    this.currentKeyframeIndex -= 1;
                }
            } else {
                while(this.currentKeyframeIndex < this.keyframes.length && this.keyframes[this.currentKeyframeIndex].percentage <= targetPercentage){
                    this.currentKeyframeIndex += 1;
                }
            }
            this.applyAnimationValue(value);
            if(this.localTime >= this._duration){
                this.onGoing = false;
            }
            if((this.localTime >= this._duration)&& this.loop){
                this.localTime = 0;
                this.currentKeyframeIndex = 0;
                this.onGoing = true;
            }
        }
    }

    findValue(valuePercentage: number, keyframes: Keyframe<T>[], animatableAttributeHelper: AnimatableAttributeHelper<T>): T{
        if(valuePercentage > 1){
            if(this.reverse){
                return animatableAttributeHelper.lerp(valuePercentage, keyframes[1], keyframes[0]);
            }
            return animatableAttributeHelper.lerp(valuePercentage, keyframes[keyframes.length - 2], keyframes[keyframes.length - 1]);
        }
        if(valuePercentage < 0){
            if(this.reverse){
                return animatableAttributeHelper.lerp(valuePercentage, keyframes[keyframes.length - 2], keyframes[keyframes.length - 1]);
            }
            return animatableAttributeHelper.lerp(valuePercentage, keyframes[1], keyframes[0]);
        }
        let left = 0;
        let right = keyframes.length - 1;
        while (left <= right) {
            let mid = left + Math.floor((right - left) / 2);
            const midPercentage = this.reverse ? 1 - keyframes[mid].percentage : keyframes[mid].percentage;
            if(midPercentage == valuePercentage) {
                return keyframes[mid].value;
            } else if(midPercentage < valuePercentage){
                if(this.reverse){
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            } else {
                if(this.reverse){
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }
        }
        const interpolateStartFrame = this.reverse ? {percentage: 1 - keyframes[left].percentage, value: keyframes[left].value} : keyframes[left - 1];
        const interplateEndFrame = this.reverse ? {percentage: 1 - keyframes[left - 1].percentage, value: keyframes[left - 1].value} : keyframes[left];
        // return animatableAttributeHelper.lerp(valuePercentage, keyframes[left - 1], keyframes[left]);
        return animatableAttributeHelper.lerp(valuePercentage, interpolateStartFrame, interplateEndFrame);
    }

    setUp(): void {
        this.setUpFn();
    }

    tearDown(): void {
        this.tearDownFn(); 
    }

    get loops(): boolean {
        return this.loop;
    }

    set loops(loop: boolean) {
        this.loop = loop;
    }

    get duration(): number {
        return this._duration;
    }

    set duration(duration: number) {
        if(duration < 0){
            return;
        }
        if(this.localTime > duration && this.onGoing){
            this.localTime = duration;
        }
        this._duration = duration;
        if(this.parent != undefined){
            this.parent.updateDuration();
        }
    }

    setParent(parent: AnimatorContainer){
        this.parent = parent;
    }

    detachParent(): void {
        this.parent = undefined;
    }

    set keyFrames(keyFrames: Keyframe<T>[]){
        this.keyframes = keyFrames;
    }

    get keyFrames(): Keyframe<T>[]{
        return this.keyframes;
    }

    get easeFunction(): (percentage: number) => number {
        return this.easeFn;
    }

    set easeFunction(easeFn: (percentage: number) => number){
        this.easeFn = easeFn;
    }
}

export type Keyframe<T> = {
    percentage: number; // from 0 to 1;
    value: T;
}

export interface Keyframes<T> {
    keyframes: Keyframe<T>[];
    from(value: T): Keyframes<T>;
    to(value: T): Keyframes<T>;
    insertAt(percentage: number, value: T): void;
    clearFrames(): void;
}

export class KeyFramesContiner<T> {

    private _keyframes: Keyframe<T>[];

    constructor(){
        this._keyframes = [];
    }

    get keyframes(): Keyframe<T>[] {
        return this._keyframes;
    }

    from(value: T): Keyframes<T>{
        if(this._keyframes.length == 0){
            this._keyframes.push({percentage: 0, value: value});
        } else {
            if(this._keyframes[0].percentage == 0){
                this._keyframes[0].value = value;
            } else {
                this._keyframes.unshift({percentage: 0, value: value});
            }
        }
        return this;
    }

    to(value: T): Keyframes<T>{
        if(this._keyframes.length == 0){
            this._keyframes.push({percentage: 1, value: value});
        } else {
            if(this._keyframes[this._keyframes.length - 1].percentage == 1){
                this._keyframes[this._keyframes.length - 1].value = value;
            } else {
                this._keyframes.push({percentage: 1, value: value});
            }
        }
        return this;
    }

    insertAt(percentage: number, value: T): void{
        this._keyframes.push({percentage: percentage, value: value});
    }

    clearFrames(): void{
        this._keyframes = [];
    }
}