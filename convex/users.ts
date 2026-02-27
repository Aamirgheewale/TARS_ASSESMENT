import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const syncUser = mutation({
    args: {
        clerkId: v.string(),
        name: v.string(),
        email: v.string(),
        imageUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (existingUser) {
            await ctx.db.patch(existingUser._id, {
                name: args.name,
                imageUrl: args.imageUrl,
                online: true,
                lastSeen: Date.now(),
            });
            return existingUser._id;
        }

        const userId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            name: args.name,
            email: args.email,
            imageUrl: args.imageUrl,
            online: true,
            lastSeen: Date.now(),
        });

        return userId;
    },
});

export const getUsers = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) {
            return [];
        }

        const users = await ctx.db
            .query("users")
            .filter((q) => q.neq(q.field("clerkId"), identity.subject))
            .collect();

        // Fetch all 1-on-1 conversations for the current user
        const conversations = await ctx.db
            .query("conversations")
            .filter((q) => q.eq(q.field("isGroup"), false))
            .collect();

        // Filter those where current user is a participant
        const myConversations = conversations.filter((c) =>
            c.participants.includes(currentUser._id)
        );

        // Fetch all unread counts for the current user
        const unreadCounts = await ctx.db
            .query("unread")
            .withIndex("by_user_conversation", (q) => q.eq("userId", currentUser._id))
            .collect();

        return users.map((user) => {
            const conversation = myConversations.find((c) =>
                c.participants.includes(user._id)
            );
            const unread = conversation
                ? unreadCounts.find((u) => u.conversationId === conversation._id)
                : null;

            return {
                ...user,
                conversationId: conversation?._id,
                unreadCount: unread?.count || 0,
            };
        });
    },
});

export const updateStatus = mutation({
    args: {
        online: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.patch(user._id, {
            online: args.online,
            lastSeen: Date.now(),
        });
    },
});
export const getAllUsers = query({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        if (!args.clerkId) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!currentUser) return [];

        const users = await ctx.db
            .query("users")
            .filter((q) => q.neq(q.field("clerkId"), args.clerkId))
            .collect();

        // Fetch all 1-on-1 conversations for the current user
        const conversations = await ctx.db
            .query("conversations")
            .filter((q) => q.eq(q.field("isGroup"), false))
            .collect();

        const myConversations = conversations.filter((c) =>
            c.participants.includes(currentUser._id)
        );

        const unreadCounts = await ctx.db
            .query("unread")
            .withIndex("by_user_conversation", (q) => q.eq("userId", currentUser._id))
            .collect();

        return users.map((user) => {
            const conversation = myConversations.find((c) =>
                c.participants.includes(user._id)
            );
            const unread = conversation
                ? unreadCounts.find((u) => u.conversationId === conversation._id)
                : null;

            return {
                ...user,
                conversationId: conversation?._id,
                unreadCount: unread?.count || 0,
            };
        });
    },
});
export const getMe = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        return await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
    },
});
