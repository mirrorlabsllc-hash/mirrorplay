import { useState, useMemo } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

type Intent = "improvement" | "positive" | null;

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [intent, setIntent] = useState<Intent>(null);
  const [message, setMessage] = useState("");
  const [consentPublic, setConsentPublic] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const { toast } = useToast();
  const [location] = useLocation();

  // Attempt to read last session context from localStorage if app stores it under this key
  const lastContext = useMemo(() => {
    try {
      const raw = localStorage.getItem("mirror:lastSession");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/feedback", payload);
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      setIsOpen(false);
      setIntent(null);
      setMessage("");
      setConsentPublic(false);
      toast({ title: "Got it. This helps more than you know." });
    },
    onError: () => {
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    },
  });

  const open = () => {
    setIsOpen(true);
    setIntent(null);
    setMessage("");
    setConsentPublic(false);
    setIncludeContext(true);
  };

  const handleSubmit = () => {
    if (!intent || !message.trim()) return;

    const payload: any = {
      type: intent,
      message: message.trim(),
      platform: "web",
      context: includeContext ? lastContext : undefined,
      consent_public: intent === "positive" ? !!consentPublic : undefined,
      page: location,
    };

    submitMutation.mutate(payload);
  };

  return (
    <>
      <Button
        data-testid="button-feedback-open"
        onClick={open}
        size="icon"
        className="fixed bottom-20 left-4 z-40 rounded-full shadow-lg hover:shadow-xl transition-all"
        variant="default"
        title="Share feedback"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Share Feedback</h2>
              <Button
                data-testid="button-feedback-close"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!intent ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">What would you like to share?</p>
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => setIntent("improvement")}>Something to improve</Button>
                  <Button className="flex-1" onClick={() => setIntent("positive")}>Something that worked well</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {intent === "improvement"
                    ? "What felt confusing, missing, or off?"
                    : "What felt helpful, clear, or meaningful for you?"}
                </p>

                <Textarea
                  data-testid="input-feedback-message"
                  placeholder={
                    intent === "improvement"
                      ? "Anything that broke the flow, felt unclear, or didn’t feel useful…"
                      : "What worked well or felt meaningful to you…"
                  }
                  rows={5}
                  className="resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />

                {intent === "positive" && (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={consentPublic} onCheckedChange={(v) => setConsentPublic(!!v)} />
                    <span className="text-sm">You may quote this feedback publicly (anonymously)</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox checked={includeContext} onCheckedChange={(v) => setIncludeContext(!!v)} />
                  <span className="text-sm">Include my last session context (scenario + analysis, no audio)</span>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setIntent(null)} variant="outline" className="flex-1">Back</Button>
                  <Button onClick={handleSubmit} className="flex-1" disabled={submitMutation.isPending || !message.trim()}>
                    {submitMutation.isPending ? "Sending..." : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
