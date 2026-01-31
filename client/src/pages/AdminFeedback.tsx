import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface PrototypeFeedback {
  id: string;
  createdAt?: string;
  platform?: string;
  feedbackText: string;
  type?: string;
  consentPublic?: boolean;
  tags?: string[];
  category?: string;
  difficulty?: string;
  scenarioId?: string;
  appVersion?: string;
  anonymousUserId?: string;
}

export default function AdminFeedback() {
  const [items, setItems] = useState<PrototypeFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"all" | "improvement" | "positive_internal" | "positive_public">("all");

  useEffect(() => {
    const adminToken = import.meta.env.VITE_ADMIN_TOKEN as string | undefined;
    if (!adminToken) {
      setError("Missing VITE_ADMIN_TOKEN env var");
      setLoading(false);
      return;
    }

    fetch("/api/admin/feedback", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? "Unauthorized" : "Failed to load");
        return res.json();
      })
      .then((data) => setItems(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Prototype Feedback</h1>
        <p className="text-sm text-muted-foreground">Newest first · read-only · token gated</p>
      </div>

      {items.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No feedback yet.</Card>
      ) : (
        <div className="space-y-4">
          {items
            .filter((it) => {
              if (filter === "all") return true;
              if (filter === "improvement") return it.type === "improvement";
              if (filter === "positive_internal") return it.type === "positive" && !it.consentPublic;
              if (filter === "positive_public") return it.type === "positive" && !!it.consentPublic;
              return true;
            })
            .map((item) => (
            <Card key={item.id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {item.createdAt ? format(new Date(item.createdAt), "yyyy-MM-dd HH:mm") : ""}
                </span>
                {item.platform && <Badge variant="outline">{item.platform}</Badge>}
                {item.category && <Badge variant="outline">{item.category}</Badge>}
                {item.difficulty && <Badge variant="outline">{item.difficulty}</Badge>}
                {item.appVersion && <span>v{item.appVersion}</span>}
                {item.scenarioId && <span className="text-xs">Scenario: {item.scenarioId}</span>}
                {item.anonymousUserId && <span className="text-xs">Anon: {item.anonymousUserId}</span>}
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.feedbackText}</p>

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="fixed bottom-6 right-6 flex gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")}>All</Button>
        <Button size="sm" variant={filter === "improvement" ? "default" : "ghost"} onClick={() => setFilter("improvement")}>Improvements</Button>
        <Button size="sm" variant={filter === "positive_internal" ? "default" : "ghost"} onClick={() => setFilter("positive_internal")}>Positive (internal)</Button>
        <Button size="sm" variant={filter === "positive_public" ? "default" : "ghost"} onClick={() => setFilter("positive_public")}>Positive (public)</Button>
      </div>

      <Separator className="my-4" />
      <p className="text-xs text-muted-foreground">
        Uses /api/admin/feedback with Bearer token. Set VITE_ADMIN_TOKEN and ADMIN_FEEDBACK_TOKEN to the same value for local testing.
      </p>
    </div>
  );
}
