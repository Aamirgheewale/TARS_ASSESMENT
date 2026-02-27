import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
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

        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: user._id,
            content: args.content,
            deleted: false,
            createdAt: Date.now(),
        });

        const conversation = await ctx.db.get(args.conversationId);
        if (conversation) {
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
        }

        return messageId;
    },
});

export const getMessages = query({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
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
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return false;
        }

        const message = await ctx.db.get(args.messageId);
        if (!message) {
            return false;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user || message.senderId !== user._id) {
            return false;
        }

        await ctx.db.patch(args.messageId, {
            deleted: true,
        });

        return true;
    },
});
