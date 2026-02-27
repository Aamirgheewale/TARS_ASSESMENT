"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Check, Users, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

import { Id } from "../convex/_generated/dataModel";

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
    const { user: currentUser, isLoaded } = useUser();
    const router = useRouter();
    const users = useQuery(api.users.getAllUsers,
        isLoaded && currentUser ? { clerkId: currentUser.id } : "skip"
    );
    const createGroup = useMutation(api.conversations.createGroupConversation);

    const [groupName, setGroupName] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const toggleUser = (userId: string) => {
        setSelectedIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selectedIds.length < 1 || !currentUser) return;

        setIsCreating(true);
        try {
            // Backend current user ID is needed, but we pass clerkId in some contexts.
            // Actually, the backend createOrGetConversation expects Id<"users">.
            // I need to make sure I have the Convex DB ID of the current user.
            // Let's check users.ts for getMe query.

            const result = await createGroup({
                participantIds: selectedIds as Id<"users">[],
                name: groupName.trim(),
            });

            console.log("CreateGroupModal - Resolved Group:", result);

            if (result && result._id) {
                onClose();
                router.push(`/${result._id}`);
            }
        } catch (error) {
            console.error("Failed to create group:", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background w-full max-w-md rounded-xl shadow-2xl border flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold">New Group</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Group Name</label>
                        <Input
                            placeholder="Enter group name..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-blue-500"
                        />
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden min-h-[200px]">
                        <label className="text-sm font-medium text-muted-foreground mb-2">Select Members ({selectedIds.length})</label>
                        <ScrollArea className="flex-1 border rounded-lg bg-muted/30">
                            <div className="p-2 space-y-1">
                                {users === undefined ? (
                                    <div className="p-4 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </div>
                                ) : users?.length === 0 ? (
                                    <p className="p-4 text-center text-sm text-muted-foreground">No users available</p>
                                ) : (
                                    users?.map((user) => (
                                        <button
                                            key={user._id}
                                            onClick={() => toggleUser(user._id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                                                selectedIds.includes(user._id)
                                                    ? "bg-blue-50 border-blue-200"
                                                    : "hover:bg-background border border-transparent"
                                            )}
                                        >
                                            <div className="relative">
                                                <Avatar className="h-8 w-8 border">
                                                    <AvatarImage src={user.imageUrl} />
                                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {selectedIds.includes(user._id) && (
                                                    <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-0.5 border border-white">
                                                        <Check className="h-2 w-2 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-sm font-medium flex-1 truncate">{user.name}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <div className="p-4 border-t bg-muted/10 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!groupName.trim() || selectedIds.length < 1 || isCreating}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create Group
                    </Button>
                </div>
            </div>
        </div>
    );
}
