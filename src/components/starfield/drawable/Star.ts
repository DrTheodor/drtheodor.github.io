import { Astre, type AstreArgs } from "./Astre";
import { getRGB, roundCoords } from "../util";
import type { DrawContext } from "./Drawable";

export class Star extends Astre {
  constructor({ ...args }: AstreArgs) {
    super({
      ...args,
    });
  }

  draw = (draw: DrawContext) => {
    this.rotate();
    draw.ctx.shadowBlur = 0;
    draw.ctx.beginPath();
    const orginalCoords = roundCoords(this.getOriginCoords(draw));

    draw.ctx.arc(...orginalCoords, Math.round(this.width), 0, Math.PI * 2);
    draw.ctx.closePath();

    draw.ctx.fillStyle = this.color;
    draw.ctx.fill();
  };
}