import React, { useRef, MutableRefObject, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { PixelInput } from "@tensorflow-models/hand-pose-detection/dist/shared/calculators/interfaces/common_interfaces";
import Webcam from "react-webcam";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import { Color, Group, Mesh, MeshBasicMaterial } from "three";
import { OrbitControls } from "@react-three/drei";
import Stats from "three/examples/jsm/libs/stats.module";
import { updatePoses } from "../lib/updatePoses";

type Props = {
  webcam: Webcam;
  model: handPoseDetection.HandDetector;
  predictionsRef: MutableRefObject<handPoseDetection.Hand[]>;
  lostCountRef: MutableRefObject<number>;
  recordPauseRef: MutableRefObject<boolean>;
  capturePause: boolean;
  recordedFlamesRef: MutableRefObject<handPoseDetection.Hand[][]>;
};

export default function Hands({
  webcam,
  model,
  predictionsRef,
  lostCountRef,
  recordPauseRef,
  capturePause,
  recordedFlamesRef,
}: Props) {
  const groupRef = useRef<Group>(null);
  const elapsedTime = useRef<number>(0);
  const requestRef = useRef<null | number>(null);
  const flames = useRef<
    [handPoseDetection.Keypoint[][], handPoseDetection.Keypoint[][]]
  >([[], []]);
  const hands = useRef<handPoseDetection.Keypoint[][]>([]);

  const stats: Stats = Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
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
  useFrame((_, delta) => {
    stats.begin();
    elapsedTime.current += delta;

    if (!recordPauseRef.current) {
      recordedFlamesRef.current.push(predictionsRef.current);
    }

    [flames.current, hands.current] = updatePoses({
      predictions: predictionsRef.current,
      poses: flames.current,
    });

    if (predictionsRef.current.length > 0) {
      for (let i = 0; i < 21; i++) {
        //@ts-ignore
        const pos = hands.current[0][i];
        groupRef.current?.children[i].position.set(
          10 * pos.x,
          -10 * pos.y,
          10 * (pos.z as number)
        );
        if (recordPauseRef.current) {
          (
            (groupRef.current?.children[i] as Mesh)
              .material as MeshBasicMaterial
          ).color.set(new Color(0xffffff));
        } else {
          (
            (groupRef.current?.children[i] as Mesh)
              .material as MeshBasicMaterial
          ).color.set(new Color(0xff0000));
        }
      }
    }
    stats.end();
  });

  useMemo(() => {
    if (capturePause) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    } else {
      requestRef.current = requestAnimationFrame(capture);
    }
  }, [capturePause, capture]);

  return (
    <>
      <group ref={groupRef}>
        {(() => {
          const meshes = [];
          for (let i = 0; i < 21; i++) {
            meshes.push(
              <mesh scale={[0.1, 0.1, 0.1]} key={`point${i}`}>
                <sphereGeometry />
                <meshBasicMaterial color={"white"} />
              </mesh>
            );
          }
          return meshes;
        })()}
      </group>
      <OrbitControls />
    </>
  );
}
