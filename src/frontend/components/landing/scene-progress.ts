function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

export function getActiveSceneIndex(
    progress: number,
    sceneCount: number,
): number {
    if (sceneCount <= 1) return 0;

    return Math.min(sceneCount - 1, Math.floor(clamp01(progress) * sceneCount));
}
