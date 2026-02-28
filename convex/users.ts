import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

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
        const currentUser = await requireUser(ctx);

        const users = await ctx.db
            .query("users")
            .filter((q) => q.neq(q.field("clerkId"), currentUser.clerkId))
            .collect();

        const unreadCounts = await ctx.db
            .query("unread")
            .withIndex("by_user_conversation", (q) => q.eq("userId", currentUser._id))
            .collect();

        // Fetch conversations the user is a part of
        const allConversations = await ctx.db
            .query("conversations")
            .collect();

        const myConversations = allConversations.filter(c =>
            !c.isGroup && c.participants.includes(currentUser._id)
        );

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
        const user = await requireUser(ctx);

        await ctx.db.patch(user._id, {
            online: args.online,
            lastSeen: Date.now(),
        });
    },
});

export const getAllUsers = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await requireUser(ctx);

        const users = await ctx.db
            .query("users")
            .filter((q) => q.neq(q.field("clerkId"), currentUser.clerkId))
            .collect();

        const unreadCounts = await ctx.db
            .query("unread")
            .withIndex("by_user_conversation", (q) => q.eq("userId", currentUser._id))
            .collect();

        const conversations = await ctx.db
            .query("conversations")
            .collect();

        const myConversations = conversations.filter((c) =>
            !c.isGroup && c.participants.includes(currentUser._id)
        );

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
        try {
            return await requireUser(ctx);
        } catch {
            return null;
        }
    },
});
