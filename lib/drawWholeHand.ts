import p5Types from "p5";

export const drawWholeHand = (
  p5: p5Types,
  pose: { x: number; y: number }[],
  scale: number = 1,
  strokeWeight: number = 10
) => {
  p5.push();
  p5.strokeWeight(strokeWeight);
  for (let i = 0; i < 5; i++) {
    p5.line(
      pose[0].x * scale * 800,
      pose[0].y * scale * 800,
      pose[4 * i + 1].x * scale * 800,
      pose[4 * i + 1].y * scale * 800
    );
    for (let j = 1; j < 4; j++) {
      p5.line(
        pose[4 * i + j].x * scale * 800,
        pose[4 * i + j].y * scale * 800,
        pose[4 * i + j + 1].x * scale * 800,
        pose[4 * i + j + 1].y * scale * 800
      );
    }
  }
  p5.pop();
};
