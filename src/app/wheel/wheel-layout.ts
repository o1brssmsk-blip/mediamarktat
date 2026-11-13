import wheelLayoutConfig from "./wheel-layout-config.json";

export type WheelSceneKey = "desktop" | "mobile";
export type WheelFitMode = "contain" | "cover";
export type WheelOrientation = "portrait" | "landscape";

export type WheelSceneConfig = {
  src: string;
  aspectRatio: string;
  wheelCenterX: number;
  wheelCenterY: number;
  wheelDiameter: number;
  spinButtonX: number;
  spinButtonY: number;
  spinButtonWidth: number;
  spinButtonHeight: number;
};

export type WheelLayoutPreset = {
  key: string;
  scene: WheelSceneKey;
  fit: WheelFitMode;
  widthRatio: number;
  heightRatio: number;
  viewportPaddingX?: number;
  viewportPaddingY?: number;
  minWidth?: number;
  maxWidth?: number;
  orientation?: WheelOrientation;
};

type WheelLayoutConfig = {
  fallbackPreset: string;
  scenes: Record<WheelSceneKey, WheelSceneConfig>;
  presets: WheelLayoutPreset[];
};

export type WheelViewportSize = {
  width: number;
  height: number;
};

export type ActiveWheelLayout = {
  presetKey: string;
  sceneKey: WheelSceneKey;
  scene: WheelSceneConfig;
  frameSize: {
    width: number;
    height: number;
  };
  stageStyle: {
    width: string;
    height: string;
  };
  isMobileScene: boolean;
};

const config = wheelLayoutConfig as WheelLayoutConfig;

export const WHEEL_SCENES = config.scenes;
export const WHEEL_LAYOUT_PRESETS = config.presets;
export const DEFAULT_WHEEL_VIEWPORT: WheelViewportSize = {
  width: 1440,
  height: 900,
};

function parseAspectRatio(aspectRatio: string) {
  const [width, height] = aspectRatio.split("/").map((part) => Number(part.trim()));

  if (!width || !height) {
    return 1;
  }

  return width / height;
}

function getOrientation(viewport: WheelViewportSize): WheelOrientation {
  return viewport.height >= viewport.width ? "portrait" : "landscape";
}

function matchesPreset(preset: WheelLayoutPreset, viewport: WheelViewportSize) {
  const orientation = getOrientation(viewport);

  if (typeof preset.minWidth === "number" && viewport.width < preset.minWidth) {
    return false;
  }

  if (typeof preset.maxWidth === "number" && viewport.width > preset.maxWidth) {
    return false;
  }

  if (preset.orientation && preset.orientation !== orientation) {
    return false;
  }

  return true;
}

function getStageDimensions(
  viewport: WheelViewportSize,
  scene: WheelSceneConfig,
  preset: WheelLayoutPreset,
) {
  const safeViewportWidth = Math.max(viewport.width - (preset.viewportPaddingX ?? 0) * 2, 1);
  const safeViewportHeight = Math.max(viewport.height - (preset.viewportPaddingY ?? 0) * 2, 1);
  const aspectRatio = parseAspectRatio(scene.aspectRatio);
  const frameWidth = safeViewportWidth * preset.widthRatio;
  const frameHeight = safeViewportHeight * preset.heightRatio;
  const frameAspectRatio = frameWidth / frameHeight;

  if (preset.fit === "cover") {
    if (frameAspectRatio > aspectRatio) {
      const width = frameWidth;
      return {
        width,
        height: width / aspectRatio,
      };
    }

    const height = frameHeight;
    return {
      width: height * aspectRatio,
      height,
    };
  }

  if (frameAspectRatio > aspectRatio) {
    const height = frameHeight;
    return {
      width: height * aspectRatio,
      height,
    };
  }

  const width = frameWidth;
  return {
    width,
    height: width / aspectRatio,
  };
}

export function resolveWheelLayout(viewport: WheelViewportSize): ActiveWheelLayout {
  const safeViewport: WheelViewportSize = {
    width: viewport.width > 0 ? viewport.width : DEFAULT_WHEEL_VIEWPORT.width,
    height: viewport.height > 0 ? viewport.height : DEFAULT_WHEEL_VIEWPORT.height,
  };

  const preset =
    WHEEL_LAYOUT_PRESETS.find((candidate) => matchesPreset(candidate, safeViewport)) ??
    WHEEL_LAYOUT_PRESETS.find((candidate) => candidate.key === config.fallbackPreset) ??
    WHEEL_LAYOUT_PRESETS[0];

  const scene = WHEEL_SCENES[preset.scene];
  const stageSize = getStageDimensions(safeViewport, scene, preset);

  return {
    presetKey: preset.key,
    sceneKey: preset.scene,
    scene,
    isMobileScene: preset.scene === "mobile",
    frameSize: {
      width: safeViewport.width,
      height: safeViewport.height,
    },
    stageStyle: {
      width: `${Math.round(stageSize.width)}px`,
      height: `${Math.round(stageSize.height)}px`,
    },
  };
}
