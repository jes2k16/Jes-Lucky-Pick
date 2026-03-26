import { MessageSquare } from "lucide-react";
import { ConsoleSection } from "@/features/ai-training/components/ConsoleSection";

export function AiChatbotPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          AI Chatbot
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Claude CLI terminal — run prompts in print or interactive mode
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ConsoleSection />
      </div>
    </div>
  );
}
