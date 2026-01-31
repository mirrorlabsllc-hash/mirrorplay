import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  History, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  Loader2,
  BarChart2,
  Target
} from "lucide-react";
import { format } from "date-fns";
import type { PracticeSession } from "@shared/schema";

interface SessionWithDetails extends PracticeSession {
  scenario?: {
    title: string;
    category: string;
  };
}

export default function ConversationReplay() {
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSession, setCompareSession] = useState<SessionWithDetails | null>(null);

  const { data: sessions = [], isLoading } = useQuery<SessionWithDetails[]>({
    queryKey: ["/api/sessions/recent"],
  });

  // Group sessions by scenario/prompt for comparison
  const groupedSessions = sessions.reduce((acc, session) => {
    const key = session.prompt || "misc";
    if (!acc[key]) acc[key] = [];
    acc[key].push(session);
    return acc;
  }, {} as Record<string, SessionWithDetails[]>);

  const calculateImprovement = (current: number, previous: number) => {
    const diff = current - previous;
    return diff > 0 ? `+${diff}` : diff.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Session detail view
  if (selectedSession) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-lg mx-auto space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => { setSelectedSession(null); setCompareSession(null); setCompareMode(false); }}
            data-testid="button-back-sessions"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sessions
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Session Details</CardTitle>
                <Badge variant="outline">
                  {format(new Date(selectedSession.createdAt!), "MMM d, h:mm a")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Prompt</p>
                <p className="text-sm font-medium">{selectedSession.prompt}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Response</p>
                <div className="bg-muted/30 p-3 rounded-md">
                  <p className="text-sm">{selectedSession.response}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-primary/10 rounded-md">
                  <div className="text-2xl font-bold text-primary">{selectedSession.score}%</div>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-md">
                  <div className="text-2xl font-bold">{selectedSession.tone}</div>
                  <p className="text-xs text-muted-foreground">Detected Tone</p>
                </div>
              </div>

              {selectedSession.tips && selectedSession.tips.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tips</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {selectedSession.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compare with another session */}
          {!compareMode && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCompareMode(true)}
              data-testid="button-compare-mode"
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              Compare with Previous
            </Button>
          )}

          {compareMode && !compareSession && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select a Session to Compare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sessions
                  .filter(s => s.id !== selectedSession.id && s.prompt === selectedSession.prompt)
                  .slice(0, 5)
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-md cursor-pointer hover-elevate"
                      onClick={() => setCompareSession(session)}
                      data-testid={`compare-session-${session.id}`}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(session.createdAt!), "MMM d, h:mm a")}
                        </p>
                        <p className="text-xs text-muted-foreground">Score: {session.score}%</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                {sessions.filter(s => s.id !== selectedSession.id && s.prompt === selectedSession.prompt).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No other sessions with this prompt to compare
                  </p>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCompareMode(false)}
                  className="w-full mt-2"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          )}

          {compareSession && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Previous</p>
                    <p className="text-2xl font-bold">{compareSession.score}%</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(compareSession.createdAt!), "MMM d")}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Current</p>
                    <p className="text-2xl font-bold text-primary">{selectedSession.score}%</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedSession.createdAt!), "MMM d")}
                    </p>
                  </div>
                </div>

                <div className="text-center py-2">
                  <Badge 
                    className={selectedSession.score! >= compareSession.score! 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "bg-red-500/20 text-red-400"
                    }
                  >
                    {calculateImprovement(selectedSession.score || 0, compareSession.score || 0)} points
                  </Badge>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Previous Response</p>
                  <div className="bg-muted/20 p-3 rounded-md">
                    <p className="text-sm">{compareSession.response}</p>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCompareSession(null)}
                  className="w-full"
                >
                  Compare with Different Session
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/journey">
            <Button variant="ghost" size="icon" data-testid="button-back-journey">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Conversation Replay</h1>
            <p className="text-sm text-muted-foreground">
              Review and compare your past practice sessions
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No practice sessions yet</p>
              <Link href="/">
                <Button data-testid="button-start-practice">Start Practicing</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="py-4 text-center">
                  <MessageSquare className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xl font-bold">{sessions.length}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <Target className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <p className="text-xl font-bold">
                    {Math.round(sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <p className="text-xl font-bold">
                    {Object.keys(groupedSessions).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Prompts</p>
                </CardContent>
              </Card>
            </div>

            {/* Session List */}
            <ScrollArea className="h-[60vh]">
              <div className="space-y-3">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => setSelectedSession(session)}
                    data-testid={`card-session-${session.id}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2 mb-2">
                            {session.prompt}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {session.tone}
                            </Badge>
                            <Badge className="text-xs bg-primary/20 text-primary">
                              {session.score}%
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(session.createdAt!), "MMM d")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(session.createdAt!), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}
