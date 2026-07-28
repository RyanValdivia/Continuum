export function getActiveSceneIndex(
    progress: number,
    sceneCount: number,
): number {
    if (sceneCount <= 1) return 0;

    const clampedProgress = Math.min(1, Math.max(0, progress));
    return Math.min(sceneCount - 1, Math.floor(clampedProgress * sceneCount));
}
