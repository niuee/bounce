import { PointCal, Point } from "point2point";
import { Keyframe } from "../animator";

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
        const res = start.value + (ratio - start.percentage) / (end.percentage - start.percentage) * (end.value - start.value);
        return res;
    }
}