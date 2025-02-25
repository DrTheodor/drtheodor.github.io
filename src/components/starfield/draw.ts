import { Drawable, DrawContext } from "./drawable/Drawable";

export const drawOnCanvas = ({
    draw,
    drawings,
    bgColor,
}: {
    draw: DrawContext;
    drawings: Drawable[];
    bgColor?: string;
}) => {
    const width = draw.canvas.width;
    const height = draw.canvas.height;

    draw.ctx.save();
    let animation: number | undefined;

    let lastTimestamp = 0;
    let timeStep = 1000 / draw.FPS;

    const drawMainCanvas = () => {
        if (draw.FPS) {
            animation = requestAnimationFrame(drawMainCanvas);
            const timestamp = Date.now();
            if (timestamp - lastTimestamp < timeStep) return;
            lastTimestamp = timestamp;
        }

        draw.ctx.clearRect(0, 0, width, height);
        if (bgColor) {
            draw.ctx.fillStyle = bgColor;
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
