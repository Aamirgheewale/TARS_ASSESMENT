"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";

import { Doc } from "../convex/_generated/dataModel";

interface SidebarProps {
    onSelectUser: (user: Doc<"users">) => void;
    selectedUserId?: string;
}

export function Sidebar({ onSelectUser, selectedUserId }: SidebarProps) {
    const { isLoaded, isSignedIn, user } = useUser();
    const users = useQuery(api.users.getAllUsers,
        isLoaded && isSignedIn ? { clerkId: user!.id } : "skip"
    );

    const [searchQuery, setSearchQuery] = useState("");

    console.log("Sidebar Auth - Loaded:", isLoaded, "Signed In:", isSignedIn, "User ID:", user?.id);
    console.log("Sidebar Users from Convex:", users);

    const filteredUsers = users?.filter((u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <aside className="h-full flex flex-col w-full bg-background">
            <div className="p-4 border-b space-y-4">
                <h2 className="text-xl font-bold tracking-tight">Chats</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2">
                    {!users ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredUsers && filteredUsers.length > 0 ? (
                        <div className="space-y-1">
                            {filteredUsers.map((user) => (
                                <button
                                    key={user.clerkId}
                                    onClick={() => onSelectUser(user)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group",
                                        selectedUserId === user.clerkId
                                            ? "bg-blue-50"
                                            : "hover:bg-muted/80"
                                    )}
                                >
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border group-hover:border-blue-500 transition-colors">
                                            <AvatarImage src={user.imageUrl} />
                                            <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                                                {user.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {user.online && (
                                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate text-foreground group-hover:text-blue-600 transition-colors">
                                            {user.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {user.online ? "Online" : "Offline"}
                                        </p>
                                    </div>
                                    {user.unreadCount > 0 && (
                                        <div className="flex items-center justify-center bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full shadow-sm">
                                            {user.unreadCount}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                            <div className="bg-muted rounded-full p-3 mb-3">
                                <Search className="h-6 w-6 text-muted-foreground opacity-50" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No users found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Try searching for someone else
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
}
