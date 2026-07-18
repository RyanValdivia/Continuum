import {
    index,
    jsonb,
    pgEnum,
    pgTable,
    real,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
    AnalysisDimension,
    CandidateProfile,
    InterviewQuestion,
} from "@/core/recruitment/domain/types";
import { organization } from "./organization-schema";

export const vacancyBenchmarkType = pgEnum("vacancy_benchmark_type", [
    "person",
    "manual",
]);
export const vacancyStatus = pgEnum("vacancy_status", [
    "open",
    "filled",
    "closed",
]);
export const candidateStatus = pgEnum("candidate_status", [
    "pending",
    "analyzed",
    "failed",
]);

/**
 * An open role. `id` is also the id of its `vacancy` knowledge node — for
 * person-born vacancies that is the departed member's id, so the whole
 * person's subgraph stays attached to the vacancy.
 */
export const vacancy = pgTable(
    "vacancy",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        benchmarkType: vacancyBenchmarkType("benchmark_type").notNull(),
        manualDescription: text("manual_description"),
        publicToken: text("public_token").notNull().unique(),
        status: vacancyStatus("status").default("open").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("vacancy_organization_id_idx").on(table.organizationId)],
);

/**
 * One application to a vacancy. The original PDF is NOT retained — only the
 * extracted plain text and the LLM-structured profile.
 */
export const candidate = pgTable(
    "candidate",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        vacancyId: text("vacancy_id")
            .notNull()
            .references(() => vacancy.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        email: text("email").notNull(),
        cvFilename: text("cv_filename").notNull(),
        cvText: text("cv_text").notNull(),
        profile: jsonb("profile").$type<CandidateProfile>().notNull(),
        status: candidateStatus("status").default("pending").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("candidate_vacancy_id_idx").on(table.vacancyId),
        // One application per email per vacancy.
        uniqueIndex("candidate_vacancy_email_uq").on(
            table.vacancyId,
            table.email,
        ),
    ],
);

/** LLM comparison of a candidate against the vacancy benchmark. 1:1. */
export const analysis = pgTable("analysis", {
    candidateId: text("candidate_id")
        .primaryKey()
        .references(() => candidate.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    dimensions: jsonb("dimensions").$type<AnalysisDimension[]>().notNull(),
    summary: text("summary").notNull(),
    interviewQuestions: jsonb("interview_questions")
        .$type<InterviewQuestion[]>()
        .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VacancyRow = typeof vacancy.$inferSelect;
export type NewVacancyRow = typeof vacancy.$inferInsert;
export type CandidateRow = typeof candidate.$inferSelect;
export type NewCandidateRow = typeof candidate.$inferInsert;
export type AnalysisRow = typeof analysis.$inferSelect;
export type NewAnalysisRow = typeof analysis.$inferInsert;
