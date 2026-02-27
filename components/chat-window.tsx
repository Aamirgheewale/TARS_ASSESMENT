"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Send, Loader2, MoreVertical, Phone, Video, ChevronLeft, Trash2, Smile, Users } from "lucide-react";
import { Id } from "../convex/_generated/dataModel";
import { cn, formatTimestamp } from "@/lib/utils";
import Link from "next/link";

const SUPPORTED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

function ReactionPicker({
    onSelect,
    disabled,
}: {
    onSelect: (emoji: string) => void;
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);

    if (disabled) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
                title="Add reaction"
            >
                <Smile className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 p-1 bg-background border rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-bottom-1">
                    {SUPPORTED_EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => {
                                onSelect(emoji);
                                setIsOpen(false);
                            }}
                            className="p-1.5 hover:bg-muted rounded-full transition-colors text-lg leading-none"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function MessageReactions({
    messageId,
    currentUserId,
    onToggle,
}: {
    messageId: Id<"messages">;
    currentUserId: string | undefined;
    onToggle: (emoji: string) => void;
}) {
    const reactions = useQuery(api.reactions.getReactionsByMessage, { messageId });

    if (!reactions || reactions.length === 0) return null;

    // Group reactions by emoji
    const grouped = reactions.reduce((acc: Record<string, number>, curr: { emoji: string }) => {
        acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Check which emojis the current user has reacted with
    const myReactions = reactions
        .filter((r: { userId: string }) => r.userId === currentUserId)
        .map((r: { emoji: string }) => r.emoji);

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(grouped).map(([emoji, count]: [string, number]) => (
                <button
                    key={emoji}
                    onClick={() => onToggle(emoji)}
                    className={cn(
                        "flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-xs border transition-all",
                        myReactions.includes(emoji)
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-muted/50 hover:bg-muted border-transparent text-muted-foreground"
                    )}
                >
                    <span>{emoji}</span>
                    <span className="font-semibold">{count}</span>
                </button>
            ))}
        </div>
    );
}

export function ChatWindow({ conversationId }: { conversationId: Id<"conversations"> }) {
    const me = useQuery(api.users.getMe);
    const conversation = useQuery(api.conversations.getConversationById, conversationId ? { conversationId } : "skip");
    const messages = useQuery(api.messages.getMessages, conversationId ? { conversationId } : "skip");
    const sendMessage = useMutation(api.messages.sendMessage);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const toggleReaction = useMutation(api.reactions.toggleReaction);
    const setTyping = useMutation(api.typing.setTyping);
    const resetUnreadCount = useMutation(api.unread.resetUnreadCount);
    const typingIndicator = useQuery(api.typing.getTypingIndicator, conversationId ? { conversationId } : "skip");

    const [content, setContent] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationId) {
            resetUnreadCount({ conversationId }).catch(err => {
                console.error("Failed to reset unread count:", err);
            });
        }
    }, [conversationId, resetUnreadCount]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowNewMessagesButton(false);
    };

    useEffect(() => {
        if (isAtBottom) {
            scrollToBottom();
        } else if (messages && messages.length > 0) {
            setShowNewMessagesButton(true);
        }
    }, [messages, typingIndicator, isAtBottom]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
        const atBottom = distanceToBottom < 100;
        setIsAtBottom(atBottom);
        if (atBottom) {
            setShowNewMessagesButton(false);
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setContent(e.target.value);
        if (conversationId) {
            setTyping({ conversationId });
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!content.trim() || isSending) return;

        setIsSending(true);
        setSendError(null);
        const tempContent = content;

        try {
            setContent("");
            await sendMessage({
                conversationId,
                content: tempContent,
            });
            scrollToBottom();
        } catch (error) {
            console.error("Failed to send message:", error);
            setSendError("Failed to send message.");
            setContent(tempContent);
        } finally {
            setIsSending(false);
        }
    };

    const handleMessageDelete = async (messageId: Id<"messages">) => {
        try {
            await deleteMessage({ messageId });
        } catch (error) {
            console.error("Failed to delete message:", error);
        }
    };

    const handleToggleReaction = async (messageId: Id<"messages">, emoji: string) => {
        try {
            await toggleReaction({ messageId, emoji });
        } catch (error) {
            console.error("Failed to toggle reaction:", error);
        }
    };

    if (conversation === undefined) return (
        <div className="flex-1 flex flex-col bg-muted/30 h-full">
            <div className="p-4 border-b bg-background h-[73px]" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className={cn("flex w-full animate-pulse", i % 2 === 0 ? "justify-end" : "justify-start")}>
                        <div className="h-12 w-32 bg-muted rounded-2xl" />
                    </div>
                ))}
            </div>
        </div>
    );

    if (!conversation) return null;

    // Type helpers
    const isGroup = conversation.isGroup;
    const otherUser = !isGroup && 'otherUser' in conversation ? conversation.otherUser : null;
    const participantsInfo = isGroup && 'participantsInfo' in conversation ? conversation.participantsInfo : [];

    const chatName = isGroup ? conversation.name : otherUser?.name;
    const isOnline = !isGroup && otherUser?.online;

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <header className="flex items-center justify-between p-4 border-b bg-background">
                <div className="flex items-center gap-2 md:gap-3">
                    <Link href="/" className="md:hidden -ml-2 p-2 text-muted-foreground hover:bg-muted rounded-full">
                        <ChevronLeft className="h-6 w-6" />
                    </Link>
                    <Avatar className="h-10 w-10 border">
                        {isGroup ? (
                            <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-600">
                                <Users className="h-5 w-5" />
                            </div>
                        ) : (
                            <>
                                <AvatarImage src={otherUser?.imageUrl} />
                                <AvatarFallback>{otherUser?.name?.charAt(0)}</AvatarFallback>
                            </>
                        )}
                    </Avatar>
                    <div>
                        <h3 className="text-sm font-semibold truncate max-w-[150px] md:max-w-none">{chatName}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {isGroup ? (
                                `${conversation.participants.length} members`
                            ) : isOnline ? (
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
                    <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:flex">
                        <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:flex">
                        <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            <div className="flex-1 relative overflow-hidden flex flex-col">
                <div
                    ref={scrollAreaRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 scroll-smooth"
                >
                    {messages === undefined ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className={cn("flex w-full animate-pulse", i % 2 === 0 ? "justify-end" : "justify-start")}>
                                    <div className={cn("max-w-[70%] h-12 w-32 rounded-2xl bg-muted", i % 2 === 0 ? "rounded-br-none" : "rounded-bl-none")} />
                                </div>
                            ))}
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20">
                            <div className="bg-background rounded-full p-4 mb-4 shadow-sm border">
                                <Avatar className="h-16 w-16">
                                    {isGroup ? (
                                        <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-600">
                                            <Users className="h-8 w-8" />
                                        </div>
                                    ) : (
                                        <>
                                            <AvatarImage src={otherUser?.imageUrl} />
                                            <AvatarFallback>{otherUser?.name?.charAt(0)}</AvatarFallback>
                                        </>
                                    )}
                                </Avatar>
                            </div>
                            <h4 className="font-semibold text-lg">
                                {isGroup ? `Welcome to ${conversation.name}` : `Say hello to ${otherUser?.name}`}
                            </h4>
                            <p className="text-sm text-muted-foreground max-w-[200px] mt-1">
                                Start your conversation by sending a message below.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message) => {
                                const isMe = message.senderId === me?._id;

                                // Find sender name for groups
                                const sender = isGroup
                                    ? participantsInfo.find((p) => p?._id === message.senderId)
                                    : otherUser;

                                return (
                                    <div
                                        key={message._id}
                                        className={cn(
                                            "flex w-full group",
                                            isMe ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {!isMe && conversation.isGroup && (
                                            <Avatar className="h-6 w-6 mr-2 mt-auto">
                                                <AvatarImage src={sender?.imageUrl} />
                                                <AvatarFallback className="text-[10px]">{sender?.name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div
                                            className={cn(
                                                "max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm relative",
                                                isMe
                                                    ? "bg-blue-600 text-white rounded-br-none"
                                                    : "bg-background border rounded-bl-none"
                                            )}
                                        >
                                            {!isMe && conversation.isGroup && (
                                                <p className="text-[10px] font-bold mb-1 text-blue-600">{sender?.name}</p>
                                            )}
                                            {message.deleted ? (
                                                <p className="italic opacity-70">This message was deleted</p>
                                            ) : (
                                                <>
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="break-words">{message.content}</p>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {isMe && (
                                                                <button
                                                                    onClick={() => handleMessageDelete(message._id)}
                                                                    className="p-1 text-muted-foreground hover:text-red-500 rounded-full hover:bg-muted"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                            <ReactionPicker
                                                                onSelect={(emoji) => handleToggleReaction(message._id, emoji)}
                                                                disabled={message.deleted}
                                                            />
                                                        </div>
                                                    </div>
                                                    <MessageReactions
                                                        messageId={message._id}
                                                        currentUserId={me?.clerkId}
                                                        onToggle={(emoji) => handleToggleReaction(message._id, emoji)}
                                                    />
                                                </>
                                            )}
                                            <p className={cn("text-[10px] mt-1 opacity-70", isMe ? "text-right" : "text-left")}>
                                                {formatTimestamp(message.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            {typingIndicator && (
                                <div className="flex justify-start">
                                    <div className="bg-muted px-4 py-1.5 rounded-2xl text-[11px] text-muted-foreground italic flex items-center gap-2 max-w-[80%]">
                                        <div className="flex gap-0.5 shrink-0">
                                            <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce [animation-duration:1s]" />
                                            <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]" />
                                            <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]" />
                                        </div>
                                        <span className="truncate">{typingIndicator} is typing...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

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

            <footer className="p-4 bg-background border-t space-y-2">
                {sendError && (
                    <div className="flex items-center gap-2 text-xs text-red-500 max-w-4xl mx-auto px-1">
                        <span>{sendError}</span>
                        <button onClick={() => handleSend()} className="underline hover:text-red-600 font-medium">Retry</button>
                    </div>
                )}
                <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
                    <Input
                        value={content}
                        onChange={handleContentChange}
                        placeholder="Type a message..."
                        disabled={isSending}
                        className="flex-1 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50 text-sm"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!content.trim() || isSending}
                        className="bg-blue-600 hover:bg-blue-700 shrink-0 shadow-sm relative h-9 w-9"
                    >
                        {isSending ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Send className="h-4 w-4 text-white" />}
                    </Button>
                </form>
            </footer>
        </div>
    );
}
