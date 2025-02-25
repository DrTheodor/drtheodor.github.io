export class DrawContext {
    public ctx: CanvasRenderingContext2D;
    public FPS: number;
    private _canvasWidth: number | undefined;
    private _canvasHeight: number | undefined;

    constructor(ctx: CanvasRenderingContext2D, FPS: number) {
        this.ctx = ctx;
        this.FPS = FPS;
    }

    public get canvas() {
        return this.ctx.canvas;
    }

    public get canvasWidth(): number {
        if (this._canvasWidth)
            return this._canvasWidth;

        this._canvasWidth = this.ctx.canvas.width;
        return this._canvasWidth;
    }

    public get canvasHeight(): number {
        if (this._canvasHeight)
            return this._canvasHeight;

        this._canvasHeight = this.ctx.canvas.height;
        return this._canvasHeight;
    }

    public get canvasMinSide() {
        return Math.min(this.canvasHeight, this.canvasWidth);
    }

    public get canvasMaxSide() {
        return Math.max(this.canvasHeight, this.canvasWidth);
    }

    public recalc() {
        this._canvasHeight = undefined;
        this._canvasWidth = undefined;
    }
}

export abstract class Drawable {

    constructor({ draw }: { draw: DrawContext }) { }

    public abstract draw: (ctx: DrawContext) => void;
}