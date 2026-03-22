import { db } from "@/db";
import { credits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FREE_CREDITS } from "@/lib/constant";

export const updateCredits = async (userId: string) => {
    const credit = await db.query.credits.findFirst({
        where: eq(credits.userId, userId),
        columns: { balance: true, lastResetAt: true },
    });
    if (!credit) {
        throw new Error("failed to check account status");
    }

    const now = new Date();
    const isNewDay = now.toISOString().slice(0, 10) > credit.lastResetAt.toISOString().slice(0, 10);

    if (isNewDay) {
        await db
            .update(credits)
            .set({ balance: FREE_CREDITS, lastResetAt: now })
            .where(eq(credits.userId, userId));
        return FREE_CREDITS;
    }

    return credit.balance;
};


export const chargeCredits = async (userId: string, currentBalance: number) => {
    // We can trust `currentBalance`
    if (currentBalance <= 0) {
        throw new Error("Insufficient credits");
    }

    await db
        .update(credits)
        .set({ balance: currentBalance - 1 })
        .where(eq(credits.userId, userId));
    return currentBalance - 1;
};