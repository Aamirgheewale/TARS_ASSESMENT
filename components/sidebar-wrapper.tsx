"use client";

import { Sidebar } from "./sidebar";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { Doc } from "../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export function SidebarWrapper() {
    const createOrGetConversation = useMutation(api.conversations.createOrGetConversation);
    const router = useRouter();
    const params = useParams();

    const isConversationOpen = !!params.conversationId;

    console.log("SidebarWrapper - Conversation Open:", isConversationOpen, "ID:", params.conversationId);

    const handleSelectUser = async (user: Doc<"users">) => {
        console.log("SidebarWrapper - Selecting User:", user.name, user._id);
        try {
            const conversationId = await createOrGetConversation({
                otherUserId: user._id,
            });
            console.log("SidebarWrapper - Resolved Conversation ID:", conversationId);
            if (conversationId) {
                router.push(`/${conversationId}`);
            }
        } catch (error) {
            console.error("SidebarWrapper - Failed to create or get conversation:", error);
        }
    };

    const handleSelectConversation = (conversationId: string) => {
        router.push(`/${conversationId}`);
    };

    return (
        <div className={cn(
            "h-full w-full md:w-80 bg-background/70 backdrop-blur-xl border-r border-border/50 shadow-lg shrink-0 z-10",
            isConversationOpen ? "hidden md:block" : "block"
        )}>
            <Sidebar
                onSelectUser={handleSelectUser}
                onSelectConversation={handleSelectConversation}
                selectedConversationId={params.conversationId as string}
            />
        </div>
    );
}
