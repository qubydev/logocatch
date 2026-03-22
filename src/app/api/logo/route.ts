import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchLogo } from "@/lib/extractor";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { credits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { chargeCredits, updateCredits } from "@/lib/helpers";

const RequestSchema = z.object({
    url: z.url("Please provide a valid URL"),
});

type ApiResponse = {
    logo: string | null;
    error: string | null;
};

export const POST = async (request: NextRequest) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session) {
            return NextResponse.json<ApiResponse>(
                { logo: null, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();

        const parsed = RequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json<ApiResponse>(
                {
                    logo: null,
                    error: parsed.error.issues[0].message,
                },
                { status: 400 }
            );
        }

        // Check credits
        const credits = await updateCredits(session.user.id);
        if (credits <= 0) {
            return NextResponse.json<ApiResponse>(
                { logo: null, error: "Insufficient credits" },
                { status: 402 }
            );
        }

        const { url } = parsed.data;
        const { success, logo, error } = await fetchLogo(url);

        if (success) {
            const chargedCredits = await chargeCredits(session.user.id, credits);

            return NextResponse.json<ApiResponse>({
                logo,
                error: null,
            });
        } else {
            return NextResponse.json<ApiResponse>(
                {
                    logo: null,
                    error: error || "Failed to fetch logo",
                },
                { status: 500 }
            );
        }
    } catch (err) {
        if (err instanceof SyntaxError) {
            return NextResponse.json<ApiResponse>(
                { logo: null, error: "Invalid request" },
                { status: 400 }
            );
        }

        return NextResponse.json<ApiResponse>(
            { logo: null, error: "Something went wrong, please try again" },
            { status: 500 }
        );
    }
};