import { PointCal, Point } from "point2point";
import { Keyframe } from "../animationgroup";

export interface AnimatableAttributeHelper<T> {
    lerp(ratio: number, start: Keyframe<T>, end: Keyframe<T>): T;
}

export class PointAnimationHelper implements AnimatableAttributeHelper<Point> {

    constructor(){

    }

    lerp(ratio: number, start: Keyframe<Point>, end: Keyframe<Point>): Point {
        const res = PointCal.addVector(start.value, PointCal.multiplyVectorByScalar(PointCal.subVector(end.value, start.value), (ratio - start.percentage) / (end.percentage - start.percentage)));
        return res;
    }

}

export class NumberAnimationHelper implements AnimatableAttributeHelper<number>{
    constructor(){

    }

    lerp(ratio: number, start: Keyframe<number>, end: Keyframe<number>): number {
        const res = start.value + ((ratio - start.percentage) / (end.percentage - start.percentage)) * (end.value - start.value);
        return res;
    }
}

export class StringAnimationHelper implements AnimatableAttributeHelper<string>{
    constructor(){

    }
    
    lerp(ratio: number, start: Keyframe<string>, end: Keyframe<string>): string {
        const percentageScale = (ratio - start.percentage) / (end.percentage - start.percentage)
        // if percentageScale is negative that means it's before the start value just return start value 
        // if percentageScale is more than 1 that means it's after the end value just return the end value
        // if percentageScale is less than 0.5 return the start value else return the end value
        return percentageScale < 0 || percentageScale < 0.5 ? start.value : end.value;
    }
}

export type RGB = {r: number, g: number, b: number};

export class RGBAnimationHelper implements AnimatableAttributeHelper<RGB> {
    constructor(){

    }

    lerp(ratio: number, start: Keyframe<RGB>, end: Keyframe<RGB>): RGB {
        const res = {
            r: start.value.r + ((ratio - start.percentage) / (end.percentage - start.percentage)) * (end.value.r - start.value.r),
            g: start.value.g + ((ratio - start.percentage) / (end.percentage - start.percentage)) * (end.value.g - start.value.g),
            b: start.value.b + ((ratio - start.percentage) / (end.percentage - start.percentage)) * (end.value.b - start.value.b),
        }
        return res;
    }
}