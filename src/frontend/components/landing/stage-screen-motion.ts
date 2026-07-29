import { gsap } from "gsap";
import {
    DECISION_ROUTE_NODE_IDS,
    LANDING_GRAPH_NODES,
} from "./stage-screen-data";

export const layer = (name: string) => `[data-constellation-layer="${name}"]`;
export const target = (name: string) => `[data-${name}]`;

export type StageIndex = 0 | 1 | 2 | 3;

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
        graph: { autoAlpha: 1, scale: 1.02 },
        decision: { autoAlpha: 1, scale: 1 },
        integration: { autoAlpha: 0, scale: 0.8 },
        routeAlpha: 1,
        graphAlpha: 0.24,
    },
    3: {
        sources: { autoAlpha: 0, scale: 0.2 },
        graph: { autoAlpha: 1, scale: 1 },
        decision: { autoAlpha: 0.55, scale: 0.96 },
        integration: { autoAlpha: 1, scale: 1 },
        routeAlpha: 0.55,
        graphAlpha: 0.58,
    },
};

export type AmbientPauseState = {
    isHidden: boolean;
    active: boolean;
    transitionComplete: boolean;
    ambientReady: boolean;
};

type PhaseFourVisibility = {
    node: LayerState;
    edge: { autoAlpha: number };
};

export const PHASE_FOUR_COMPLETED: PhaseFourVisibility = {
    node: { autoAlpha: 1, scale: 1 },
    edge: { autoAlpha: 1 },
};

const PHASE_FOUR_HIDDEN: PhaseFourVisibility = {
    node: { autoAlpha: 0, scale: 0.35 },
    edge: { autoAlpha: 0 },
};

function phaseFourVisibilityFor(stage: StageIndex): PhaseFourVisibility {
    return stage === 3 ? PHASE_FOUR_COMPLETED : PHASE_FOUR_HIDDEN;
}

export function applyPhaseFourSnapshot(visibility: PhaseFourVisibility): void {
    gsap.set('[data-phase-four-node="true"]', visibility.node);
    gsap.set('[data-phase-four-edge="true"]', visibility.edge);
}

export function applyTransientHiddenSnapshot(): void {
    gsap.set(target("integration-signal"), {
        x: 0,
        y: 0,
        scale: 1,
        autoAlpha: 0,
    });
    gsap.set(target("integration-wave"), { scale: 1, autoAlpha: 0 });
}

const AMBIENT_REPEAT_POLICIES = {
    0: -1,
    1: -1,
    2: -1,
    3: 0,
} as const;

type AmbientRepeatPolicy = (typeof AMBIENT_REPEAT_POLICIES)[StageIndex];

export function ambientRepeatPolicy(stage: StageIndex): AmbientRepeatPolicy {
    return AMBIENT_REPEAT_POLICIES[stage];
}

export function shouldPauseAmbient(args: AmbientPauseState): boolean {
    return (
        args.isHidden ||
        !args.active ||
        !args.transitionComplete ||
        !args.ambientReady
    );
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

    applyPhaseFourSnapshot(phaseFourVisibilityFor(stage));

    gsap.set("[data-source-mark]", { y: 0, rotation: 0 });
    gsap.set("[data-context-packet]", { x: 0, y: 0, autoAlpha: 0 });
    gsap.set("[data-graph-camera]", { rotation: 0, scale: 1 });
    gsap.set("[data-graph-cluster]", { rotation: 0 });
    gsap.set(target("decision-particle"), { x: 0, y: 0, autoAlpha: 0 });
    applyTransientHiddenSnapshot();
}

export function buildPhaseTransition(stage: StageIndex): gsap.core.Timeline {
    const state = PHASE_STATES[stage];

    return gsap
        .timeline({
            defaults: {
                duration: 0.62,
                ease: "power2.inOut",
                overwrite: "auto",
            },
        })
        .to("[data-source-mark]", { y: 0, rotation: 0 }, 0)
        .to("[data-context-packet]", { x: 0, y: 0, autoAlpha: 0 }, 0)
        .to("[data-graph-camera]", { rotation: 0, scale: 1 }, 0)
        .to("[data-graph-cluster]", { rotation: 0 }, 0)
        .to(target("decision-particle"), { x: 0, y: 0, autoAlpha: 0 }, 0)
        .to(
            target("integration-signal"),
            {
                x: 0,
                y: 0,
                scale: 1,
                autoAlpha: 0,
            },
            0,
        )
        .to(target("integration-wave"), { autoAlpha: 0, scale: 1 }, 0)
        .to(layer("sources"), state.sources, 0)
        .to(layer("graph"), state.graph, 0)
        .to(layer("decision"), state.decision, 0)
        .to(layer("integration"), state.integration, 0)
        .to('[data-decision-route="true"]', { autoAlpha: state.routeAlpha }, 0)
        .to(
            '[data-graph-edge]:not([data-decision-route="true"]):not([data-phase-four-edge="true"])',
            { autoAlpha: state.graphAlpha },
            0,
        )
        .to('[data-phase-four-node="true"]', { autoAlpha: 0, scale: 0.35 }, 0)
        .to('[data-phase-four-edge="true"]', { autoAlpha: 0 }, 0);
}

export function buildAmbientTimeline(stage: StageIndex): gsap.core.Timeline {
    const timeline = gsap.timeline({
        repeat: ambientRepeatPolicy(stage),
        repeatDelay: 0.8,
    });

    if (stage === 0) {
        const packets = gsap.utils.toArray<SVGCircleElement>(
            "[data-context-packet]",
        );
        packets.forEach((packet, index) => {
            const x = Number(packet.dataset.packetX);
            const y = Number(packet.dataset.packetY);
            const at = index * 0.08;

            timeline
                .set(packet, { x: 0, y: 0, autoAlpha: 0 }, at)
                .to(packet, { autoAlpha: 1, duration: 0.12 }, at)
                .to(packet, { x, y, duration: 1.05, ease: "power1.in" }, at)
                .to(packet, { autoAlpha: 0, duration: 0.12 }, at + 0.93);
        });

        return timeline
            .to(
                "[data-source-mark]",
                {
                    y: (index) => (index % 2 === 0 ? -8 : 6),
                    rotation: (index) => (index % 2 === 0 ? 2 : -2),
                    duration: 1.8,
                    stagger: 0.06,
                    ease: "sine.inOut",
                },
                0,
            )
            .to("[data-source-mark]", {
                y: 0,
                rotation: 0,
                duration: 1.8,
                stagger: 0.04,
                ease: "sine.inOut",
            })
            .to({}, { duration: 0.8 });
    }

    if (stage === 1) {
        return timeline
            .to("[data-graph-camera]", {
                rotation: 3,
                scale: 1.02,
                transformOrigin: "center center",
                duration: 3.2,
                ease: "sine.inOut",
            })
            .to("[data-graph-camera]", {
                rotation: -2,
                scale: 0.99,
                duration: 3.2,
                ease: "sine.inOut",
            })
            .to(
                "[data-graph-cluster]",
                {
                    rotation: (index) => (index % 2 === 0 ? 1.8 : -1.5),
                    duration: 2.8,
                    stagger: 0.12,
                    yoyo: true,
                    repeat: 1,
                    ease: "sine.inOut",
                },
                0,
            );
    }

    if (stage === 2) {
        const routeNodes = DECISION_ROUTE_NODE_IDS.map((id) => {
            const node = LANDING_GRAPH_NODES.find(
                (candidate) => candidate.id === id,
            );
            if (!node) throw new Error(`Missing route node ${id}`);
            return node;
        });
        const origin = routeNodes[0];
        const particle = target("decision-particle");

        if (!origin) {
            return timeline;
        }

        timeline.set(particle, { x: 0, y: 0, autoAlpha: 0 });
        timeline.to(particle, { autoAlpha: 1, duration: 0.18 });

        for (const node of routeNodes.slice(1)) {
            timeline.to(particle, {
                x: node.x - origin.x,
                y: node.y - origin.y,
                duration: 0.42,
                ease: "power1.inOut",
            });
        }

        return timeline
            .to(target("decision-focus"), { scale: 1.04, duration: 0.24 })
            .to(target("decision-focus"), { scale: 1, duration: 0.28 })
            .to(particle, { autoAlpha: 0, duration: 0.18 })
            .to({}, { duration: 1.1 });
    }

    return timeline
        .set(target("integration-signal"), {
            x: 40,
            y: 26,
            scale: 0.8,
            autoAlpha: 0,
        })
        .set('[data-phase-four-node="true"]', { scale: 0.35, autoAlpha: 0 })
        .set('[data-phase-four-edge="true"]', { autoAlpha: 0 })
        .to(target("integration-signal"), {
            x: 0,
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.32,
        })
        .to(target("integration-signal"), {
            x: -128,
            y: -76,
            scale: 0.3,
            autoAlpha: 0,
            duration: 0.72,
            ease: "power2.in",
        })
        .to(
            '[data-phase-four-node="true"]',
            { scale: 1, autoAlpha: 1, duration: 0.3 },
            ">-0.12",
        )
        .to(
            '[data-phase-four-edge="true"]',
            { autoAlpha: 1, duration: 0.32, stagger: 0.08 },
            ">-0.1",
        )
        .fromTo(
            target("integration-wave"),
            { scale: 0.4, autoAlpha: 0.8 },
            { scale: 1.45, autoAlpha: 0, duration: 0.75 },
        )
        .to(
            "[data-graph-camera]",
            { scale: 1.025, duration: 0.24, yoyo: true, repeat: 1 },
            "<",
        )
        .to({}, { duration: 1.2 });
}
