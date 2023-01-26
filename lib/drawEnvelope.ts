import p5Types from "p5";

export const drawEnvelope = (
  p5: p5Types,
  indices: number[],
  pose: { x: number; y: number }[],
  scale: number = 1
) => {
  p5.push();
  p5.beginShape();
  for (let id of indices) {
    p5.vertex(pose[id].x * 2000 * scale, pose[id].y * 2000 * scale);
  }
  p5.endShape();
  p5.pop();
};
