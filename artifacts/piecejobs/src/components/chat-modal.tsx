import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

const SB_URL  = "https://vnrvwfialfvduvetoewa.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnZ3ZmlhbGZ2ZHV2ZXRvZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTUzMjYsImV4cCI6MjA5ODMzMTMyNn0.5mfElVG_tuhBLLP4BKdQ7v5zXLIi51LpMbZUmKZ8A9w";

type Message = {
  id: string;
  job_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
};

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  senderName: string;
  senderRole: "worker" | "homeowner";
}

export function ChatModal({ open, onClose, jobId, jobTitle, senderName, senderRole }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft]       = useState("");
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `${SB_URL}/rest/v1/messages?job_id=eq.${jobId}&order=created_at.asc`,
        {
          headers: {
            "apikey":        SB_ANON,
            "Authorization": `Bearer ${SB_ANON}`,
          },
        },
      );
      const data = await response.json();
      console.log("Fetched messages:", data);
      if (Array.isArray(data)) {
        setMessages([...data]);
      }
    } catch (err) {
      console.error("fetchMessages error:", err);
    }
  }, [jobId]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setDraft("");
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 5_000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, jobId, fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function sendMessage() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const response = await fetch(
        `${SB_URL}/rest/v1/messages`,
        {
          method: "POST",
          headers: {
            "apikey":        SB_ANON,
            "Authorization": `Bearer ${SB_ANON}`,
            "Content-Type":  "application/json",
            "Prefer":        "return=minimal",
          },
          body: JSON.stringify({
            job_id:      jobId,
            sender_name: senderName,
            sender_role: senderRole,
            message:     text,
          }),
        },
      );
      console.log("Message send status:", response.status);
      if (response.status === 201) {
        setDraft("");
        await fetchMessages();
      }
    } catch (err) {
      console.error("sendMessage error:", err);
    }
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "#1B2E4B" }}
            >
              💬
            </div>
            <div>
              <DialogTitle className="font-serif font-bold text-base leading-tight" style={{ color: "#1B2E4B" }}>
                Secure Job Chat
              </DialogTitle>
              <p className="text-xs text-muted-foreground truncate max-w-[280px]">{jobTitle}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          style={{ background: "#F1F5F9", minHeight: 0 }}
        >
          {messages.length === 0 && (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_role === senderRole;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <p className="text-xs text-muted-foreground mb-1 px-1">{msg.sender_name}</p>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe ? "rounded-tr-sm text-white" : "rounded-tl-sm bg-white text-foreground border border-border"
                  }`}
                  style={isMe ? { background: "#2D7DD2" } : {}}
                >
                  {msg.message}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 px-1">{formatTime(msg.created_at)}</p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border bg-white shrink-0 flex gap-2">
          <Input
            className="flex-1 h-10 rounded-full"
            placeholder="Type a message…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={!draft.trim() || sending}
            className="h-10 w-10 rounded-full p-0 shrink-0"
            style={{ background: "#F5A623", color: "#1B2E4B" }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
