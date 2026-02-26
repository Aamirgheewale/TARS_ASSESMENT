import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerkId: v.string(),
        name: v.string(),
        email: v.string(),
        imageUrl: v.string(),
        online: v.boolean(),
        lastSeen: v.number(),
    }).index("by_clerkId", ["clerkId"]),

    conversations: defineTable({
        participants: v.array(v.id("users")),
        isGroup: v.boolean(),
        name: v.optional(v.string()),
        lastMessageId: v.optional(v.id("messages")),
    }),

    messages: defineTable({
        conversationId: v.id("conversations"),
        senderId: v.id("users"),
        content: v.string(),
        deleted: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_conversationId", ["conversationId"])
        .index("by_createdAt", ["createdAt"]),

    unread: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        count: v.number(),
    }).index("by_user_conversation", ["userId", "conversationId"]),

    typing: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        expiresAt: v.number(),
    })
        .index("by_conversationId", ["conversationId"])
        .index("by_expiresAt", ["expiresAt"])
        .index("by_conversationId_userId", ["conversationId", "userId"]),
});
