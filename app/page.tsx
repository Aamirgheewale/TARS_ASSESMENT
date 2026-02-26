import { MessageSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 bg-muted/10">
      <div className="bg-blue-600/10 p-6 rounded-3xl mb-6 shadow-sm border border-blue-600/20">
        <MessageSquare className="h-12 w-12 text-blue-600" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Welcome to <span className="text-blue-600">TARS APP</span>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
        Select a user from the sidebar to start a secure, real-time conversation.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-lg w-full">
        <div className="p-4 rounded-2xl border bg-background shadow-sm hover:border-blue-500 transition-colors text-left">
          <h3 className="font-semibold text-blue-600">Real-time Messaging</h3>
          <p className="text-sm text-muted-foreground mt-1">Experience instant data synchronization with Convex.</p>
        </div>
        <div className="p-4 rounded-2xl border bg-background shadow-sm hover:border-blue-500 transition-colors text-left">
          <h3 className="font-semibold text-blue-600">Secure Auth</h3>
          <p className="text-sm text-muted-foreground mt-1">Protected routes and identity via Clerk.</p>
        </div>
      </div>
    </div>
  );
}
