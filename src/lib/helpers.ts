import { db } from "@/db";
import { credits } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { FREE_CREDITS } from "@/lib/constant";

export const updateCredits = async (userId: string) => {
    const credit = await db.query.credits.findFirst({
        where: eq(credits.userId, userId),
        columns: {
            freeCredits: true,
            paidCredits: true,
            lastResetAt: true,
        },
    });

    if (!credit) {
        throw new Error("failed to check account status");
    }

    const now = new Date();

    const isNewDay =
        now.toISOString().slice(0, 10) >
        credit.lastResetAt.toISOString().slice(0, 10);

    if (isNewDay) {
        await db
            .update(credits)
            .set({
                freeCredits: FREE_CREDITS,
                lastResetAt: now,
            })
            .where(eq(credits.userId, userId));

        return {
            freeCredits: FREE_CREDITS,
            paidCredits: credit.paidCredits,
        };
    }

    return credit;
};

export const chargeCredits = async (userId: string) => {
    const freeUpdate = await db
        .update(credits)
        .set({
            freeCredits: sql`${credits.freeCredits} - 1`,
        })
        .where(
            and(
                eq(credits.userId, userId),
                gt(credits.freeCredits, 0)
            )
        )
        .returning({
            freeCredits: credits.freeCredits,
            paidCredits: credits.paidCredits,
        });

    if (freeUpdate.length > 0) {
        return freeUpdate[0];
    }

    const paidUpdate = await db
        .update(credits)
        .set({
            paidCredits: sql`${credits.paidCredits} - 1`,
        })
        .where(
            and(
                eq(credits.userId, userId),
                gt(credits.paidCredits, 0)
            )
        )
        .returning({
            freeCredits: credits.freeCredits,
            paidCredits: credits.paidCredits,
        });

    if (paidUpdate.length > 0) {
        return paidUpdate[0];
    }

    throw new Error("Insufficient credits");
};