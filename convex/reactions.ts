import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

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

        const user = await requireUser(ctx);

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        const conversation = await ctx.db.get(message.conversationId);
        if (!conversation) throw new Error("Conversation not found");

        if (!conversation.participants.includes(user._id)) {
            throw new Error("Access denied");
        }

        const existing = await ctx.db
            .query("reactions")
            .withIndex("by_message_user", (q) =>
                q.eq("messageId", args.messageId).eq("userId", user.clerkId)
            )
            .filter((q) => q.eq(q.field("emoji"), args.emoji))
            .unique();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { removed: true };
        } else {
            await ctx.db.insert("reactions", {
                messageId: args.messageId,
                userId: user.clerkId,
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
        const user = await requireUser(ctx);

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        const conversation = await ctx.db.get(message.conversationId);
        if (!conversation) throw new Error("Conversation not found");

        if (!conversation.participants.includes(user._id)) {
            throw new Error("Access denied");
        }

        return await ctx.db
            .query("reactions")
            .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
            .collect();
    },
});
