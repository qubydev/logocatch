import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { credits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FREE_CREDITS } from "@/lib/constant";

export const GET = async (request: NextRequest) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session) {
            return NextResponse.json(
                { balance: null, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const credit = await db.query.credits.findFirst({
            where: eq(credits.userId, session.user.id),
            columns: { balance: true, lastResetAt: true },
        });

        if (!credit) {
            return NextResponse.json(
                { balance: null, error: "Credits not found" },
                { status: 404 }
            );
        }

        const now = new Date();
        const isNewDay = now.toISOString().slice(0, 10) > credit.lastResetAt.toISOString().slice(0, 10);

        if (isNewDay) {
            await db
                .update(credits)
                .set({ balance: FREE_CREDITS, lastResetAt: now })
                .where(eq(credits.userId, session.user.id));

            return NextResponse.json({ balance: FREE_CREDITS });
        }

        return NextResponse.json({ balance: credit.balance });

    } catch (error) {
        return NextResponse.json(
            { balance: null, error: "Failed to retrieve balance" },
            { status: 500 }
        );
    }
};