import dynamic from "next/dynamic";
import p5Types from "p5";
import React, { useRef, MutableRefObject, useMemo, useCallback } from "react";
import { PixelInput } from "@tensorflow-models/hand-pose-detection/dist/shared/calculators/interfaces/common_interfaces";
import Webcam from "react-webcam";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import { updatePoses } from "../lib/updatePoses";
import { giftwrap } from "../lib/convexEnvelope";
import { linearInterpolation } from "../lib/linearInterpolation";

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

export const ConvexEnvelopeTips = ({
  webcam,
  model,
  predictionsRef,
  lostCountRef,
  capturePause,
}: Props) => {
  //** Params

  let timestamp: number = 0;
  const dur: number = 5;
  let iter = 0;
  let loading_head = 0;
  let ms = 0;
  let fn = 0;
  const recordedPoints = useRef<
    { pos: { x: number; y: number }[]; t: number }[]
  >([]);
  const recordingPoints = useRef<
    { pos: { x: number; y: number }[]; t: number }[]
  >([]);

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
  };

  const draw = (p5: p5Types) => {
    [flames.current, correctedPoses.current] = updatePoses({
      predictions: predictionsRef.current,
      poses: flames.current,
    });

    ms = p5.millis();
    if (ms - timestamp > dur * 1000) {
      timestamp = ms;
      recordedPoints.current = recordingPoints.current;
      recordingPoints.current = [];
      loading_head = 0;
      fn = 0;
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

    let last_handpose: { x: number; y: number }[] = [];
    let current_handpose: { x: number; y: number }[] = [];

    if (recordedPoints.current.length > 0) {
      while (
        loading_head < recordedPoints.current.length &&
        ms % (dur * 1000) > recordedPoints.current[loading_head].t
      ) {
        loading_head++;
      }

      if (loading_head + 1 < recordedPoints.current.length) {
        last_handpose = linearInterpolation(
          recordedPoints.current[loading_head].pos,
          recordedPoints.current[loading_head + 1].pos,
          ((ms % (dur * 1000)) - recordedPoints.current[loading_head].t) / 1000
        );
        // const convex_indices = giftwrap(pos);
        // p5.push();
        // p5.noFill();
        // p5.stroke(255);
        // p5.beginShape();
        // for (let id of convex_indices) {
        //   p5.vertex(
        //     pos[id].x * 2000 + p5.width / 2,
        //     pos[id].y * 2000 + p5.height / 2
        //   );
        // }
        // p5.endShape(p5.CLOSE);
        // p5.pop();
      }
    }

    if (predictionsRef.current.length > 0) {
      current_handpose = [
        correctedPoses.current[0][4],
        correctedPoses.current[0][8],
        correctedPoses.current[0][12],
        correctedPoses.current[0][16],
        correctedPoses.current[0][20],
      ];
      const handpose = current_handpose.concat(last_handpose);
      //const handpose = current_handpose;
      const convex_indices = giftwrap(handpose);
      recordingPoints.current.push({ pos: [], t: ms % (dur * 1000) });
      for (let i = 0; i < 5; i++) {
        const pos = correctedPoses.current[0][4 * (i + 1)];
        recordingPoints.current[fn].pos.push({ x: pos.x, y: pos.y });
      }
      fn++;

      // draw
      p5.beginShape();
      for (let id of convex_indices) {
        p5.vertex(
          handpose[id].x * 2000 + p5.width / 2,
          handpose[id].y * 2000 + p5.height / 2
        );
      }
      p5.endShape();
    }

    p5.push();
    p5.fill(200);
    p5.noStroke();
    if (current_handpose.length > 0) {
      const convex_indices = giftwrap(current_handpose);
      p5.beginShape();
      for (let id of convex_indices) {
        p5.vertex(
          current_handpose[id].x * 2000 + p5.width / 2,
          current_handpose[id].y * 2000 + p5.height / 2
        );
      }
      p5.endShape();

      //   for (let i = 0; i < 5; i++) {
      //     p5.line(
      //       current_handpose[0].x * 2000 + p5.width / 2,
      //       current_handpose[0].y * 2000 + p5.height / 2,
      //       current_handpose[4 * i + 1].x * 2000 + p5.width / 2,
      //       current_handpose[4 * i + 1].y * 2000 + p5.height / 2
      //     );
      //     for (let j = 1; j < 4; j++) {
      //       p5.line(
      //         current_handpose[4 * i + j].x * 2000 + p5.width / 2,
      //         current_handpose[4 * i + j].y * 2000 + p5.height / 2,
      //         current_handpose[4 * i + j + 1].x * 2000 + p5.width / 2,
      //         current_handpose[4 * i + j + 1].y * 2000 + p5.height / 2
      //       );
      //     }
      //   }
    }
    p5.pop();
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
