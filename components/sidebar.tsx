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
import { motion, AnimatePresence } from "framer-motion";

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
        <aside className="h-full flex flex-col w-full bg-transparent">
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
                            <AnimatePresence>
                                {filteredConversations?.map((conv) => (
                                    <motion.button
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        key={conv._id}
                                        onClick={() => onSelectConversation(conv._id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group border border-transparent shadow-sm",
                                            selectedConversationId === conv._id
                                                ? "bg-blue-600/10 border-blue-200 shadow-inner"
                                                : "hover:bg-background/80 hover:border-border/50 hover:shadow-md"
                                        )}
                                    >
                                        <div className="relative">
                                            <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-blue-500 transition-all duration-300">
                                                {conv.isGroup ? (
                                                    <div className="h-full w-full flex items-center justify-center bg-blue-100/80 text-blue-600">
                                                        <Users className="h-5 w-5" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <AvatarImage src={conv.otherUser?.imageUrl} />
                                                        <AvatarFallback className="bg-blue-100/80 text-blue-700 font-medium">
                                                            {conv.otherUser?.name?.charAt(0)}
                                                        </AvatarFallback>
                                                    </>
                                                )}
                                            </Avatar>
                                            {!conv.isGroup && conv.otherUser?.online && (
                                                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-semibold truncate transition-colors",
                                                selectedConversationId === conv._id ? "text-blue-700" : "text-foreground group-hover:text-blue-600"
                                            )}>
                                                {conv.isGroup ? conv.name : conv.otherUser?.name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate opacity-70">
                                                {conv.isGroup ? `${conv.participants.length} members` : (conv.otherUser?.online ? "Online" : "Offline")}
                                            </p>
                                        </div>
                                    </motion.button>
                                ))}
                            </AnimatePresence>
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
                                            <div className="h-10 w-10 rounded-full bg-muted/50 shadow-sm" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-24 bg-muted/50 rounded shadow-sm" />
                                                <div className="h-3 w-16 bg-muted/50 rounded shadow-sm" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredUsers && filteredUsers.length > 0 ? (
                                <AnimatePresence>
                                    {filteredUsers.map((user) => (
                                        <motion.button
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            key={user.clerkId}
                                            onClick={() => onSelectUser(user)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:bg-background/80 hover:border-border/50 hover:shadow-md border border-transparent group"
                                        >
                                            <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-blue-500 transition-all duration-300">
                                                <AvatarImage src={user.imageUrl} />
                                                <AvatarFallback className="bg-blue-50/80 text-blue-600">
                                                    {user.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate group-hover:text-blue-600 transition-colors">
                                                    {user.name}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground opacity-70">Start conversation</p>
                                            </div>
                                        </motion.button>
                                    ))}
                                </AnimatePresence>
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
