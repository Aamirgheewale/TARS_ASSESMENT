"use client";

import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn } = useUser();

    if (!isLoaded) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="flex h-screen items-center justify-center text-muted-foreground flex-col gap-4">
                <p className="text-lg font-medium">Please sign in to continue</p>
            </div>
        );
    }

    return <>{children}</>;
}
