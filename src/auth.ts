import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { credits } from "./db/schema";
import { generateId } from "better-auth";
import { FREE_CREDITS } from "@/lib/constant";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    await db.insert(credits).values({
                        id: generateId(),
                        userId: user.id,
                        balance: FREE_CREDITS,
                    });
                },
            },
        },
    },
});