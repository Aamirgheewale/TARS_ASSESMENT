import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) {
            throw new Error("Conversation not found");
        }

        if (!conversation.participants.includes(user._id)) {
            throw new Error("Access denied");
        }

        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: user._id,
            content: args.content,
            deleted: false,
            createdAt: Date.now(),
        });

        await ctx.db.patch(args.conversationId, {
            lastMessageId: messageId,
        });

        // Increment unread count for other participants
        for (const participantId of conversation.participants) {
            if (participantId !== user._id) {
                const unreadRecord = await ctx.db
                    .query("unread")
                    .withIndex("by_user_conversation", (q) =>
                        q.eq("userId", participantId).eq("conversationId", args.conversationId)
                    )
                    .unique();

                if (unreadRecord) {
                    await ctx.db.patch(unreadRecord._id, {
                        count: unreadRecord.count + 1,
                    });
                } else {
                    await ctx.db.insert("unread", {
                        userId: participantId,
                        conversationId: args.conversationId,
                        count: 1,
                    });
                }
            }
        }

        return messageId;
    },
});

export const getMessages = query({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) {
            throw new Error("Conversation not found");
        }

        if (!conversation.participants.includes(user._id)) {
            throw new Error("Access denied");
        }

        return await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
            .order("asc")
            .collect();
    },
});

export const deleteMessage = mutation({
    args: {
        messageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        const message = await ctx.db.get(args.messageId);
        if (!message) {
            return false;
        }

        if (message.senderId !== user._id) {
            return false;
        }

        await ctx.db.patch(args.messageId, {
            deleted: true,
        });

        return true;
    },
});
