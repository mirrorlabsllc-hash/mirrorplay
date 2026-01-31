import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileText, 
  Printer,
  Star,
  Flame,
  Trophy,
  Target,
  Mic,
  Calendar,
  ArrowLeft,
  Award,
  TrendingUp,
  Share2,
  FileDown
} from "lucide-react";
import { Link } from "wouter";
import { format, subDays, isSameDay, parseISO } from "date-fns";
import { useState, useRef, useMemo } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { ShareableAchievementCard } from "@/components/ShareableAchievementCard";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface ProgressReport {
  exportedAt: string;
  user: {
    name: string;
    email: string;
    joinedAt: string;
    subscriptionTier: string;
  };
  stats: {
    level: number;
    totalXp: number;
    xpToNextLevel: number;
    peacePoints: number;
    currentStreak: number;
    bestStreak: number;
    totalPracticeSessions: number;
    lastPracticeDate: string | null;
  };
  categoryPerformance: Array<{
    category: string;
    sessionCount: number;
    averageScore: number;
  }>;
  voiceStats: {
    totalVoiceSessions: number;
    totalDurationMinutes: number;
    averageFillerWordsPerSession: number;
  } | null;
  badges: Array<{
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  recentSessions: Array<{
    date: string;
    category: string;
    mode: string;
    score: number;
    tone: string;
    prompt: string;
    xpEarned: number;
    ppEarned: number;
  }>;
  timeline: Array<{
    type: string;
    title: string;
    date: string;
    icon: string;
  }>;
  summary: {
    textSessions: number;
    voiceSessions: number;
    totalRecentSessions: number;
    periodDays: number;
  };
}

export default function ProgressExport() {
  const { data: report, isLoading, error } = useQuery<ProgressReport>({
    queryKey: ["/api/progress/export"],
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [shareCard, setShareCard] = useState<{
    type: "badge" | "milestone" | "stats";
    data: any;
  } | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadJson = () => {
    if (!report) return;
    const dataStr = JSON.stringify(report, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mirror-play-progress-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || !report) return;
    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#0a0a0f",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`mirror-play-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareStats = () => {
    if (!report) return;
    setShareCard({
      type: "stats",
      data: {
        title: "My Progress",
        level: report.stats.level,
        totalXp: report.stats.totalXp,
        streak: report.stats.currentStreak,
      },
    });
  };

  const handleShareBadge = (badge: { name: string; description: string; icon: string; earnedAt: string }) => {
    setShareCard({
      type: "badge",
      data: {
        title: badge.name,
        subtitle: badge.description,
        icon: badge.icon,
        date: format(new Date(badge.earnedAt), "MMMM d, yyyy"),
      },
    });
  };

  const CHART_COLORS = ["#a855f7", "#ec4899", "#f97316", "#22c55e", "#3b82f6", "#6366f1"];

  const activityChartData = useMemo(() => {
    if (!report) return [];
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      const sessions = report.recentSessions.filter(s => {
        try {
          const sessionDate = new Date(s.date);
          return isSameDay(sessionDate, date);
        } catch {
          return false;
        }
      });
      return {
        day: format(date, "MMM d"),
        sessions: sessions.length,
        avgScore: sessions.length > 0 
          ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
          : 0,
        xp: sessions.reduce((sum, s) => sum + s.xpEarned, 0),
      };
    });
    return last14Days;
  }, [report]);

  const categoryChartData = useMemo(() => {
    if (!report || !report.categoryPerformance.length) return [];
    return report.categoryPerformance.map(cat => ({
      name: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
      sessions: cat.sessionCount,
      score: cat.averageScore,
    }));
  }, [report]);

  const modeDistribution = useMemo(() => {
    if (!report) return [];
    const textCount = report.summary.textSessions;
    const voiceCount = report.summary.voiceSessions;
    if (textCount === 0 && voiceCount === 0) return [];
    return [
      { name: "Text", value: textCount },
      { name: "Voice", value: voiceCount },
    ];
  }, [report]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      workplace: "bg-blue-500/20 text-blue-400",
      relationships: "bg-pink-500/20 text-pink-400",
      boundaries: "bg-orange-500/20 text-orange-400",
      empathy: "bg-green-500/20 text-green-400",
      negotiation: "bg-purple-500/20 text-purple-400",
      general: "bg-gray-500/20 text-gray-400",
    };
    return colors[category] || colors.general;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Generating your progress report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GlassCard variant="dark" className="text-center p-8 max-w-md">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Generate Report</h2>
          <p className="text-muted-foreground mb-4">We couldn't fetch your progress data. Please try again later.</p>
          <Link to="/progress">
            <Button variant="outline" data-testid="button-back-to-progress">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Progress
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
      <div className="no-print">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <Link to="/progress">
              <Button variant="ghost" size="sm" className="mb-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Progress Report</h1>
            <p className="text-muted-foreground">Your achievements and stats at a glance</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              data-testid="button-download-pdf"
            >
              <FileDown className="w-4 h-4 mr-2" />
              {isGeneratingPdf ? "Generating..." : "Download PDF"}
            </Button>
            <Button variant="outline" onClick={handleDownloadJson} data-testid="button-download-json">
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
            <Button variant="outline" onClick={handleShareStats} data-testid="button-share-stats">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="ghost" onClick={handlePrint} data-testid="button-print">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {shareCard && (
          <ShareableAchievementCard
            type={shareCard.type}
            data={shareCard.data}
            userName={report?.user.name || "User"}
            onClose={() => setShareCard(null)}
          />
        )}
      </AnimatePresence>

      <div ref={reportRef} className="printable-area space-y-6" id="progress-report">
        <div className="print-header hidden print:block text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Mirror Play Progress Report</h1>
          <p className="text-lg">{report.user.name}</p>
          <p className="text-sm text-muted-foreground">Generated on {format(new Date(report.exportedAt), "MMMM d, yyyy")}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard variant="glow" className="print:bg-transparent print:border">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <h2 className="text-xl font-bold" data-testid="text-user-name">{report.user.name}</h2>
                <p className="text-sm text-muted-foreground" data-testid="text-user-email">{report.user.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" data-testid="badge-level">Level {report.stats.level}</Badge>
                  <Badge variant="outline" data-testid="badge-tier">{report.user.subscriptionTier}</Badge>
                  {report.user.joinedAt && (
                    <span className="text-xs text-muted-foreground" data-testid="text-joined-date">
                      Member since {format(new Date(report.user.joinedAt), "MMM yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard variant="dark" className="text-center py-4 print:bg-transparent print:border">
            <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center bg-primary/20">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold" data-testid="stat-total-xp">{report.stats.totalXp}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </GlassCard>

          <GlassCard variant="dark" className="text-center py-4 print:bg-transparent print:border">
            <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center bg-amber-500/20">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold" data-testid="stat-peace-points">{report.stats.peacePoints}</p>
            <p className="text-xs text-muted-foreground">Peace Points</p>
          </GlassCard>

          <GlassCard variant="dark" className="text-center py-4 print:bg-transparent print:border">
            <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center bg-orange-500/20">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold" data-testid="stat-streak">{report.stats.currentStreak}</p>
            <p className="text-xs text-muted-foreground">Current Streak</p>
          </GlassCard>

          <GlassCard variant="dark" className="text-center py-4 print:bg-transparent print:border">
            <div className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center bg-emerald-500/20">
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold" data-testid="stat-sessions">{report.stats.totalPracticeSessions}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </GlassCard>
        </motion.div>

        {report.badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Achievements ({report.badges.length})
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 print:grid-cols-6">
              {report.badges.map((badge, index) => (
                <GlassCard 
                  key={index} 
                  variant="dark" 
                  className="text-center py-3 print:bg-transparent print:border group relative cursor-pointer hover-elevate"
                  onClick={() => handleShareBadge(badge)}
                >
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                    <Share2 className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-2xl block mb-1">{badge.icon}</span>
                  <p className="text-xs font-medium truncate" data-testid={`badge-name-${index}`}>{badge.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(badge.earnedAt), "MMM d")}
                  </p>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}

        {activityChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-3 no-print"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Activity (Last 14 Days)
            </h2>
            <GlassCard variant="dark">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityChartData}>
                    <defs>
                      <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="day" 
                      tick={{ fill: "#888", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: "#888", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#1a1a2e", 
                        border: "1px solid #333",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stroke="#a855f7"
                      fillOpacity={1}
                      fill="url(#colorSessions)"
                      name="Sessions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-4 no-print">
          {categoryChartData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-muted-foreground">Sessions by Category</h3>
              <GlassCard variant="dark">
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} layout="vertical">
                      <XAxis type="number" tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fill: "#888", fontSize: 10 }} 
                        axisLine={false} 
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#1a1a2e", 
                          border: "1px solid #333",
                          borderRadius: "8px",
                          fontSize: "12px"
                        }}
                      />
                      <Bar dataKey="sessions" name="Sessions" radius={[0, 4, 4, 0]}>
                        {categoryChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {modeDistribution.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-muted-foreground">Practice Mode Distribution</h3>
              <GlassCard variant="dark">
                <div className="h-40 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {modeDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#1a1a2e", 
                          border: "1px solid #333",
                          borderRadius: "8px",
                          fontSize: "12px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2">
                    {modeDistribution.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2 text-xs">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index] }}
                        />
                        <span>{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>

        {report.categoryPerformance.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              Performance by Category (Last 30 Days)
            </h2>
            <GlassCard variant="dark" className="print:bg-transparent print:border">
              <div className="space-y-3">
                {report.categoryPerformance.map((cat, index) => (
                  <div key={cat.category} className="flex items-center gap-3" data-testid={`category-row-${index}`}>
                    <Badge className={getCategoryColor(cat.category)}>
                      {cat.category}
                    </Badge>
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${cat.averageScore}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{cat.averageScore}%</span>
                    <span className="text-xs text-muted-foreground w-20 text-right">{cat.sessionCount} sessions</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {report.voiceStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Mic className="w-5 h-5 text-muted-foreground" />
              Voice Practice Summary
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <GlassCard variant="dark" className="text-center py-4 print:bg-transparent print:border">
                <p className="text-xl font-bold" data-testid="voice-sessions">{report.voiceStats.totalVoiceSessions}</p>
                <p className="text-xs text-muted-foreground">Voice Sessions</p>
              </GlassCard>
              <GlassCard variant="dark" className="text-center py-4 print:bg-transparent print:border">
                <p className="text-xl font-bold" data-testid="voice-duration">{report.voiceStats.totalDurationMinutes}</p>
                <p className="text-xs text-muted-foreground">Total Minutes</p>
              </GlassCard>
              <GlassCard variant="dark" className="text-center py-4 print:bg-transparent print:border">
                <p className="text-xl font-bold" data-testid="voice-fillers">{report.voiceStats.averageFillerWordsPerSession}</p>
                <p className="text-xs text-muted-foreground">Avg Filler Words</p>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {report.recentSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Recent Practice History
            </h2>
            <GlassCard variant="dark" className="print:bg-transparent print:border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium">Date</th>
                    <th className="text-left py-2 px-2 font-medium">Category</th>
                    <th className="text-left py-2 px-2 font-medium">Mode</th>
                    <th className="text-left py-2 px-2 font-medium">Tone</th>
                    <th className="text-right py-2 px-2 font-medium">Score</th>
                    <th className="text-right py-2 px-2 font-medium">XP</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentSessions.slice(0, 10).map((session, index) => (
                    <tr key={index} className="border-b border-border/50 last:border-0" data-testid={`session-row-${index}`}>
                      <td className="py-2 px-2 text-muted-foreground">
                        {format(new Date(session.date), "MMM d")}
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">{session.category}</Badge>
                      </td>
                      <td className="py-2 px-2">
                        {session.mode === "voice" ? (
                          <Mic className="w-3 h-3 inline" />
                        ) : (
                          <FileText className="w-3 h-3 inline" />
                        )}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{session.tone}</td>
                      <td className="py-2 px-2 text-right font-medium">{session.score}%</td>
                      <td className="py-2 px-2 text-right text-primary">+{session.xpEarned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </motion.div>
        )}

        <div className="print-footer hidden print:block text-center mt-8 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Generated by Mirror Play on {format(new Date(report.exportedAt), "MMMM d, yyyy 'at' h:mm a")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {report.summary.totalRecentSessions} sessions in the last {report.summary.periodDays} days
          </p>
        </div>
      </div>
    </div>
  );
}
