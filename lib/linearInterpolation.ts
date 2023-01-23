export const linearInterpolation = (
  a: { x: number; y: number }[],
  b: { x: number; y: number }[],
  t: number
) => {
  const res = [];
  if (a.length !== b.length) {
    console.error("補完する２つの配列の長さが違うよ");
  }
  for (let i = 0; i < a.length; i++) {
    res.push({
      x: (1 - t) * a[i].x + t * b[i].x,
      y: (1 - t) * a[i].y + t * b[i].y,
    });
  }
  return res;
};
