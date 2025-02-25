import { getRGB, parseColor, Random } from "../util";
import { Drawable, DrawContext } from "./Drawable";

const SPEED = 115;

export class Comet extends Drawable {
    frequence: number;

    constructor({
        draw,
        frequence,
    }: {
        draw: DrawContext;
        frequence: number;
    }) {
        super({ draw });

        this.frequence = frequence;
    }

    private showConfig:
        | {
            speed: number;
            startCoords: { x: number; y: number };
            direction: number;
            distanceToTarget: number;
            rgb: [number, number, number];
            width: number;
            startOpacity: number;
        }
        | undefined;

    private speed = SPEED;
    private x = 0;
    private y = 0;
    private opacity = 0;

    private move(draw: DrawContext) {
        if (this.showConfig) {
            this.x += this.speed * Math.cos(this.showConfig.direction);
            this.y += this.speed * Math.sin(this.showConfig.direction);
            const { x: startX, y: startY } = this.showConfig.startCoords;
            const distance = Math.sqrt(
                Math.pow(this.x - startX, 2) + Math.pow(this.y - startY, 2)
            );
            const showAvancement = distance / this.showConfig.distanceToTarget;
            this.opacity = Math.max(
                0.7,
                Math.min(showAvancement < 0.3 ? showAvancement : 1 - showAvancement, 1)
            );

            if (distance > this.showConfig.distanceToTarget) {
                this.showConfig = undefined;
            }
            return;
        }

        const shouldCreateANewShow = Math.random() > 1 - this.frequence / 100 / draw.FPS;
        if (shouldCreateANewShow) {
            const fromAngle = Random.between(0, 2 * Math.PI);
            const maxSideSize = Math.max(
                draw.canvasHeight,
                draw.canvasWidth
            );
            this.showConfig = {
                startCoords: {
                    x:
                        Random.around((Math.cos(fromAngle) * maxSideSize) / 3, 0.5, "%") +
                        draw.canvasWidth / 2,
                    y:
                        Random.around((Math.sin(fromAngle) * maxSideSize) / 3, 0.5, "%") +
                        draw.canvasHeight / 2,
                },
                direction: Random.between(
                    fromAngle + Math.PI - Math.PI / 6,
                    fromAngle + Math.PI + Math.PI / 6
                ),
                distanceToTarget: Random.around(maxSideSize * 0.6, 0.3),
                speed: Random.around(SPEED, 0.15, "%"),
                rgb: parseColor("rgb(255,207,207)"),
                width: Random.between(0.2, 0.8),
                startOpacity: 0,
            };
            this.x = this.showConfig.startCoords.x;
            this.y = this.showConfig.startCoords.y;
        }
    }

    draw = (draw: DrawContext) => {
        this.move(draw);
        if (!this.showConfig) return;
        draw.ctx.save();
        draw.ctx.ellipse(
            this.x,
            this.y,
            this.showConfig.width,
            90,
            this.showConfig.direction + Math.PI / 2,
            0,
            Math.PI * 2
        );
        draw.ctx.globalAlpha = this.opacity;
        const gradiant = draw.ctx.createRadialGradient(
            this.x,
            this.y,
            0,
            this.x,
            this.y,
            90
        );
        gradiant.addColorStop(0, getRGB(this.showConfig.rgb, 1));
        gradiant.addColorStop(1, getRGB(this.showConfig.rgb, 0));
        draw.ctx.fillStyle = gradiant;
        draw.ctx.fill();
        draw.ctx.restore();
    };
}