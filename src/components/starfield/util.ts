import { Comet } from "./drawable/Comet";
import type { DrawContext } from "./drawable/Drawable";
import { Nebula } from "./drawable/Nebula";
import { Star } from "./drawable/Star";

export type Size = [number, number];
export type Color = [number, number, number] | string;
export type Range = [number, number] | number;

export const generateNebula = ({
    draw,
    nebula,
    intensity,
}: {
    draw: DrawContext;
    nebula?: Nebula;
    intensity: number;
}) => {
    if (nebula) {
        nebula.setIntensity(intensity);
        return nebula;
    }

    return new Nebula({
        draw,
        intensity,
    });
};

export const generateStars = ({
    count,
    color,
    size,
    rotationSpeed,
    draw,
}: {
    count: number;
    color: Color;
    size: Range;
    rotationSpeed: number;
    draw: DrawContext;
}) => {
    // const rgb = typeof color == "string" ? parseColor(color) : color;
    const rgb = toCanvasColor(color);

    const totalStars = new Array(count).fill(0).map(
        () =>
            new Star({
                draw,
                width: typeof size == "number" ? size : Random.between(size[0], size[1]),
                distance: 120 * Math.pow(Math.random() * Math.random(), 1 / 2),
                speed: Random.around(rotationSpeed * 0.015, 0.005),
                color: rgb,
            })
    );

    return totalStars;
};

export const generateComets = ({
  draw,
  frequence,
}: {
  draw: DrawContext;
  frequence: number;
}) => {
  return new Array(1).fill(0).flatMap(() => {
    return [new Comet({ draw, frequence })];
  });
};

export const parseColor = (color: string): [number, number, number] => {
    const rgb = color.includes("#") ? hexToRGB(color) : color;
    const split = rgb.split(/[\(|,|\)]/);
    return [
        parseInt(split[1], 10),
        parseInt(split[2], 10),
        parseInt(split[3], 10),
    ];
};

function hexToRGB(color: string) {
    let r = "0",
        g = "0",
        b = "0";

    if (color.length <= 5) {
        r = "0x" + color[1] + color[1];
        g = "0x" + color[2] + color[2];
        b = "0x" + color[3] + color[3];
    } else if (color.length >= 7) {
        r = "0x" + color[1] + color[2];
        g = "0x" + color[3] + color[4];
        b = "0x" + color[5] + color[6];
    }

    return "rgb(" + +r + "," + +g + "," + +b + ")";
}

export const getRGB = (
    rgbChannels: [number, number, number],
    opacity: number
) => {
    return `rgba(${rgbChannels[0]}, ${rgbChannels[1]}, ${rgbChannels[2]}, ${opacity})`;
};

export const toCanvasColor = (
    color: Color
): string => {
    if (color instanceof Array) {
        return getRGB(color, 1);
    }

    return color;
}

export const Random = {
    between: (min: number, max: number) => min + Math.random() * (max - min),
    around: (value: number, tolerance: number, unit?: "%") => {
        if (unit === "%") {
            tolerance = tolerance * value;
        }
        return value - tolerance + Math.random() * tolerance * 2;
    },
    positiveOrNegative: () => (Math.random() > 0.5 ? 1 : -1),
    randomizeArray: (array: any[]) => {
        const newArray = array.slice();
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = newArray[i];
            newArray[i] = newArray[j];
            newArray[j] = temp;
        }
        return newArray;
    },
};

export const roundCoords = (coords: [number, number]): [number, number] => {
    return [Math.round(coords[0]), Math.round(coords[1])];
};