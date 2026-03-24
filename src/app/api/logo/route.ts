import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchLogo } from "@/lib/extractor";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { chargeCredits, updateCredits } from "@/lib/helpers";

const RequestSchema = z.object({
    url: z.url("Please provide a valid URL"),
});

type ApiResponse = {
    logo: string | null;
    source: string | null;
    error: string | null;
};

export const POST = async (request: NextRequest) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            return NextResponse.json<ApiResponse>(
                { logo: null, source: null, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();

        if (typeof body.url === "string" && !body.url.startsWith("http")) {
            body.url = `https://${body.url}`;
        }

        const parsed = RequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json<ApiResponse>(
                { logo: null, source: null, error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const credits = await updateCredits(session.user.id);
        const totalCredits = credits.freeCredits + credits.paidCredits;

        if (totalCredits <= 0) {
            return NextResponse.json<ApiResponse>(
                { logo: null, source: null, error: "Insufficient credits" },
                { status: 402 }
            );
        }

        const { url } = parsed.data;
        const { success, logo, source, error } = await fetchLogo(url);

        if (!success) {
            return NextResponse.json<ApiResponse>(
                { logo: null, source: null, error: error || "Failed to fetch logo" },
                { status: 404 }
            );
        }

        await chargeCredits(session.user.id);

        return NextResponse.json<ApiResponse>({
            logo,
            source,
            error: null,
        });

    } catch (err) {
        console.log("Error in /api/logo:", err);

        if (err instanceof SyntaxError) {
            return NextResponse.json<ApiResponse>(
                { logo: null, source: null, error: "Invalid request" },
                { status: 400 }
            );
        }

        return NextResponse.json<ApiResponse>(
            { logo: null, source: null, error: "Something went wrong, please try again" },
            { status: 500 }
        );
    }
};