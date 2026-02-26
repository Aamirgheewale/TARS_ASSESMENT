import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const resetUnreadCount = mutation({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
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

        const existing = await ctx.db
            .query("unread")
            .withIndex("by_user_conversation", (q) =>
                q.eq("userId", user._id).eq("conversationId", args.conversationId)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, { count: 0 });
        }
    },
});

export const getUnreadCounts = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) {
            return [];
        }

        return await ctx.db
            .query("unread")
            .withIndex("by_user_conversation", (q) => q.eq("userId", user._id))
            .collect();
    },
});
