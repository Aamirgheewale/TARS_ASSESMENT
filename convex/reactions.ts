import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const SUPPORTED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

export const toggleReaction = mutation({
    args: {
        messageId: v.id("messages"),
        emoji: v.string(),
    },
    handler: async (ctx, args) => {
        if (!SUPPORTED_EMOJIS.includes(args.emoji)) {
            throw new Error("Unsupported emoji");
        }

        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const userId = identity.subject;

        const existing = await ctx.db
            .query("reactions")
            .withIndex("by_message_user", (q) =>
                q.eq("messageId", args.messageId).eq("userId", userId)
            )
            .filter((q) => q.eq(q.field("emoji"), args.emoji))
            .unique();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { removed: true };
        } else {
            await ctx.db.insert("reactions", {
                messageId: args.messageId,
                userId,
                emoji: args.emoji,
                createdAt: Date.now(),
            });
            return { added: true };
        }
    },
});

export const getReactionsByMessage = query({
    args: {
        messageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("reactions")
            .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
            .collect();
    },
});
