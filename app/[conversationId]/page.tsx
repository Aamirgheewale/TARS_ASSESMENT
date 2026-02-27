"use client";

import { useUser } from "@clerk/nextjs";
import { ChatWindow } from "@/components/chat-window";
import { Id } from "../../convex/_generated/dataModel";

export default function ConversationPage({
    params,
}: {
    params: { conversationId: Id<"conversations"> };
}) {
    const { isLoaded, isSignedIn } = useUser();

    console.log("[ConversationPage] Route param conversationId:", params.conversationId);

    if (!isLoaded) return null;

    if (!isSignedIn) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                Please sign in
            </div>
        );
    }

    return (
        <div className="h-full">
            <ChatWindow conversationId={params.conversationId} />
        </div>
    );
}
