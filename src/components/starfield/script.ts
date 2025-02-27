import type { Color, Range } from "./util";
import { drawOnCanvas } from "./draw";
    import { DrawContext } from "./drawable/Drawable";
    import type { Nebula } from "./drawable/Nebula";
    import type { Star } from "./drawable/Star";
    import { generateComets, generateNebula, generateStars } from "./util";
import type { Comet } from "./drawable/Comet";


export type StarfieldConfig = {
    bgColor: Color;
    nebulaIntensity: number;
    starsColor: Color;
    starsCount: number;
    starsRotationSpeed: number;
    starsSize: Range;
    cometFrequency: number;
}

export function doStarfield(
    { bgColor,
    nebulaIntensity,
    starsColor,
    starsCount,
    starsRotationSpeed,
    starsSize,
    cometFrequency } : StarfieldConfig
) {
    const FPS = 40;

    const container = document.getElementById("starfield-container")!;
    const bgCanvas: HTMLCanvasElement = document.getElementById(
        "starfield-bg",
    )! as HTMLCanvasElement;
    const canvas: HTMLCanvasElement = document.getElementById(
        "starfield-fg",
    )! as HTMLCanvasElement;

    const bgCtx = bgCanvas.getContext("2d", {
        alpha: false,
    }) as CanvasRenderingContext2D;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const drawBg = new DrawContext(bgCtx, 0);
    const drawFg = new DrawContext(ctx, FPS);

    var nebula: Nebula;
    var stars: Star[];
    var comets: Comet[];

    var initComplete = false;

    function generateAnimations() {
        nebula = generateNebula({
            nebula,
            draw: drawBg,
            intensity: nebulaIntensity,
        });

        stars = generateStars({
            draw: drawFg,
            color: starsColor,
            count: starsCount,
            size: starsSize,
            rotationSpeed: starsRotationSpeed,
        });

        comets = generateComets({
            draw: drawFg,
            frequence: cometFrequency,
        })
    }

    function init() {
        adjustSize();

        if (!initComplete) {
            generateAnimations();
        }

        drawOnCanvas({
            draw: drawBg,
            drawings: [nebula],
            bgColor,
        });

        bgCanvas.classList.add("starfield-fadein");

        drawOnCanvas({
            draw: drawFg,
            drawings: [...stars, ...comets],
        });

        canvas.classList.add("starfield-fadein");

        initComplete = true;
    }

    function adjustSize() {
        bgCanvas.width = container.offsetWidth / 3;
        bgCanvas.height = container.offsetHeight / 3;
        canvas.width = container.offsetWidth * 2;
        canvas.height = container.offsetHeight * 2;

        if (initComplete) {
            drawBg.recalc();
            drawFg.recalc();
        }
    }

    function onResize() {
        init();
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("load", init);
}