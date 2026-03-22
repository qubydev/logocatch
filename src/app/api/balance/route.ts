import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { updateCredits } from "@/lib/helpers";

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

        const credits = await updateCredits(session.user.id);
        return NextResponse.json({ balance: credits });

    } catch (error) {
        return NextResponse.json(
            { balance: null, error: "Failed to retrieve balance" },
            { status: 500 }
        );
    }
};