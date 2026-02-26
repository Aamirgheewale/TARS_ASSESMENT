"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { ChatWindow } from "@/components/chat-window";

export default function ConversationPage({
    params,
}: {
    params: { conversationId: Id<"conversations"> };
}) {
    const { isLoaded, isSignedIn } = useUser();

    const conversation = useQuery(
        api.conversations.getConversationById,
        isLoaded && isSignedIn
            ? { conversationId: params.conversationId }
            : "skip"
    );

    console.log("ConversationPage - Auth Loaded:", isLoaded, "Signed In:", isSignedIn);
    console.log("ConversationPage - Data:", !!conversation);

    if (!isLoaded) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Please sign in
            </div>
        );
    }

    if (conversation === undefined) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Conversation not found
            </div>
        );
    }

    return (
        <div className="h-full">
            <ChatWindow
                conversationId={params.conversationId}
                otherUser={conversation.otherUser}
            />
        </div>
    );
}
