import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";

const ORG_SLUG = "ai-do";
const ORG_NAME = "AI-DO";

const OWNER = {
    name: "Ryan Valdivia",
    email: "rvaldiviase@unsa.edu.pe",
    password: "12345678",
};

const MEMBERS = [
    {
        name: "Ryan Fabian",
        email: "ryanfabianv@gmail.com",
        password: "12345678",
        role: "member",
    },
];

const isLocalDatabase = /\/\/[^@]*@?(localhost|127\.0\.0\.1)/.test(
    process.env.DATABASE_URL ?? "",
);
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
});

async function upsertUser(name: string, email: string, password: string) {
    const { rows } = await pool.query(
        `select id from "user" where lower(email) = lower($1)`,
        [email],
    );

    const userId: string = rows[0]?.id ?? randomUUID();
    if (rows.length === 0) {
        await pool.query(
            `insert into "user" (id, name, email, email_verified, created_at, updated_at)
             values ($1, $2, $3, true, now(), now())`,
            [userId, name, email],
        );
        console.log(`Created user ${email}`);
    } else {
        console.log(`User already exists: ${email}`);
    }

    const hashed = await hashPassword(password);
    const { rows: accountRows } = await pool.query(
        `select id from account where user_id = $1 and provider_id = 'credential'`,
        [userId],
    );
    if (accountRows.length > 0) {
        await pool.query(
            `update account set password = $1, updated_at = now() where id = $2`,
            [hashed, accountRows[0].id],
        );
    } else {
        await pool.query(
            `insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
             values ($1, $2, 'credential', $2, $3, now(), now())`,
            [randomUUID(), userId, hashed],
        );
    }

    return userId;
}

async function ensureMember(
    organizationId: string,
    userId: string,
    role: string,
) {
    const { rows } = await pool.query(
        `select id from member where organization_id = $1 and user_id = $2`,
        [organizationId, userId],
    );
    if (rows.length > 0) {
        console.log(`Already a member (role ${role} requested, existing kept).`);
        return;
    }
    await pool.query(
        `insert into member (id, organization_id, user_id, role, created_at)
         values ($1, $2, $3, $4, now())`,
        [randomUUID(), organizationId, userId, role],
    );
    console.log(`Added member (role ${role}).`);
}

async function main() {
    const ownerId = await upsertUser(OWNER.name, OWNER.email, OWNER.password);

    const { rows: orgRows } = await pool.query(
        `select id from organization where slug = $1`,
        [ORG_SLUG],
    );
    const orgId: string = orgRows[0]?.id ?? randomUUID();
    if (orgRows.length === 0) {
        await pool.query(
            `insert into organization (id, name, slug, created_at)
             values ($1, $2, $3, now())`,
            [orgId, ORG_NAME, ORG_SLUG],
        );
        console.log(`Created organization ${ORG_NAME} (${ORG_SLUG})`);
    } else {
        console.log(`Organization already exists: ${ORG_SLUG}`);
    }

    await ensureMember(orgId, ownerId, "owner");

    for (const m of MEMBERS) {
        const userId = await upsertUser(m.name, m.email, m.password);
        await ensureMember(orgId, userId, m.role);
    }

    await pool.end();
    console.log("Seed complete.");
}

main();
