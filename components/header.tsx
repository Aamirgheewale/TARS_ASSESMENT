"use client";

import { UserButton, SignInButton, SignUpButton, SignedIn, SignedOut, ClerkLoading } from "@clerk/nextjs";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function Header() {
    return (
        <header className="sticky top-0 z-20 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-2">
                    <Link href="/" className="font-extrabold text-2xl tracking-tighter bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                        TARS.AI
                    </Link>
                </div>

                <nav className="flex items-center gap-4">
                    <ClerkLoading>
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </ClerkLoading>

                    <SignedIn>
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>

                    <SignedOut>
                        <div className="flex items-center gap-3">
                            <SignInButton mode="modal">
                                <button className="text-sm font-medium hover:text-blue-600 transition-colors">
                                    Sign In
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                                    Get Started
                                </button>
                            </SignUpButton>
                        </div>
                    </SignedOut>
                </nav>
            </div>
        </header>
    );
}
