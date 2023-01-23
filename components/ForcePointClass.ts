export class ForcePoint {
  x: number;
  y: number;
  last_x: number;
  last_y: number;
  r: number;
  vx: number;
  vy: number;
  constructor(x: number, y: number, r: number) {
    this.x = x;
    this.y = y;
    this.last_x = x;
    this.last_y = y;
    this.r = r;
    this.vx = 0;
    this.vy = 0;
  }
  update(x: number, y: number) {
    this.vx = x - this.last_x;
    this.vy = y - this.last_y;
    this.last_x = this.x;
    this.last_y = this.y;
    this.x = x;
    this.y = y;
  }
}
