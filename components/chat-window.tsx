"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Send, Loader2, MoreVertical, Phone, Video, ChevronLeft } from "lucide-react";
import { Doc, Id } from "../convex/_generated/dataModel";
import { cn, formatTimestamp } from "@/lib/utils";
import Link from "next/link";

interface ChatWindowProps {
    conversationId: Id<"conversations">;
    otherUser: Doc<"users">;
}

export function ChatWindow({ conversationId, otherUser }: ChatWindowProps) {
    const messages = useQuery(api.messages.getMessages, { conversationId });
    const sendMessage = useMutation(api.messages.sendMessage);
    const setTyping = useMutation(api.typing.setTyping);
    const resetUnreadCount = useMutation(api.unread.resetUnreadCount);
    const typingUser = useQuery(api.typing.getTypingIndicator, { conversationId });

    const [content, setContent] = useState("");
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);

    console.log("ChatWindow Rendering - ID:", conversationId);
    console.log("ChatWindow Messages State:", messages ? `Count: ${messages.length}` : "Loading...");

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        resetUnreadCount({ conversationId });
    }, [conversationId, resetUnreadCount]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowNewMessagesButton(false);
    };

    // Auto-scroll logic when messages change
    useEffect(() => {
        if (isAtBottom) {
            scrollToBottom();
        } else if (messages && messages.length > 0) {
            // If we are not at bottom, show the button
            setShowNewMessagesButton(true);
        }
    }, [messages, typingUser, isAtBottom]); // typingUser also triggers scroll logic if active

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

        // If within 100px of bottom, consider "at bottom"
        const atBottom = distanceToBottom < 100;
        setIsAtBottom(atBottom);

        if (atBottom) {
            setShowNewMessagesButton(false);
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setContent(e.target.value);
        setTyping({ conversationId });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        try {
            const tempContent = content;
            setContent("");
            await sendMessage({
                conversationId,
                content: tempContent,
            });
            // Force scroll to bottom when I send a message
            scrollToBottom();
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* ... (Header remains same) */}
            <header className="flex items-center justify-between p-4 border-b bg-background">
                <div className="flex items-center gap-2 md:gap-3">
                    <Link href="/" className="md:hidden -ml-2 p-2 text-muted-foreground hover:bg-muted rounded-full">
                        <ChevronLeft className="h-6 w-6" />
                    </Link>
                    <Avatar className="h-10 w-10 border">
                        <AvatarImage src={otherUser.imageUrl} />
                        <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="text-sm font-semibold">{otherUser.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {otherUser.online ? (
                                <>
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                    Online
                                </>
                            ) : (
                                "Offline"
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
                <div
                    ref={scrollAreaRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 scroll-smooth"
                >
                    {!messages ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20">
                            <div className="bg-background rounded-full p-4 mb-4 shadow-sm border">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={otherUser.imageUrl} />
                                    <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <h4 className="font-semibold text-lg">Say hello to {otherUser.name}</h4>
                            <p className="text-sm text-muted-foreground max-w-[200px] mt-1">
                                Start your conversation by sending a message below.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message) => {
                                const isMe = message.senderId === otherUser._id ? false : true;

                                return (
                                    <div
                                        key={message._id}
                                        className={cn(
                                            "flex w-full",
                                            isMe ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm",
                                                isMe
                                                    ? "bg-blue-600 text-white rounded-br-none"
                                                    : "bg-background border rounded-bl-none"
                                            )}
                                        >
                                            <p>{message.content}</p>
                                            <p
                                                className={cn(
                                                    "text-[10px] mt-1 opacity-70",
                                                    isMe ? "text-right" : "text-left"
                                                )}
                                            >
                                                {formatTimestamp(message.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            {typingUser && (
                                <div className="flex justify-start">
                                    <div className="bg-muted px-4 py-2 rounded-2xl text-xs text-muted-foreground italic flex items-center gap-2">
                                        <span className="flex gap-0.5">
                                            <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce" />
                                            <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </span>
                                        {typingUser} is typing...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* New Messages Button */}
                {showNewMessagesButton && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                        <Button
                            onClick={scrollToBottom}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg gap-2 animate-in fade-in slide-in-from-bottom-2"
                        >
                            <span className="flex h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            New messages
                            <span className="text-xs">↓</span>
                        </Button>
                    </div>
                )}
            </div>

            {/* Chat Input */}
            <footer className="p-4 bg-background border-t">
                <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
                    <Input
                        value={content}
                        onChange={handleContentChange}
                        placeholder="Type a message..."
                        className="flex-1 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                    <Button type="submit" size="icon" disabled={!content.trim()} className="bg-blue-600 hover:bg-blue-700 shrink-0 shadow-sm">
                        <Send className="h-4 w-4 text-white" />
                    </Button>
                </form>
            </footer>
        </div>
    );
}
