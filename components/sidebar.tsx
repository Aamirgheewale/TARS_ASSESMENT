"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Search, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";

import { Doc } from "../convex/_generated/dataModel";

import { CreateGroupModal } from "./create-group-modal";
import { Button } from "./ui/button";

interface SidebarProps {
    onSelectUser: (user: Doc<"users">) => void;
    onSelectConversation: (id: string) => void;
    selectedConversationId?: string;
}

export function Sidebar({ onSelectUser, onSelectConversation, selectedConversationId }: SidebarProps) {
    const { isLoaded, isSignedIn, user } = useUser();
    const users = useQuery(api.users.getAllUsers,
        isLoaded && isSignedIn ? { clerkId: user!.id } : "skip"
    );
    const conversations = useQuery(api.conversations.getConversations);

    const [searchQuery, setSearchQuery] = useState("");
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    const filteredUsers = users?.filter((u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredConversations = conversations?.filter((conv) => {
        const name = conv.isGroup ? conv.name : conv.otherUser?.name;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <aside className="h-full flex flex-col w-full bg-background">
            <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">Chats</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsGroupModalOpen(true)}
                        className="rounded-full hover:bg-blue-50 hover:text-blue-600"
                        title="New Group"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-4">
                    {/* Conversations Section */}
                    {conversations && conversations.length > 0 && (
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Recent Chats</p>
                            {filteredConversations?.map((conv) => (
                                <button
                                    key={conv._id}
                                    onClick={() => onSelectConversation(conv._id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group",
                                        selectedConversationId === conv._id
                                            ? "bg-blue-50"
                                            : "hover:bg-muted/80"
                                    )}
                                >
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border group-hover:border-blue-500 transition-colors">
                                            {conv.isGroup ? (
                                                <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-600">
                                                    <Users className="h-5 w-5" />
                                                </div>
                                            ) : (
                                                <>
                                                    <AvatarImage src={conv.otherUser?.imageUrl} />
                                                    <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                                                        {conv.otherUser?.name?.charAt(0)}
                                                    </AvatarFallback>
                                                </>
                                            )}
                                        </Avatar>
                                        {!conv.isGroup && conv.otherUser?.online && (
                                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate text-foreground group-hover:text-blue-600 transition-colors">
                                            {conv.isGroup ? conv.name : conv.otherUser?.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {conv.isGroup ? `${conv.participants.length} members` : (conv.otherUser?.online ? "Online" : "Offline")}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Users Section (Only if no active conversation or searching) */}
                    {(!searchQuery || (filteredUsers && filteredUsers.length > 0)) && (
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Contacts</p>
                            {users === undefined ? (
                                <div className="space-y-1">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                                            <div className="h-10 w-10 rounded-full bg-muted shadow-sm" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-24 bg-muted rounded shadow-sm" />
                                                <div className="h-3 w-16 bg-muted rounded shadow-sm" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredUsers && filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <button
                                        key={user.clerkId}
                                        onClick={() => onSelectUser(user)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left hover:bg-muted/80 group"
                                    >
                                        <Avatar className="h-10 w-10 border group-hover:border-blue-500 transition-colors">
                                            <AvatarImage src={user.imageUrl} />
                                            <AvatarFallback className="bg-blue-50 text-blue-600">
                                                {user.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate group-hover:text-blue-600 transition-colors">
                                                {user.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Start conversation</p>
                                        </div>
                                    </button>
                                ))
                            ) : null}
                        </div>
                    )}

                    {users !== undefined && (!filteredUsers || filteredUsers.length === 0) && (!filteredConversations || filteredConversations.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                            <div className="bg-muted rounded-full p-3 mb-3">
                                <Search className="h-6 w-6 text-muted-foreground opacity-50" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No matches found</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <CreateGroupModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
            />
        </aside>
    );
}
