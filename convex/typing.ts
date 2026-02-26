import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const setTyping = mutation({
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
            .query("typing")
            .withIndex("by_conversationId_userId", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", user._id)
            )
            .unique();

        const expiresAt = Date.now() + 3000;

        if (existing) {
            await ctx.db.patch(existing._id, { expiresAt });
        } else {
            await ctx.db.insert("typing", {
                conversationId: args.conversationId,
                userId: user._id,
                expiresAt,
            });
        }
    },
});

export const getTypingIndicator = query({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) {
            return null;
        }

        const typingRecords = await ctx.db
            .query("typing")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        const now = Date.now();
        // Return the name of the first user that fits (excluding current user)
        const typingUserRecord = typingRecords.find(
            (t) => t.userId !== currentUser._id && t.expiresAt > now
        );

        if (!typingUserRecord) return null;

        const user = await ctx.db.get(typingUserRecord.userId);
        return user ? user.name : null;
    },
});
