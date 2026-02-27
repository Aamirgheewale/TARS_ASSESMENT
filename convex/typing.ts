import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const setTyping = mutation({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) throw new Error("Conversation not found");

        if (!conversation.participants.includes(user._id)) {
            throw new Error("Access denied");
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
        const currentUser = await requireUser(ctx);

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) throw new Error("Conversation not found");

        if (!conversation.participants.includes(currentUser._id)) {
            throw new Error("Access denied");
        }

        const typingRecords = await ctx.db
            .query("typing")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .collect();

        const now = Date.now();
        const activeTypers = typingRecords.filter(
            (t) => t.userId !== currentUser._id && t.expiresAt > now
        );

        if (activeTypers.length === 0) return null;

        const users = await Promise.all(
            activeTypers.map((t) => ctx.db.get(t.userId))
        );

        const names = users.filter((u) => !!u).map((u) => u!.name);

        if (names.length === 0) return null;
        if (names.length === 1) return names[0];
        if (names.length === 2) return `${names[0]} and ${names[1]}`;
        return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
    },
});
