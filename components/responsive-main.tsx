"use client";

import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function ResponsiveMain({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const isConversationOpen = !!params.conversationId;

    return (
        <main className={cn(
            "flex-1 overflow-y-auto",
            isConversationOpen ? "flex" : "hidden md:flex"
        )}>
            {children}
        </main>
    );
}
