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
import { motion, AnimatePresence } from "framer-motion";

const SUPPORTED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

function ReactionPicker({
    onSelect,
    disabled,
    isMe,
}: {
    onSelect: (emoji: string) => void;
    disabled?: boolean;
    isMe: boolean;
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

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className={cn(
                            "absolute bottom-full mb-2 flex flex-wrap gap-2 p-2 bg-background border rounded-xl shadow-xl z-50 max-w-[220px] overflow-visible",
                            isMe ? "right-0" : "left-0"
                        )}
                    >
                        {SUPPORTED_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    onSelect(emoji);
                                    setIsOpen(false);
                                }}
                                className="p-1.5 hover:bg-muted rounded-full transition-colors text-lg leading-none shrink-0"
                            >
                                {emoji}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
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
        <div className="flex-1 flex flex-col bg-transparent h-full">
            <div className="p-4 border-b bg-background/50 backdrop-blur-md h-[73px]" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {[1, 2, 3].map(i => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className={cn("flex w-full animate-pulse", i % 2 === 0 ? "justify-end" : "justify-start")}
                    >
                        <div className="h-12 w-32 bg-muted/50 rounded-2xl" />
                    </motion.div>
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
        <div className="flex flex-col h-full bg-transparent relative z-0">
            <header className="flex items-center justify-between p-4 border-b bg-background/60 backdrop-blur-xl sticky top-0 z-10">
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

            <div className="flex-1 relative overflow-x-visible overflow-y-hidden flex flex-col min-h-0">
                <div
                    ref={scrollAreaRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto overflow-x-visible p-4 scroll-smooth"
                >
                    {messages === undefined ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    key={i}
                                    className={cn("flex w-full animate-pulse", i % 2 === 0 ? "justify-end" : "justify-start")}
                                >
                                    <div className={cn("max-w-[70%] h-12 w-32 rounded-2xl bg-muted/50", i % 2 === 0 ? "rounded-br-none" : "rounded-bl-none")} />
                                </motion.div>
                            ))}
                        </div>
                    ) : messages.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-full text-center py-20"
                        >
                            <div className="bg-background/80 backdrop-blur-sm rounded-full p-4 mb-4 shadow-lg border">
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
                            <h4 className="font-bold text-xl tracking-tight">
                                {isGroup ? `Welcome to ${conversation.name}` : `Say hello to ${otherUser?.name}`}
                            </h4>
                            <p className="text-sm text-muted-foreground/80 max-w-[200px] mt-1">
                                Start your conversation by sending a message below.
                            </p>
                        </motion.div>
                    ) : (
                        <div className="space-y-1">
                            {messages.map((message, index) => {
                                const isMe = message.senderId === me?._id;
                                const prevMessage = messages[index - 1];
                                const isGrouped = prevMessage && prevMessage.senderId === message.senderId;

                                // Find sender name for groups
                                const sender = isGroup
                                    ? participantsInfo.find((p) => p?._id === message.senderId)
                                    : otherUser;

                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ duration: 0.2 }}
                                        key={message._id}
                                        className={cn(
                                            "flex w-full group relative mb-4 flex-col",
                                            isMe ? "items-end" : "items-start",
                                            isGrouped ? "-mt-3" : "mt-2"
                                        )}
                                    >
                                        <div className={cn(
                                            "flex w-full max-w-[85%]",
                                            isMe ? "flex-row-reverse" : "flex-row"
                                        )}>
                                            {!isMe && conversation.isGroup && !isGrouped && (
                                                <Avatar className="h-6 w-6 mx-2 mt-auto shadow-sm shrink-0">
                                                    <AvatarImage src={sender?.imageUrl} />
                                                    <AvatarFallback className="text-[10px] bg-muted">{sender?.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            {!isMe && conversation.isGroup && isGrouped && (
                                                <div className="w-10 shrink-0" />
                                            )}

                                            <div className="relative group/bubble flex items-center">
                                                <div
                                                    className={cn(
                                                        "px-4 py-2.5 rounded-2xl text-[13px] relative transition-all duration-200 overflow-visible",
                                                        isMe
                                                            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md hover:shadow-lg rounded-br-none"
                                                            : "bg-background/80 backdrop-blur-sm border border-border/50 text-foreground shadow-sm hover:shadow-md rounded-bl-none",
                                                        isGrouped && (isMe ? "rounded-tr-none" : "rounded-tl-none")
                                                    )}
                                                >
                                                    {!isMe && conversation.isGroup && !isGrouped && (
                                                        <p className="text-[10px] font-bold mb-1 text-blue-600">{sender?.name}</p>
                                                    )}
                                                    {message.deleted ? (
                                                        <p className="italic opacity-60 flex items-center gap-1">
                                                            <Trash2 className="h-3 w-3" />
                                                            This message was deleted
                                                        </p>
                                                    ) : (
                                                        <>
                                                            <p className="break-words leading-relaxed">{message.content}</p>
                                                            <MessageReactions
                                                                messageId={message._id}
                                                                currentUserId={me?.clerkId}
                                                                onToggle={(emoji) => handleToggleReaction(message._id, emoji)}
                                                            />
                                                        </>
                                                    )}
                                                    <p className={cn("text-[9px] mt-1 opacity-60", isMe ? "text-right" : "text-left")}>
                                                        {formatTimestamp(message.createdAt)}
                                                    </p>
                                                </div>

                                                {/* Action buttons as sibling to bubble */}
                                                {!message.deleted && (
                                                    <div
                                                        className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 flex flex-col gap-1 z-50",
                                                            isMe ? "right-full mr-2" : "left-full ml-2"
                                                        )}
                                                    >
                                                        <ReactionPicker
                                                            onSelect={(emoji) => handleToggleReaction(message._id, emoji)}
                                                            disabled={message.deleted}
                                                            isMe={isMe}
                                                        />
                                                        {isMe && (
                                                            <button
                                                                onClick={() => handleMessageDelete(message._id)}
                                                                className="p-1.5 text-muted-foreground hover:text-red-500 rounded-full hover:bg-background shadow-sm transition-all"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {typingIndicator && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex justify-start mt-2"
                                >
                                    <div className="bg-background/80 backdrop-blur-sm border border-border/50 px-4 py-2 rounded-2xl text-[11px] text-muted-foreground shadow-sm flex items-center gap-2 max-w-[80%]">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map((i) => (
                                                <motion.span
                                                    key={i}
                                                    animate={{ scale: [1, 1.3, 1] }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 1.2,
                                                        delay: i * 0.2,
                                                        ease: "easeInOut"
                                                    }}
                                                    className="h-1.5 w-1.5 bg-blue-500 rounded-full"
                                                />
                                            ))}
                                        </div>
                                        <span className="truncate ml-1 font-medium">{typingIndicator} is typing</span>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {showNewMessagesButton && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, x: "-50%" }}
                            animate={{ opacity: 1, y: 0, x: "-50%" }}
                            exit={{ opacity: 0, y: 20, x: "-50%" }}
                            className="absolute bottom-6 left-1/2 z-40"
                        >
                            <Button
                                onClick={scrollToBottom}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl gap-2 border-2 border-white/20 px-4 py-5 group"
                            >
                                <motion.span
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="flex h-2 w-2 rounded-full bg-white"
                                />
                                <span className="font-bold text-xs uppercase tracking-wider">New messages</span>
                                <span className="group-hover:translate-y-0.5 transition-transform duration-200">↓</span>
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <footer className="p-4 bg-background/60 backdrop-blur-xl border-t relative z-30">
                {sendError && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-10 left-4 right-4 flex items-center justify-center p-2 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-600 shadow-sm"
                    >
                        <span className="font-semibold">{sendError}</span>
                        <button onClick={() => handleSend()} className="ml-2 font-bold underline hover:text-red-700">Retry</button>
                    </motion.div>
                )}
                <form onSubmit={handleSend} className="flex items-center gap-3 max-w-5xl mx-auto">
                    <div className="flex-1 relative group">
                        <Input
                            value={content}
                            onChange={handleContentChange}
                            placeholder="Type a message..."
                            disabled={isSending}
                            className="w-full bg-muted/20 border-border/50 rounded-full pl-6 pr-12 h-11 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:bg-background transition-all placeholder:text-muted-foreground/50 shadow-inner"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {/* Potential emoji picker trigger could go here */}
                        </div>
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!content.trim() || isSending}
                            className="bg-blue-600 hover:bg-blue-700 shrink-0 shadow-lg rounded-full h-11 w-11 transition-all duration-300"
                        >
                            {isSending ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Send className="h-5 w-5 text-white" />}
                        </Button>
                    </motion.div>
                </form>
            </footer>
        </div>
    );
}
