import { gsap } from "gsap";
import {
    DECISION_ROUTE_NODE_IDS,
    LANDING_GRAPH_NODES,
    type LandingGraphNode,
    PHASE_FOUR_NODE_IDS,
} from "./stage-screen-data";

export const layer = (name: string) => `[data-constellation-layer="${name}"]`;
export const target = (name: string) => `[data-${name}]`;

export type StageIndex = 0 | 1 | 2 | 3;

/** Where the four clusters merge during the decision scene. */
const CANVAS_CENTRE = 50;

/**
 * One period of the flow dashes on the source paths. Every offset the loop
 * animates has to be a whole multiple of this, or the dashes jump at the seam.
 */
const FLOW_DASH_PERIOD = 8;

/**
 * Every cluster transform is anchored here, on the canvas centre, and never on
 * anything per-element.
 *
 * `svgOrigin` is the only origin GSAP honours on an SVG element — a CSS
 * `transform-origin` is dropped. But GSAP compensates whenever the origin
 * *changes*, so declaring a different one per cluster and re-declaring it on a
 * later tween accumulates that compensation: the clusters came back from the
 * decision scene at the right scale and roughly a whole viewBox off-centre.
 * One fixed origin also makes the resting state the identity matrix, which is
 * exactly what "the graph, untouched" should be.
 */
const CLUSTER_ORIGIN = `${CANVAS_CENTRE} ${CANVAS_CENTRE}`;

/**
 * GSAP's default is to quietly adjust x/y whenever an origin is (re)declared so
 * the element does not jump. Here that adjustment is the bug: it accumulates
 * across the gather and release tweens, and the graph comes back off-centre
 * instead of exactly where it started. With it off, the matrix is just
 * `origin * (1 - scale) + offset` and the resting state is the identity.
 */
const CLUSTER_TRANSFORM_BASE: gsap.TweenVars = {
    svgOrigin: CLUSTER_ORIGIN,
    smoothOrigin: false,
};

const CONVERGED_SCALE = 0.18;

/**
 * With the origin at the centre, a cluster's hub lands on the centre when it is
 * shifted by its distance from it, scaled down by the same factor.
 */
const convergedOffset =
    (axis: "hubX" | "hubY") =>
    (_index: number, node: SVGGElement): number =>
        (CANVAS_CENTRE - Number(node.dataset[axis])) * CONVERGED_SCALE;

type LayerState = {
    autoAlpha: number;
    scale: number;
};

type PhaseState = {
    sources: LayerState;
    graph: LayerState;
    decision: LayerState;
    integration: LayerState;
    routeAlpha: number;
    graphAlpha: number;
};

const PHASE_STATES: Record<StageIndex, PhaseState> = {
    0: {
        sources: { autoAlpha: 1, scale: 1 },
        graph: { autoAlpha: 0, scale: 0.62 },
        decision: { autoAlpha: 0, scale: 0.72 },
        integration: { autoAlpha: 0, scale: 0.8 },
        routeAlpha: 0,
        graphAlpha: 0,
    },
    1: {
        sources: { autoAlpha: 0, scale: 0.28 },
        graph: { autoAlpha: 1, scale: 1 },
        decision: { autoAlpha: 0, scale: 0.72 },
        integration: { autoAlpha: 0, scale: 0.8 },
        routeAlpha: 0,
        graphAlpha: 0.68,
    },
    2: {
        sources: { autoAlpha: 0, scale: 0.2 },
        graph: { autoAlpha: 1, scale: 1 },
        // The layer stays on for the whole scene; the core inside it is what
        // appears and dissolves as the loop gathers and releases the graph.
        decision: { autoAlpha: 1, scale: 1 },
        integration: { autoAlpha: 0, scale: 0.8 },
        routeAlpha: 1,
        graphAlpha: 0.24,
    },
    3: {
        sources: { autoAlpha: 0, scale: 0.2 },
        graph: { autoAlpha: 1, scale: 1 },
        decision: { autoAlpha: 0, scale: 0.9 },
        integration: { autoAlpha: 1, scale: 1 },
        routeAlpha: 0.55,
        graphAlpha: 0.58,
    },
};

/**
 * Everything a scene's loop moves, at rest.
 *
 * The scene-change tween animates the whole set back rather than snapping it,
 * which is what makes the decision scene's convergence visibly release — the
 * graph opens back up on its way into the last scene instead of reappearing.
 */
const AMBIENT_BASELINE: Record<string, gsap.TweenVars> = {
    "[data-source-mark]": { y: 0, rotation: 0, scale: 1 },
    "[data-context-packet]": { x: 0, y: 0, scale: 1, autoAlpha: 0 },
    "[data-context-path]": { strokeDashoffset: 0 },
    "[data-continuum-core]": { scale: 1 },
    "[data-graph-camera]": { rotation: 0, scale: 1 },
    "[data-graph-cross-edges]": { autoAlpha: 1 },
    "[data-graph-cluster] text": { autoAlpha: 1 },
    "[data-decision-particle]": { x: 0, y: 0, autoAlpha: 0 },
    "[data-decision-core]": { scale: 0.2, autoAlpha: 0 },
    "[data-decision-core-halo]": { scale: 1, autoAlpha: 1 },
    "[data-decision-core-caption]": { autoAlpha: 0 },
    "[data-integration-signal]": { scale: 1, autoAlpha: 0 },
    "[data-integration-wave]": { scale: 1, autoAlpha: 0 },
    '[data-phase-four-node="true"]': { scale: 0.35, autoAlpha: 0 },
    '[data-phase-four-edge="true"]': { autoAlpha: 0 },
};

/** Kept apart because reopening the graph is the one reset worth watching. */
const CLUSTER_REST: gsap.TweenVars = {
    ...CLUSTER_TRANSFORM_BASE,
    rotation: 0,
    scale: 1,
    x: 0,
    y: 0,
    autoAlpha: 1,
};

const CLUSTER_CONVERGED: gsap.TweenVars = {
    ...CLUSTER_TRANSFORM_BASE,
    rotation: 0,
    scale: CONVERGED_SCALE,
    autoAlpha: 0.12,
    x: convergedOffset("hubX"),
    y: convergedOffset("hubY"),
};

/**
 * The decision scene's resting state is the *converged* graph.
 *
 * Gathering happens once, on the way in, and the scene then stays gathered —
 * a loop that reopened the graph every few seconds would spend half the scene
 * contradicting the thing the scene is about. The full graph comes back on the
 * way out, into the scene that follows.
 */
const CONVERGED_SCENE: Record<string, gsap.TweenVars> = {
    "[data-graph-cross-edges]": { autoAlpha: 0 },
    "[data-graph-cluster] text": { autoAlpha: 0 },
    "[data-decision-core]": { scale: 1, autoAlpha: 1 },
    "[data-decision-core-caption]": { autoAlpha: 1 },
};

const DECISION_STAGE: StageIndex = 2;

function restStateFor(stage: StageIndex): Record<string, gsap.TweenVars> {
    return stage === DECISION_STAGE
        ? { ...AMBIENT_BASELINE, ...CONVERGED_SCENE }
        : AMBIENT_BASELINE;
}

function clusterStateFor(stage: StageIndex): gsap.TweenVars {
    return stage === DECISION_STAGE ? CLUSTER_CONVERGED : CLUSTER_REST;
}

export function applyAmbientBaseline(stage: StageIndex): void {
    for (const [selector, state] of Object.entries(restStateFor(stage))) {
        gsap.set(selector, state);
    }
    gsap.set("[data-graph-cluster]", clusterStateFor(stage));
}

export function applyPhaseSnapshot(stage: StageIndex): void {
    const state = PHASE_STATES[stage];

    gsap.set(layer("sources"), state.sources);
    gsap.set(layer("graph"), state.graph);
    gsap.set(layer("decision"), state.decision);
    gsap.set(layer("integration"), state.integration);

    gsap.set('[data-decision-route="true"]', { autoAlpha: state.routeAlpha });
    gsap.set(
        '[data-graph-edge]:not([data-decision-route="true"]):not([data-phase-four-edge="true"])',
        { autoAlpha: state.graphAlpha },
    );

    applyAmbientBaseline(stage);
}

/**
 * The scene as its loop leaves it. Used whenever there is no loop to run — the
 * section has been left behind, or the viewport never gets the choreography at
 * all — so what stays on screen is what the scene was building towards rather
 * than its first frame.
 */
export function applySettledPhase(stage: StageIndex): void {
    applyPhaseSnapshot(stage);
    // `repeat(0)` first: seeking the end of an endlessly repeating timeline is
    // not the end of one pass through it.
    buildAmbientLoop(stage).repeat(0).progress(1).kill();
}

/**
 * Getting into the scene — and, for the two scenes either side of the decision,
 * the part worth watching. Gathering the graph into the core and unfolding it
 * back out both happen here.
 */
export function buildPhaseTransition(stage: StageIndex): gsap.core.Timeline {
    const state = PHASE_STATES[stage];
    const timeline = gsap.timeline({
        defaults: { duration: 0.62, ease: "power2.inOut" },
    });

    for (const [selector, baseline] of Object.entries(AMBIENT_BASELINE)) {
        timeline.to(selector, baseline, 0);
    }

    if (stage === DECISION_STAGE) {
        timeline
            .to("[data-graph-cross-edges]", { autoAlpha: 0, duration: 0.45 }, 0)
            .to(
                "[data-graph-cluster] text",
                { autoAlpha: 0, duration: 0.4 },
                0.1,
            )
            .to(
                "[data-graph-cluster]",
                { ...CLUSTER_CONVERGED, duration: 1.25 },
                0.15,
            )
            .to(
                target("decision-core"),
                {
                    scale: 1,
                    autoAlpha: 1,
                    duration: 0.6,
                    ease: "back.out(1.4)",
                },
                1,
            )
            .to(
                target("decision-core-caption"),
                { autoAlpha: 1, duration: 0.35 },
                1.4,
            );
    } else {
        timeline.to(
            "[data-graph-cluster]",
            // Slower and eased out: leaving the decision scene, this is the
            // graph unfolding back out of the core it collapsed into.
            { ...CLUSTER_REST, duration: 1.1, ease: "power3.out" },
            0,
        );
    }

    return timeline
        .to(layer("sources"), state.sources, 0)
        .to(layer("graph"), state.graph, 0)
        .to(layer("decision"), state.decision, 0)
        .to(layer("integration"), state.integration, 0)
        .to('[data-decision-route="true"]', { autoAlpha: state.routeAlpha }, 0)
        .to(
            '[data-graph-edge]:not([data-decision-route="true"]):not([data-phase-four-edge="true"])',
            { autoAlpha: state.graphAlpha },
            0,
        );
}

function sourcesLoop(timeline: gsap.core.Timeline): gsap.core.Timeline {
    const packets = gsap.utils.toArray<SVGCircleElement>(
        "[data-context-packet]",
    );
    const travel = 1.15;
    const waveGap = 2.2;

    // Two passes per loop, so there is always context in flight rather than one
    // sparse volley and a wait.
    for (const wave of [0, waveGap]) {
        packets.forEach((packet, index) => {
            const x = Number(packet.dataset.packetX);
            const y = Number(packet.dataset.packetY);
            const at = wave + index * 0.085;
            const mark = `[data-source-mark="${packet.dataset.contextPacket}"]`;

            timeline
                .set(packet, { x: 0, y: 0, autoAlpha: 0 }, at)
                .to(packet, { autoAlpha: 1, scale: 1, duration: 0.14 }, at)
                // Accelerating inward reads as being drawn in rather than
                // drifting past.
                .to(packet, { x, y, duration: travel, ease: "power1.in" }, at)
                .to(
                    packet,
                    { autoAlpha: 0, scale: 0.4, duration: 0.18 },
                    at + travel - 0.18,
                )
                // The card kicks as it lets a packet go — without it the source
                // reads as scenery the dots merely happen to start near.
                .to(
                    mark,
                    {
                        scale: 1.05,
                        duration: 0.16,
                        yoyo: true,
                        repeat: 1,
                        ease: "power2.out",
                    },
                    at,
                );
        });
    }

    return (
        timeline
            // The dashes crawling along each path are what make the connection
            // read as a feed and not as decoration.
            .to(
                "[data-context-path]",
                {
                    strokeDashoffset: -FLOW_DASH_PERIOD * 6,
                    duration: waveGap * 2,
                    ease: "none",
                },
                0,
            )
            // Drift only — the scale on these belongs to the emission kick
            // above, and two tweens on one property would fight.
            .to(
                "[data-source-mark]",
                {
                    y: (index: number) => (index % 2 === 0 ? -19 : 15),
                    rotation: (index: number) => (index % 2 === 0 ? 3.5 : -3),
                    duration: waveGap,
                    stagger: 0.05,
                    yoyo: true,
                    repeat: 1,
                    ease: "sine.inOut",
                },
                0,
            )
            // The core swells as each volley lands.
            .to(
                "[data-continuum-core]",
                {
                    scale: 1.06,
                    duration: 0.55,
                    yoyo: true,
                    repeat: 3,
                    ease: "sine.inOut",
                },
                travel - 0.3,
            )
    );
}

function graphLoop(timeline: gsap.core.Timeline): gsap.core.Timeline {
    return timeline
        .to(
            "[data-graph-camera]",
            {
                rotation: 6,
                scale: 1.035,
                transformOrigin: "center center",
                duration: 3.4,
                ease: "sine.inOut",
            },
            0,
        )
        .to(
            "[data-graph-camera]",
            { rotation: -4, scale: 0.995, duration: 3.6, ease: "sine.inOut" },
            3.4,
        )
        .to(
            "[data-graph-camera]",
            { rotation: 0, scale: 1, duration: 3, ease: "sine.inOut" },
            7,
        )
        .to(
            "[data-graph-cluster]",
            {
                ...CLUSTER_TRANSFORM_BASE,
                // Small, because at this origin a cluster's rotation swings it
                // around the canvas rather than turning it in place.
                rotation: (index: number) => (index % 2 === 0 ? 2 : -1.6),
                duration: 5,
                stagger: 0.15,
                yoyo: true,
                repeat: 1,
                ease: "sine.inOut",
            },
            0,
        );
}

function routeNodes(): readonly LandingGraphNode[] {
    return DECISION_ROUTE_NODE_IDS.map((id) => {
        const node = LANDING_GRAPH_NODES.find(
            (candidate) => candidate.id === id,
        );
        if (!node) throw new Error(`Missing route node ${id}`);
        return node;
    });
}

/**
 * The decision scene arrives already converged, so its loop is not about the
 * graph — it is about the core continuing to take context in. Nothing here
 * reopens the graph.
 */
function decisionLoop(timeline: gsap.core.Timeline): gsap.core.Timeline {
    const particle = target("decision-particle");
    const origin = routeNodes()[0];
    const halo = target("decision-core-halo");
    const beat = 1.5;

    // Fresh context still arriving at the decision, from a different bearing
    // each time so the loop does not read as one repeated dash.
    const approaches = [
        { x: -18, y: 22 },
        { x: 118, y: 34 },
        { x: 44, y: 122 },
    ];

    if (origin) {
        approaches.forEach((from, index) => {
            const at = index * beat;

            timeline
                .set(
                    particle,
                    {
                        x: from.x - origin.x,
                        y: from.y - origin.y,
                        autoAlpha: 0,
                    },
                    at,
                )
                .to(particle, { autoAlpha: 1, duration: 0.18 }, at)
                .to(
                    particle,
                    {
                        x: CANVAS_CENTRE - origin.x,
                        y: CANVAS_CENTRE - origin.y,
                        duration: 0.95,
                        ease: "power2.in",
                    },
                    at,
                )
                .to(particle, { autoAlpha: 0, duration: 0.16 }, at + 0.88)
                // The core takes the hit.
                .to(
                    target("decision-core"),
                    {
                        scale: 1.04,
                        duration: 0.22,
                        yoyo: true,
                        repeat: 1,
                        ease: "sine.out",
                    },
                    at + 0.92,
                )
                .fromTo(
                    halo,
                    { scale: 1, autoAlpha: 0.5 },
                    {
                        scale: 1.28,
                        autoAlpha: 0,
                        duration: 0.8,
                        ease: "power2.out",
                    },
                    at + 0.92,
                );
        });
    }

    return timeline.to({}, { duration: 0.6 }, approaches.length * beat);
}

function integrationLoop(timeline: gsap.core.Timeline): gsap.core.Timeline {
    const signals = PHASE_FOUR_NODE_IDS.map((id) => {
        const node = LANDING_GRAPH_NODES.find(
            (candidate) => candidate.id === id,
        );
        if (!node) throw new Error(`Missing phase four node ${id}`);
        return node;
    });

    const signal = target("integration-signal");
    const wave = target("integration-wave");
    const beat = 1.6;

    // Everything the loop is about to build, cleared — this is also the frame
    // the loop returns to when it repeats.
    timeline
        .set('[data-phase-four-node="true"]', { scale: 0.35, autoAlpha: 0 }, 0)
        .set('[data-phase-four-edge="true"]', { autoAlpha: 0 }, 0);

    signals.forEach((node, index) => {
        const at = index * beat;
        // Signals arrive from the edge nearest the node they become.
        const entryX = node.x < CANVAS_CENTRE ? -16 : 116;

        timeline
            .set(
                signal,
                { x: entryX, y: node.y, scale: 0.85, autoAlpha: 0 },
                at,
            )
            .to(signal, { autoAlpha: 1, scale: 1, duration: 0.24 }, at)
            .to(
                signal,
                {
                    x: node.x,
                    y: node.y,
                    duration: 0.66,
                    ease: "power2.inOut",
                },
                at + 0.1,
            )
            .to(signal, { autoAlpha: 0, scale: 0.4, duration: 0.22 }, at + 0.66)
            .to(
                `[data-phase-four-node="true"][data-signal-order="${index}"]`,
                {
                    scale: 1,
                    autoAlpha: 1,
                    duration: 0.34,
                    ease: "back.out(2)",
                },
                at + 0.74,
            )
            .to(
                `[data-phase-four-edge="true"][data-signal-order="${index}"]`,
                { autoAlpha: 1, duration: 0.36, stagger: 0.08 },
                at + 0.86,
            )
            .fromTo(
                wave,
                { x: node.x, y: node.y, scale: 0.25, autoAlpha: 0.75 },
                {
                    scale: 1.5,
                    autoAlpha: 0,
                    duration: 0.85,
                    ease: "power2.out",
                },
                at + 0.76,
            );
    });

    // A beat on the finished graph before the loop clears it and starts again.
    return timeline.to({}, { duration: 1.5 }, signals.length * beat + 0.4);
}

const AMBIENT_LOOPS: Record<
    StageIndex,
    (timeline: gsap.core.Timeline) => gsap.core.Timeline
> = {
    0: sourcesLoop,
    1: graphLoop,
    2: decisionLoop,
    3: integrationLoop,
};

/**
 * The scene's own motion, on its own clock. The scroll decides which scene is
 * showing; once there, this runs and repeats regardless of where the scroll
 * settles. Every loop ends on the state it started from, so the repeat is
 * seamless.
 */
export function buildAmbientLoop(stage: StageIndex): gsap.core.Timeline {
    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.35 });
    AMBIENT_LOOPS[stage](timeline);
    return timeline;
}
