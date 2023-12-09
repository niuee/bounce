import * as easeFunctions from "../easeFunctions";
import { AnimatableAttributeHelper } from "../animatableAttribute";

export type Keyframe<T> = {
    percentage: number; // from 0 to 1;
    value: T;
}

export type AnimationSequence<T> = {
    keyframes: Keyframe<T>[];
    animationFn: (value: T) => void;
    animatableAttributeHelper: AnimatableAttributeHelper<T>;
}

export class Animator{

    private timePercentage: number;
    private duration: number;
    private easingFunction: (timePercentage: number) => number;
    private keyframesList: AnimationSequence<any>[];

    constructor(keyframes: AnimationSequence<any>[], duration: number = 1, easingFunction: (timePercentage: number)=>number = easeFunctions.linear){
        this.timePercentage = 1.1;
        this.duration = duration;
        this.easingFunction = easingFunction;
        this.keyframesList = keyframes;
    }

    startAnimation(){
        this.timePercentage = 0;
    }

    cancelAnimation(){
        this.timePercentage = 1.1;
    }

    setEasingFunction(easingFunction: (timePercentage: number) => number){
        this.easingFunction = easingFunction;
    }

    // delta time should be in seconds
    animate(deltaTime: number){
        if(this.timePercentage <= 1){
            let currentDeltaTimePercentage = deltaTime / this.duration;
            let targetTimePercentage = this.timePercentage + currentDeltaTimePercentage;
            let targetPercentage = this.easingFunction(targetTimePercentage);
            if (targetTimePercentage > 1){
                targetPercentage = this.easingFunction(1);
            }
            this.keyframesList.forEach((animationSequence)=>{
                const value = this.findValue(targetPercentage, animationSequence.keyframes, animationSequence.animatableAttributeHelper);
                animationSequence.animationFn(value);
            })
            this.timePercentage = targetTimePercentage;
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
        return animatableAttributeHelper.lerp(0.5, keyframes[left - 1], keyframes[left]);
    }

}
