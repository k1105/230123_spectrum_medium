export class Point {
  duration: number;
  motion: { x: number; y: number }[];
  force: { x: number; y: number }[];
  last_in_x: number;
  last_in_y: number;
  last_tail_fn: number;
  constructor(x: number, y: number, duration: number) {
    this.duration = duration;
    this.motion = new Array(duration * 60).fill({ x: x, y: y });
    this.force = new Array(duration * 60).fill({ x: 0, y: 0 });
    this.last_in_x = 0;
    this.last_in_y = 0;
    this.last_tail_fn = -1;
  }
  pos(t: number) {
    const fn = Math.floor(((t % (this.duration * 1000)) / 1000) * 60); //flame number
    return { x: this.motion[fn].x, y: this.motion[fn].y };
  }
  update(in_x: number, in_y: number, ms: number, last_ms: number) {
    const head = ((last_ms % (this.duration * 1000)) / 1000) * 60;
    const tail = ((ms % (this.duration * 1000)) / 1000) * 60;
    const delta = tail - head;
    let head_fn = Math.ceil(head); //flame number
    const tail_fn = Math.floor(tail); //flame number

    if (tail_fn - head_fn < 0) {
      head_fn = 0;
    }
    for (let fn = head_fn; fn <= tail_fn; fn++) {
      const cur_x = this.motion[fn].x;
      const cur_y = this.motion[fn].y;
      const k = (fn - head) / delta;
      this.force[fn] = {
        x: ((1 - k) * this.last_in_x + k * in_x) * 0.1 + this.force[fn].x * 0.9,
        y: ((1 - k) * this.last_in_y + k * in_y) * 0.1 + this.force[fn].y * 0.9,
      };
      this.motion[fn] = {
        x: this.force[fn].x + cur_x,
        y: this.force[fn].y + cur_y,
      };
    }
    this.last_in_x = in_x;
    this.last_in_y = in_y;
    this.last_tail_fn = tail_fn;
  }
}
