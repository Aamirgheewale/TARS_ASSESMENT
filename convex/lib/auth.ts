import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Reusable helper to ensure the user is authenticated and exists in our database.
 * Throws an error if the user is not authenticated or not found.
 */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Unauthorized");
    }

    const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique();

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}
