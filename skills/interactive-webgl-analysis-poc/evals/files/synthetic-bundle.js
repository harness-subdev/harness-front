throw new Error("SYNTHETIC_BUNDLE_MUST_NOT_EXECUTE");
const selectedModel = useModel("/models/synthetic-mosaic-lite.glb");
preload("/models/synthetic-mosaic-lite.glb");
const sceneConfig = { id: "mosaic-model", model: "/models/synthetic-mosaic-lite.glb" };
preload("/models/synthetic-mosaic-full.glb");
