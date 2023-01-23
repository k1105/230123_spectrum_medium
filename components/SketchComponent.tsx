import dynamic from "next/dynamic";
import p5Types from "p5";
import { Point } from "./PointClass";
import { ForcePoint } from "./ForcePointClass";
import React, { useRef, MutableRefObject, useMemo, useCallback } from "react";
import { PixelInput } from "@tensorflow-models/hand-pose-detection/dist/shared/calculators/interfaces/common_interfaces";
import Webcam from "react-webcam";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import { updatePoses } from "../lib/updatePoses";

type Props = {
  webcam: Webcam;
  model: handPoseDetection.HandDetector;
  predictionsRef: MutableRefObject<handPoseDetection.Hand[]>;
  lostCountRef: MutableRefObject<number>;
  capturePause: boolean;
};

const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const SketchComponent = ({
  webcam,
  model,
  predictionsRef,
  lostCountRef,
  capturePause,
}: Props) => {
  //** Params

  const max_dist: number = 30;
  const r: number = 10;
  const row: number = 20;
  const col: number = 20;
  let timestamp: number = 0;
  const dur: number = 5;
  const points: Point[] = [];
  const forcePoints: ForcePoint[] = [];
  let rand = 0;
  let iter = 0;
  let last_ms = 0;
  let ms = 0;

  const requestRef = useRef<null | number>(null);
  const flames = useRef<
    [handPoseDetection.Keypoint[][], handPoseDetection.Keypoint[][]]
  >([[], []]);
  const correctedPoses = useRef<handPoseDetection.Keypoint[][]>([]);

  const capture = useCallback(async () => {
    //webcamとmodelのインスタンスが生成されていたら
    const predictions = await model.estimateHands(
      webcam.getCanvas() as PixelInput
    ); //webcamの現時点でのフレームを取得し、ポーズ推定の結果をpredictionsに非同期で格納

    if (predictions) {
      //predictionsが存在していたら
      if (predictions.length > 0) {
        predictionsRef.current = predictions;
        lostCountRef.current = 0;
      } else {
        //画面内に検知された手指が存在しない場合
        lostCountRef.current++;
      }

      if (lostCountRef.current > 10) {
        predictionsRef.current = [];
      }
    }

    if (!capturePause) {
      requestRef.current = requestAnimationFrame(capture);
    }
  }, [lostCountRef, predictionsRef, model, webcam, capturePause]);

  useMemo(() => {
    if (capturePause) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    } else {
      requestRef.current = requestAnimationFrame(capture);
    }
  }, [capturePause, capture]);

  /**
   * Sketch
   */

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);

    p5.fill(0);
    //translate(width/2-max_dist/2*row/2, height/2-max_dist/2*col/2);
    const offset = {
      x: p5.width / 2 - ((max_dist / 2) * row) / 2,
      y: p5.height / 2 - ((max_dist / 2) * col) / 2,
    };
    for (let i = 0; i < col * row; i++) {
      points.push(
        new Point(
          (max_dist / 2) * (i % row) + offset.x,
          (max_dist / 2) * Math.floor(i / row) + offset.y,
          dur
        )
      );
    }
    for (let i = 0; i < 21; i++) {
      forcePoints.push(new ForcePoint(p5.width / 2, p5.height / 2, 20));
    }
    console.log(forcePoints.length);
  };

  const draw = (p5: p5Types) => {
    [flames.current, correctedPoses.current] = updatePoses({
      predictions: predictionsRef.current,
      poses: flames.current,
    });

    ms = p5.millis();
    if (ms - timestamp > dur * 1000) {
      timestamp = ms;
      rand = Math.random() * 50;
      iter++;
    }
    p5.background(0);
    p5.fill(255);
    p5.noStroke();
    p5.text("iteration count: " + iter, 10, p5.height - 20);
    p5.stroke(255);
    p5.line(
      0,
      p5.height - 10,
      (p5.width * (ms - timestamp)) / (dur * 1000),
      p5.height - 10
    );

    if (predictionsRef.current.length > 0) {
      forcePoints.forEach((forcePoint, index) => {
        console.log(index);
        const pos = correctedPoses.current[0][index];
        //update forcePoint
        forcePoint.update(
          pos.x * 2000 + p5.width / 2,
          pos.y * 2000 + p5.height / 2
        );
        for (let point of points) {
          if (
            (forcePoint.x - point.pos(ms).x) ** 2 +
              (forcePoint.y - point.pos(ms).y) ** 2 <
            (forcePoint.r / 2) ** 2
          ) {
            point.update(forcePoint.vx, forcePoint.vy, ms, last_ms);
          } else {
            point.update(0, 0, ms, last_ms);
          }
        }
      });
    }

    // draw forcePoint Circle
    p5.push();
    p5.noFill();
    for (let forcePoint of forcePoints) {
      p5.ellipse(forcePoint.x, forcePoint.y, forcePoint.r);
    }
    p5.pop();

    p5.push();
    if (1000 * dur - ms + timestamp < 1000) {
      p5.fill(255, (1 - (1000 - dur * 1000 + ms - timestamp) / 1000) * 255);
    }

    p5.noStroke();

    for (let point of points) {
      p5.ellipse(point.pos(ms).x, point.pos(ms).y, r);
    }
    p5.pop();

    last_ms = ms;
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  return (
    <Sketch
      preload={preload}
      setup={setup}
      draw={draw}
      windowResized={windowResized}
    />
  );
};
