import dynamic from "next/dynamic";
import p5Types from "p5";
import React, {
  useRef,
  MutableRefObject,
  useMemo,
  useCallback,
  createRef,
  RefObject,
} from "react";
import { PixelInput } from "@tensorflow-models/hand-pose-detection/dist/shared/calculators/interfaces/common_interfaces";
import Webcam from "react-webcam";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import { updatePoses } from "../lib/updatePoses";
import { giftwrap } from "../lib/convexEnvelope";
import { linearInterpolation } from "../lib/linearInterpolation";
import { drawWholeHand } from "../lib/drawWholeHand";
import { drawEnvelope } from "../lib/drawEnvelope";
import { MotionControllUI } from "./MotionControllUI";
import { RecButton } from "./RecButton";

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

export const TouchAndRedo = ({
  webcam,
  model,
  predictionsRef,
  lostCountRef,
  capturePause,
}: Props) => {
  //** Params

  let timestamp: number = 0;
  const dur: number = 10; //1周期の時間.　単位:
  let iter = 0;
  let loading_fn = [0];
  let ms = 0; //プログラム実行からの経過時間を保持。単位: ms
  let recording_fn = 0;
  const recordedPoints = useRef<
    { pos: { x: number; y: number }[]; t: number }[][]
  >([]);
  const recordingPoints = useRef<
    { pos: { x: number; y: number }[]; t: number }[]
  >([]);

  const margin_x = 300;
  const max_col = 5;
  const controllerRefs = useRef<RefObject<HTMLDivElement>[]>([]);
  for (let i = 0; i < max_col; i++) {
    //@ts-ignore
    controllerRefs.current[i] = createRef<HTMLDivElement>();
  }
  const requestRef = useRef<null | number>(null);
  const flames = useRef<
    [handPoseDetection.Keypoint[][], handPoseDetection.Keypoint[][]]
  >([[], []]);
  const correctedPoses = useRef<handPoseDetection.Keypoint[][]>([]);

  const recButtonRef = useRef<HTMLButtonElement>(null);

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

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
  };

  const draw = (p5: p5Types) => {
    [flames.current, correctedPoses.current] = updatePoses({
      predictions: predictionsRef.current,
      poses: flames.current,
    });

    ms = p5.millis() - timestamp;
    if (ms > dur * 1000) {
      //周期の終わりを検出
      timestamp += ms; //timestamp: 1周期終了時点での時刻を記録する
      if (recordingPoints.current.length > 0) {
        recordedPoints.current[recordedPoints.current.length] =
          recordingPoints.current; //recordedPointsのrecord_num番目の要素に記録された動きを追加
      }
      recordingPoints.current = []; //記録用の配列を初期化する
      recording_fn = 0; //レコードされているフレーム番号を初期化
      iter++;
      loading_fn = new Array<number>(iter + 1).fill(0); //ロードされて呼び出されるフレーム番号を初期化
    }

    p5.background(0);
    p5.fill(255);
    p5.noStroke();
    p5.text("iteration count: " + iter, 10, p5.height - 20);
    p5.stroke(255);
    p5.line(0, p5.height - 10, (p5.width * ms) / (dur * 1000), p5.height - 10);

    let last_handpose: { x: number; y: number }[] = [];
    let current_handpose: { x: number; y: number }[] = [];

    recordedPoints.current.forEach((recordedPoint, index) => {
      while (
        loading_fn[index] < recordedPoint.length &&
        ms % (dur * 1000) > recordedPoint[loading_fn[index]].t
      ) {
        loading_fn[index]++;
      }

      loading_fn[index] %= recordedPoint.length;
    });

    for (let i = 0; i < recordedPoints.current.length; i++) {
      if (recordedPoints.current[i].length > 0) {
        const handpose = linearInterpolation(
          recordedPoints.current[i][loading_fn[i]].pos,
          recordedPoints.current[i][
            (loading_fn[i] + 1) % recordedPoints.current[i].length
          ].pos,
          ((ms % (dur * 1000)) - recordedPoints.current[i][loading_fn[i]].t) /
            1000
        );
        last_handpose = [...last_handpose, ...handpose];
      }
    }

    p5.push();
    p5.translate(p5.width - 300, p5.height / 2);
    if (predictionsRef.current.length > 0) {
      drawWholeHand(p5, correctedPoses.current[0]);
    }
    p5.translate(0, 100);
    p5.textAlign(p5.CENTER);
    p5.noStroke();
    if (predictionsRef.current.length > 0) {
      p5.text(predictionsRef.current[0].handedness, 0, 0);
    } else {
      p5.text("not recognized", 0, 0);
    }
    p5.pop();

    if (predictionsRef.current.length > 0) {
      current_handpose = [
        correctedPoses.current[0][4],
        correctedPoses.current[0][8],
        correctedPoses.current[0][12],
        correctedPoses.current[0][16],
        correctedPoses.current[0][20],
      ];
      recordingPoints.current.push({ pos: [], t: ms % (dur * 1000) });
      for (let i = 0; i < 5; i++) {
        const pos = correctedPoses.current[0][4 * (i + 1)];
        recordingPoints.current[recording_fn].pos.push({ x: pos.x, y: pos.y });
      }
      recording_fn++;
    }

    const handpose = [...last_handpose, ...current_handpose];
    const convex_indices = giftwrap(handpose);

    // draw
    p5.push();
    p5.translate(p5.width / 2, p5.height / 2);
    drawEnvelope(p5, convex_indices, handpose);
    p5.pop();

    p5.push();
    p5.fill(200);
    p5.noStroke();
    if (current_handpose.length > 0) {
      const convex_indices = giftwrap(current_handpose);
      p5.push();
      p5.translate(p5.width / 2, p5.height / 2);
      drawEnvelope(p5, convex_indices, current_handpose);
      p5.pop();
    }

    const step_x = (p5.width - margin_x * 2) / max_col;
    p5.translate(margin_x, p5.height - 200);
    for (let i = 0; i < Math.min(recordedPoints.current.length, max_col); i++) {
      if (recordedPoints.current[i].length > 0) {
        const fn = loading_fn[i];
        const f_len = recordedPoints.current[i].length;
        const handpose = linearInterpolation(
          recordedPoints.current[i][fn].pos,
          recordedPoints.current[i][(fn + 1) % f_len].pos,
          ((ms % (dur * 1000)) - recordedPoints.current[i][fn].t) / 1000
        );
        const indices = giftwrap(handpose);
        if (controllerRefs.current[i].current !== undefined) {
          //@ts-ignore
          controllerRefs.current[i].current.style.opacity = "1";
        }

        p5.push();
        p5.translate(step_x * i, 0);
        drawEnvelope(p5, indices, handpose, 0.5);
        p5.pop();
      }
    }
    p5.pop();
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  return (
    <>
      <Sketch setup={setup} draw={draw} windowResized={windowResized} />
      <MotionControllUI
        col={3}
        max_col={5}
        margin_x={300}
        controllerRefs={controllerRefs}
      />
      <RecButton recButtonRef={recButtonRef} />
    </>
  );
};
