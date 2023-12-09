import { Point } from "point2point";
import { PointAnimationHelper } from "../../src";
import { Keyframe } from "../../src";

describe("Point Lerping", ()=>{
    let testHelper = new PointAnimationHelper();

    test("Interpolating", ()=>{
        const startKeyframe: Keyframe<Point> = {
            percentage: 0,
            value: {x: 0, y: 0}
        };
        const endKeyframe: Keyframe<Point> = {
            percentage: 1,
            value: {x: 10, y: 10}
        };

        const actual = testHelper.lerp(0.5, startKeyframe, endKeyframe);
        expect(actual).toEqual({x: 5, y: 5});
    });

    test("Extrapolating beyond", ()=>{
        const startKeyframe: Keyframe<Point> = {
            percentage: 0,
            value: {x: 0, y: 0}
        };
        const endKeyframe: Keyframe<Point> = {
            percentage: 1,
            value: {x: 10, y: 10}
        };

        const actual = testHelper.lerp(1.2, startKeyframe, endKeyframe);
        expect(actual).toEqual({x: 12, y: 12});
    });

    test("Extrapolating below", ()=>{
        const startKeyframe: Keyframe<Point> = {
            percentage: 0,
            value: {x: 0, y: 0}
        };
        const endKeyframe: Keyframe<Point> = {
            percentage: 1,
            value: {x: 10, y: 10}
        };

        const actual = testHelper.lerp(-0.2, startKeyframe, endKeyframe);
        expect(actual).toEqual({x: -2, y: -2});
    });

});
