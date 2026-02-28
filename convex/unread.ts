import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const resetUnreadCount = mutation({
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
        const user = await requireUser(ctx);

        return await ctx.db
            .query("unread")
            .withIndex("by_user_conversation", (q) => q.eq("userId", user._id))
            .collect();
    },
});
