import { Drawable, DrawContext } from "./Drawable";

export type AstreArgs = {
  draw: DrawContext;
  width: number;
  speed: number;
  distance: number;
  color: string;
  origin?: Astre;
  invisible?: boolean;
  startAngle?: number;
};

export abstract class Astre extends Drawable {
  relativeWidth: number;
  color: string;
  speed: number;
  angle: number;
  origin?: Astre;
  relativeDistance: number;

  width: number;
  distance: number;

  protected constructor({
    draw,
    width,
    speed,
    distance,
    color,
    origin,
    startAngle = Math.random() * 360,
  }: AstreArgs) {
    super({ draw });
    this.relativeWidth = width;
    this.color = color;
    this.speed = speed;
    this.relativeDistance = distance;
    this.origin = origin;
    this.angle = (Math.PI / 180) * (startAngle ?? 0);

    this.width = (this.relativeWidth / 100) * draw.canvasMinSide
    this.distance = (this.relativeDistance / 100) * draw.canvasMinSide;
  }

  protected rotate() {
    this.angle = (this.angle + (Math.PI / 180) * this.speed) % 360;
  }

  getAngle(): number {
    return this.angle;
  }

  getRefAngle(): number {
    return this.getAngle() + (this.origin?.getAngle() ?? 0);
  }

  getWidth(): number {
    return this.width;
  }

  getOriginCoords(draw: DrawContext): [number, number] {
    if (!this.origin) {
      const orbitOriginCoords = [
        draw.canvasWidth / 2,
        draw.canvasHeight / 2,
      ];
      return [
        orbitOriginCoords[0] + Math.cos(this.angle) * this.distance,
        orbitOriginCoords[1] + Math.sin(this.angle) * this.distance,
      ];
    } else {
      const orbitOriginCoords = this.origin.getOriginCoords(draw);
      return [
        orbitOriginCoords[0] +
          Math.cos(this.origin.getAngle() + this.angle) *
            (this.distance + this.origin.getWidth()),
        orbitOriginCoords[1] +
          Math.sin(this.origin.getAngle() + this.angle) *
            (this.distance + this.origin.getWidth()),
      ];
    }
  }
}