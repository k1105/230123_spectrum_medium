export const giftwrap = (points: { x: number; y: number }[]) => {
  if (points.length == 0) return [];
  // giftwrap法によって二次元平面上に与えられた点群から凸包をなす頂点を選択してその頂点番号（配列のインデックス）を返す関数.
  // pointsのうち、y最小のものを見つける. もし最小のyをとるpointが複数ある場合は、その中でもxが最小のものを選ぶ
  let index = 0;
  let tmp: number = -1;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y > points[index].y) {
      index = i;
    } else if (
      points[i].y == points[index].y &&
      points[i].x > points[index].x
    ) {
      index = i;
    }
  }

  const convex_indices = [];
  convex_indices.push(index);

  let prev_min_delta = -100;
  //最初の注目点は先の計算でもとまったindexに該当する点。
  //重複をチェックすることで一巡したことを確認する。
  while (true) {
    let min_delta = 100;
    for (let i = 0; i < points.length; i++) {
      if (i != index) {
        //偏角を求める
        const delta = Math.atan2(
          points[i].y - points[index].y,
          points[i].x - points[index].x
        );
        //console.log("delta: " + delta);
        if (prev_min_delta < delta && delta < min_delta) {
          if (i == convex_indices[0] || !convex_indices.includes(i)) {
            min_delta = delta;
            tmp = i;
          }
        }
      }
    }

    prev_min_delta = min_delta;
    index = tmp;
    if (index == convex_indices[0]) break;
    convex_indices.push(index);
  }

  return convex_indices;
};
