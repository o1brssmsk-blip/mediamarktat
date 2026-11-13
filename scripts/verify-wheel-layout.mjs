import wheelLayoutConfig from "../src/app/wheel/wheel-layout-config.json" with { type: "json" };

const VIEWPORTS = [
  { label: "iPhone SE", width: 375, height: 667 },
  { label: "iPhone 12 Pro", width: 390, height: 844 },
  { label: "iPhone 14 Pro Max", width: 430, height: 932 },
  { label: "Galaxy S8+", width: 360, height: 740 },
  { label: "Galaxy S20 Ultra", width: 412, height: 915 },
  { label: "Pixel 7", width: 412, height: 915 },
  { label: "mobile-landscape", width: 740, height: 360 },
  { label: "tablet-portrait", width: 768, height: 1024 },
  { label: "tablet-landscape", width: 1024, height: 768 },
  { label: "desktop-hd", width: 1366, height: 768 },
  { label: "desktop-fhd", width: 1920, height: 1080 },
];

function parseAspectRatio(aspectRatio) {
  const [width, height] = aspectRatio.split("/").map((part) => Number(part.trim()));
  return width / height;
}

function getOrientation(viewport) {
  return viewport.height >= viewport.width ? "portrait" : "landscape";
}

function matchesPreset(preset, viewport) {
  if (typeof preset.minWidth === "number" && viewport.width < preset.minWidth) {
    return false;
  }

  if (typeof preset.maxWidth === "number" && viewport.width > preset.maxWidth) {
    return false;
  }

  if (preset.orientation && preset.orientation !== getOrientation(viewport)) {
    return false;
  }

  return true;
}

function resolvePreset(viewport) {
  return (
    wheelLayoutConfig.presets.find((preset) => matchesPreset(preset, viewport)) ??
    wheelLayoutConfig.presets.find((preset) => preset.key === wheelLayoutConfig.fallbackPreset) ??
    wheelLayoutConfig.presets[0]
  );
}

function getStageSize(viewport, preset, scene) {
  const aspectRatio = parseAspectRatio(scene.aspectRatio);
  const safeViewportWidth = Math.max(viewport.width - (preset.viewportPaddingX ?? 0) * 2, 1);
  const safeViewportHeight = Math.max(viewport.height - (preset.viewportPaddingY ?? 0) * 2, 1);
  const frameWidth = safeViewportWidth * preset.widthRatio;
  const frameHeight = safeViewportHeight * preset.heightRatio;
  const frameAspectRatio = frameWidth / frameHeight;

  if (preset.fit === "cover") {
    if (frameAspectRatio > aspectRatio) {
      return {
        width: frameWidth,
        height: frameWidth / aspectRatio,
        frameWidth,
        frameHeight,
      };
    }

    return {
      width: frameHeight * aspectRatio,
      height: frameHeight,
      frameWidth,
      frameHeight,
    };
  }

  if (frameAspectRatio > aspectRatio) {
    return {
      width: frameHeight * aspectRatio,
      height: frameHeight,
      frameWidth,
      frameHeight,
    };
  }

  return {
    width: frameWidth,
    height: frameWidth / aspectRatio,
    frameWidth,
    frameHeight,
  };
}

let hasFailures = false;

for (const viewport of VIEWPORTS) {
  const preset = resolvePreset(viewport);
  const scene = wheelLayoutConfig.scenes[preset.scene];
  const stage = getStageSize(viewport, preset, scene);
  const aspectRatio = parseAspectRatio(scene.aspectRatio);
  const renderedAspectRatio = stage.width / stage.height;
  const aspectMatches = Math.abs(renderedAspectRatio - aspectRatio) < 0.001;
  const fitsContain = preset.fit === "contain"
    ? stage.width <= stage.frameWidth + 1 && stage.height <= stage.frameHeight + 1
    : true;
  const fitsCover = preset.fit === "cover"
    ? stage.width + 1 >= stage.frameWidth && stage.height + 1 >= stage.frameHeight
    : true;
  const isValid = aspectMatches && fitsContain && fitsCover && stage.width > 0 && stage.height > 0;

  if (!isValid) {
    hasFailures = true;
  }

  console.log(
    `${viewport.label}: preset=${preset.key}, scene=${preset.scene}, fit=${preset.fit}, stage=${Math.round(stage.width)}x${Math.round(stage.height)}, frame=${Math.round(stage.frameWidth)}x${Math.round(stage.frameHeight)}, valid=${isValid}`,
  );
}

if (hasFailures) {
  process.exitCode = 1;
}
