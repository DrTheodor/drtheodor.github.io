import { Drawable, DrawContext } from "./drawable/Drawable";
import { getRGB, type Color } from "./util";

export const drawOnCanvas = ({
    draw,
    drawings,
    bgColor,
}: {
    draw: DrawContext;
    drawings: Drawable[];
    bgColor?: Color;
}) => {
    const width = draw.canvas.width;
    const height = draw.canvas.height;

    draw.ctx.save();
    let animation: number | undefined;

    let lastTimestamp = 0;
    let timeStep = 1000 / draw.FPS;

    const color = bgColor instanceof Array ? getRGB(bgColor, 1) : bgColor;

    const drawMainCanvas = () => {
        if (draw.FPS) {
            animation = requestAnimationFrame(drawMainCanvas);
            const timestamp = Date.now();
            if (timestamp - lastTimestamp < timeStep) return;
            lastTimestamp = timestamp;
        }

        draw.ctx.clearRect(0, 0, width, height);
        if (color) {
            draw.ctx.fillStyle = color;
            draw.ctx.fillRect(0, 0, width, height);
        }

        drawings.forEach((drawing) => drawing.draw(draw));
    };

    drawMainCanvas();

    return () => {
        draw.ctx.restore();
        if (animation) {
            cancelAnimationFrame(animation);
        }
    };
};
