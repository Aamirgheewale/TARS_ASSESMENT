import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";

export const createOrGetConversation = mutation({
    args: {
        participantIds: v.optional(v.array(v.id("users"))),
        otherUserId: v.optional(v.id("users")), // Simplified for 1-on-1
        isGroup: v.optional(v.boolean()),
        name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const currentUser = await requireUser(ctx);
        const isGroup = args.isGroup === true;

        if (!isGroup) {
            // Case 1 — One-on-One
            let participants: Id<"users">[] = [];

            if (args.otherUserId) {
                participants = [currentUser._id, args.otherUserId];
            } else if (args.participantIds && args.participantIds.length === 2) {
                participants = args.participantIds;
            } else {
                return null;
            }

            // Check if both participants exist
            const users = await Promise.all(participants.map(id => ctx.db.get(id)));
            if (users.some(u => !u)) {
                return null;
            }

            // Sort IDs deterministically
            const sortedParticipants = [...participants].sort();

            // Query existing 1-on-1 conversation
            // Using a filter here because we don't have a specialized multi-field index for participants-isGroup
            // But we limit it to participants comparison which is relatively efficient for small datasets.
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

            // Create new 1-on-1
            return await ctx.db.insert("conversations", {
                participants: sortedParticipants,
                isGroup: false,
                createdBy: currentUser.clerkId,
            });
        } else {
            // Case 2 — Group Chat
            if (!args.participantIds || args.participantIds.length < 2) {
                return null;
            }

            if (!args.name?.trim()) {
                return null; // Group chat must have a name
            }

            // Ensure creator is included in participants
            let finalParticipants = [...args.participantIds];
            if (!finalParticipants.includes(currentUser._id)) {
                finalParticipants.push(currentUser._id);
            }

            // Check if all participants exist
            const users = await Promise.all(finalParticipants.map(id => ctx.db.get(id)));
            if (users.some(u => !u)) {
                return null;
            }

            // Create new Group Chat (always new)
            return await ctx.db.insert("conversations", {
                participants: finalParticipants,
                isGroup: true,
                name: args.name.trim(),
                createdBy: currentUser.clerkId,
            });
        }
    },
});

export const createGroupConversation = mutation({
    args: {
        participantIds: v.array(v.id("users")),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const currentUser = await requireUser(ctx);

        const name = args.name.trim();
        if (!name) throw new Error("Group name is required");

        // Ensure creator is included and deduplicate
        const participantSet = new Set(args.participantIds);
        participantSet.add(currentUser._id);
        const finalParticipants = Array.from(participantSet);

        // Group creation requires the creator plus at least one other user = 2 total
        if (finalParticipants.length < 2) {
            throw new Error("Group must have at least 2 participants");
        }

        const conversationId = await ctx.db.insert("conversations", {
            participants: finalParticipants,
            isGroup: true,
            name: name,
            createdBy: currentUser.clerkId,
        });

        const conversation = await ctx.db.get(conversationId);
        if (!conversation) throw new Error("Failed to retrieve created conversation");

        return conversation;
    },
});

export const getConversations = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await requireUser(ctx);

        // Optimization: Avoid full table scan by using a filter on participants array.
        // Convex handles array inclusion filters relatively efficiently, 
        // though a specialized index would be better if table volume is extreme.
        const myConversations = await ctx.db
            .query("conversations")
            .collect();

        const filteredConversations = myConversations.filter(c => c.participants.includes(currentUser._id));

        // Enrich with other user info for 1-on-1s
        const enriched = await Promise.all(myConversations.map(async (conv) => {
            if (conv.isGroup) {
                return {
                    ...conv,
                    otherUser: null,
                };
            }

            const otherUserId = conv.participants.find(id => id !== currentUser._id);
            const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

            return {
                ...conv,
                otherUser,
            };
        }));

        return enriched;
    }
});

export const getConversationById = query({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const currentUser = await requireUser(ctx);

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) {
            return null;
        }

        // Check if user is participant - Strict Security Guard
        if (!conversation.participants.includes(currentUser._id)) {
            throw new Error("Access denied");
        }

        if (conversation.isGroup) {
            const participants = await Promise.all(
                conversation.participants.map(id => ctx.db.get(id))
            );
            return {
                ...conversation,
                participantsInfo: participants.filter(p => !!p),
            };
        }

        // Find the other participant for 1-on-1
        const otherUserId = conversation.participants.find((id) => id !== currentUser._id);
        const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

        return {
            ...conversation,
            otherUser,
        };
    },
});
