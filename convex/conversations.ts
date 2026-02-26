import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createOrGetConversation = mutation({
    args: {
        otherUserId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) {
            throw new Error("User not found");
        }

        // Check if the other user exists
        const otherUser = await ctx.db.get(args.otherUserId);
        if (!otherUser) {
            throw new Error("Other user not found");
        }

        // Check if a 1-on-1 conversation already exists between these two users
        const sortedParticipants = [currentUser._id, args.otherUserId].sort();

        const existingConversation = await ctx.db
            .query("conversations")
            .filter((q) =>
                q.and(
                    q.eq(q.field("isGroup"), false),
                    q.eq(q.field("participants"), sortedParticipants)
                )
            )
            .unique();

        if (existingConversation) {
            return existingConversation._id;
        }

        // Create a new conversation
        const conversationId = await ctx.db.insert("conversations", {
            participants: sortedParticipants,
            isGroup: false,
        });

        return conversationId;
    },
});

export const getConversationById = query({
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
            throw new Error("User not found");
        }

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) {
            return null;
        }

        // Find the other participant
        const otherUserId = conversation.participants.find((id) => id !== currentUser._id);
        if (!otherUserId) {
            return null;
        }

        const otherUser = await ctx.db.get(otherUserId);
        if (!otherUser) {
            return null;
        }

        return {
            ...conversation,
            otherUser,
        };
    },
});
