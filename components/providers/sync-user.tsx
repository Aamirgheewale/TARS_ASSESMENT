"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export function SyncUser() {
    const { user } = useUser();
    const syncUser = useMutation(api.users.syncUser);
    const updateStatus = useMutation(api.users.updateStatus);

    useEffect(() => {
        if (!user) return;

        const sync = async () => {
            try {
                await syncUser({
                    clerkId: user.id,
                    name: user.fullName || user.firstName || "Anonymous",
                    email: user.emailAddresses[0]?.emailAddress || "",
                    imageUrl: user.imageUrl,
                });
            } catch (error) {
                console.error("Failed to sync user to Convex:", error);
            }
        };

        sync();

        // Presence Logic: Set Online
        try {
            updateStatus({ online: true });
        } catch (error) {
            console.error("Failed to set online status:", error);
        }

        // Presence Logic: Set Offline on Unmount/Tab Close
        const handleUnload = () => {
            try {
                updateStatus({ online: false });
            } catch {
                // Ignore errors on unload
            }
        };

        window.addEventListener("beforeunload", handleUnload);

        return () => {
            try {
                updateStatus({ online: false });
            } catch {
                // Ignore errors on unmount
            }
            window.removeEventListener("beforeunload", handleUnload);
        };
    }, [user, syncUser, updateStatus]);

    return null;
}
