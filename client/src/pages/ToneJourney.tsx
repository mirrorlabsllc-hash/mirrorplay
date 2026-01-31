import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Target,
  BarChart3,
  Award,
  ArrowLeft,
  Trophy,
  Zap,
} from "lucide-react";

interface TonePerformance {
  tone: string;
  averageScore: number;
  totalSessions: number;
  bestScore: number;
  recentTrend: "up" | "down" | "stable";
}

interface ToneJourneyData {
  performances: TonePerformance[];
  strengths: TonePerformance[];
  areasToImprove: TonePerformance[];
  overallProgress: number;
}

const TONE_CATEGORIES = [
  { key: "calm", label: "Calm", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  { key: "assertive", label: "Assertive", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  { key: "empathetic", label: "Empathetic", color: "text-pink-400", bgColor: "bg-pink-500/20" },
  { key: "confident", label: "Confident", color: "text-violet-400", bgColor: "bg-violet-500/20" },
  { key: "defensive", label: "Defensive", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  { key: "anxious", label: "Anxious", color: "text-orange-400", bgColor: "bg-orange-500/20" },
  { key: "aggressive", label: "Aggressive", color: "text-red-400", bgColor: "bg-red-500/20" },
  { key: "passive", label: "Passive", color: "text-gray-400", bgColor: "bg-gray-500/20" },
];

function RadarChart({ performances }: { performances: TonePerformance[] }) {
  const size = 200;
  const center = size / 2;
  const radius = 80;
  const levels = [25, 50, 75, 100];

  const performanceMap = new Map(
    performances.map((p) => [p.tone.toLowerCase(), p.averageScore])
  );

  const points = TONE_CATEGORIES.map((cat, i) => {
    const angle = (Math.PI * 2 * i) / TONE_CATEGORIES.length - Math.PI / 2;
    const score = performanceMap.get(cat.key) || 0;
    const r = (score / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      labelX: center + (radius + 20) * Math.cos(angle),
      labelY: center + (radius + 20) * Math.sin(angle),
      label: cat.label,
      score,
    };
  });

  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {levels.map((level) => (
          <polygon
            key={level}
            points={TONE_CATEGORIES.map((_, i) => {
              const angle = (Math.PI * 2 * i) / TONE_CATEGORIES.length - Math.PI / 2;
              const r = (level / 100) * radius;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            }).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            className="text-foreground"
          />
        ))}

        {TONE_CATEGORIES.map((_, i) => {
          const angle = (Math.PI * 2 * i) / TONE_CATEGORIES.length - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="currentColor"
              strokeOpacity={0.1}
              className="text-foreground"
            />
          );
        })}

        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="url(#radarGradient)"
          stroke="rgb(139, 92, 246)"
          strokeWidth={2}
          opacity={0.8}
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="rgb(139, 92, 246)"
            stroke="white"
            strokeWidth={2}
          />
        ))}

        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="rgb(236, 72, 153)" stopOpacity={0.4} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function ScaleAxis() {
  return (
    <div className="absolute right-4 top-12 flex flex-col items-end gap-1 text-xs text-muted-foreground">
      {[100, 75, 50, 25, 0].map((val) => (
        <div key={val} className="flex items-center gap-1">
          <span>{val}</span>
        </div>
      ))}
    </div>
  );
}

export default function ToneJourney() {
  const { data: journeyData, isLoading } = useQuery<ToneJourneyData>({
    queryKey: ["/api/tone-journey"],
  });

  const performances = journeyData?.performances || [];
  const strengths = journeyData?.strengths || [];
  const areasToImprove = journeyData?.areasToImprove || [];

  const performanceMap = new Map(
    performances.map((p) => [p.tone.toLowerCase(), p])
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-tone-journey">
        <div className="animate-pulse text-muted-foreground" data-testid="text-loading">Loading your tone journey...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/progress">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <TrendingUp className="w-6 h-6 text-violet-400" />
              Your Tone Journey
            </h1>
            <p className="text-muted-foreground text-sm" data-testid="text-page-subtitle">
              Track your mastery across all communication tones
            </p>
          </div>
        </div>

        <GlassCard variant="dark" className="relative" data-testid="card-radar">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold" data-testid="text-radar-title">Tone Mastery Radar</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6" data-testid="text-radar-subtitle">Your skill level across all tones</p>
          <ScaleAxis />
          <RadarChart performances={performances} />
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {TONE_CATEGORIES.map((cat) => (
              <Badge key={cat.key} variant="secondary" className={`${cat.bgColor} ${cat.color}`} data-testid={`badge-tone-${cat.key}`}>
                {cat.label}
              </Badge>
            ))}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard variant="dark" data-testid="card-strengths">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold" data-testid="text-strengths-title">Your Strengths</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-strengths-subtitle">Top performing tone categories</p>
            {strengths.length > 0 ? (
              <div className="space-y-3">
                {strengths.slice(0, 3).map((s) => (
                  <div key={s.tone} className="flex items-center justify-between" data-testid={`row-strength-${s.tone.toLowerCase()}`}>
                    <span className="font-medium" data-testid={`text-strength-tone-${s.tone.toLowerCase()}`}>{s.tone}</span>
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400" data-testid={`badge-strength-score-${s.tone.toLowerCase()}`}>
                      {s.averageScore}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm" data-testid="text-no-strengths">
                Complete more practices to discover your strengths
              </p>
            )}
          </GlassCard>

          <GlassCard variant="dark" data-testid="card-improve">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold" data-testid="text-improve-title">Areas to Improve</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-improve-subtitle">Focus on these for growth</p>
            {areasToImprove.length > 0 ? (
              <div className="space-y-3">
                {areasToImprove.slice(0, 3).map((a) => (
                  <div key={a.tone} className="flex items-center justify-between" data-testid={`row-improve-${a.tone.toLowerCase()}`}>
                    <span className="font-medium" data-testid={`text-improve-tone-${a.tone.toLowerCase()}`}>{a.tone}</span>
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-400" data-testid={`badge-improve-score-${a.tone.toLowerCase()}`}>
                      {a.averageScore}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm" data-testid="text-no-improve">
                Complete more practices across different tones
              </p>
            )}
          </GlassCard>
        </div>

        <GlassCard variant="dark" data-testid="card-overview">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold" data-testid="text-overview-title">Tone Mastery Overview</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6" data-testid="text-overview-subtitle">Your performance across all communication styles</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TONE_CATEGORIES.map((cat) => {
              const perf = performanceMap.get(cat.key);
              const score = perf?.averageScore || 0;
              const sessions = perf?.totalSessions || 0;

              return (
                <div
                  key={cat.key}
                  className="p-4 rounded-lg bg-muted/20"
                  data-testid={`card-tone-${cat.key}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${cat.color}`} data-testid={`text-tone-label-${cat.key}`}>{cat.label}</span>
                    {perf?.recentTrend === "up" && (
                      <Zap className="w-4 h-4 text-emerald-400" data-testid={`icon-trend-${cat.key}`} />
                    )}
                  </div>
                  {sessions > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden" data-testid={`progress-bar-${cat.key}`}>
                          <div
                            className={`h-full ${cat.bgColor.replace("/20", "")} rounded-full transition-all`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right" data-testid={`text-tone-score-${cat.key}`}>{score}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground" data-testid={`text-tone-sessions-${cat.key}`}>
                        {sessions} practice{sessions !== 1 ? "s" : ""} completed
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid={`text-no-practice-${cat.key}`}>
                      No practice yet
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>

        <div className="text-center">
          <Link href="/">
            <Button data-testid="button-start-practice">
              <Zap className="w-4 h-4 mr-2" />
              Start Practicing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
