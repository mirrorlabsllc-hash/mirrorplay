import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Testimonial, BetaSignup } from "@shared/schema";
import {
  Users,
  UserCheck,
  Mail,
  Activity,
  TrendingUp,
  Star,
  Plus,
  Trash2,
  Check,
  X,
  ArrowLeft,
  BarChart3,
  Shield,
} from "lucide-react";

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalBetaSignups: number;
  totalSessions: number;
  recentSignups: BetaSignup[];
  usersByDay: { date: string; count: number }[];
}

export default function Admin() {
  const { toast } = useToast();
  const [showAddTestimonial, setShowAddTestimonial] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({
    name: "",
    role: "",
    content: "",
    rating: 5,
    approved: false,
  });

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics"],
    retry: false,
  });

  const { data: testimonials, isLoading: testimonialsLoading, error: testimonialsError } = useQuery<Testimonial[]>({
    queryKey: ["/api/admin/testimonials"],
    retry: false,
  });

  const { data: betaSignups, error: signupsError } = useQuery<BetaSignup[]>({
    queryKey: ["/api/admin/beta-signups"],
    retry: false,
  });

  const hasAuthError = analyticsError || testimonialsError || signupsError;

  const createTestimonialMutation = useMutation({
    mutationFn: async (data: typeof newTestimonial) => {
      const res = await apiRequest("POST", "/api/admin/testimonials", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      setShowAddTestimonial(false);
      setNewTestimonial({ name: "", role: "", content: "", rating: 5, approved: false });
      toast({ title: "Testimonial added" });
    },
    onError: () => {
      toast({ title: "Failed to add testimonial", variant: "destructive" });
    },
  });

  const updateTestimonialMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Testimonial> }) => {
      const res = await apiRequest("PATCH", `/api/admin/testimonials/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
    },
  });

  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/testimonials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      toast({ title: "Testimonial deleted" });
    },
  });

  const handleAddTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTestimonial.name && newTestimonial.content) {
      createTestimonialMutation.mutate(newTestimonial);
    }
  };

  if (hasAuthError) {
    const errorObj = analyticsError || testimonialsError || signupsError;
    const isUnauthorized = (errorObj as any)?.message?.includes("401") || 
                           (errorObj as any)?.status === 401;
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="error-unauthorized">
        <GlassCard variant="dark" className="text-center max-w-md">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2" data-testid="text-error-title">
            {isUnauthorized ? "Access Denied" : "Error Loading Dashboard"}
          </h2>
          <p className="text-muted-foreground mb-4" data-testid="text-error-message">
            {isUnauthorized 
              ? "You need to be logged in to view the admin dashboard."
              : "An error occurred while loading the dashboard. Please try again."}
          </p>
          <Link href="/">
            <Button data-testid="button-back-home">Back to Home</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  if (analyticsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-admin-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
              <p className="text-muted-foreground" data-testid="text-admin-subtitle">Analytics and content management</p>
            </div>
          </div>
          <Badge variant="secondary" data-testid="badge-analytics">
            <BarChart3 className="w-3 h-3 mr-1" />
            Analytics
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard variant="dark">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold" data-testid="text-total-users">
                  {analytics?.totalUsers || 0}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="dark">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active (7d)</p>
                <p className="text-2xl font-bold" data-testid="text-active-users">
                  {analytics?.activeUsers || 0}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="dark">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <Mail className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Beta Signups</p>
                <p className="text-2xl font-bold" data-testid="text-beta-signups">
                  {analytics?.totalBetaSignups || 0}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="dark">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold" data-testid="text-total-sessions">
                  {analytics?.totalSessions || 0}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard variant="dark">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2" data-testid="text-users-chart-title">
                <TrendingUp className="w-5 h-5" />
                New Users (7 Days)
              </h2>
            </div>
            {analytics?.usersByDay && analytics.usersByDay.length > 0 ? (
              <div className="space-y-2" data-testid="chart-users-by-day">
                {analytics.usersByDay.map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between" data-testid={`row-chart-${index}`}>
                    <span className="text-sm text-muted-foreground" data-testid={`text-chart-date-${index}`}>{day.date}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 bg-violet-500 rounded"
                        style={{ width: `${Math.max(20, day.count * 20)}px` }}
                      />
                      <span className="text-sm font-medium w-8" data-testid={`text-chart-count-${index}`}>{day.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No new users in the last 7 days</p>
            )}
          </GlassCard>

          <GlassCard variant="dark">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2" data-testid="text-signups-title">
                <Mail className="w-5 h-5" />
                Recent Beta Signups
              </h2>
              <Badge variant="outline" data-testid="badge-signups-total">{betaSignups?.length || 0} total</Badge>
            </div>
            {analytics?.recentSignups && analytics.recentSignups.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="list-signups">
                {analytics.recentSignups.map((signup) => (
                  <div
                    key={signup.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/30"
                    data-testid={`row-signup-${signup.id}`}
                  >
                    <span className="text-sm" data-testid={`text-signup-email-${signup.id}`}>{signup.email}</span>
                    <span className="text-xs text-muted-foreground" data-testid={`text-signup-date-${signup.id}`}>
                      {new Date(signup.createdAt!).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm" data-testid="text-no-signups">No beta signups yet</p>
            )}
          </GlassCard>
        </div>

        <GlassCard variant="dark">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2" data-testid="text-testimonials-title">
              <Star className="w-5 h-5" />
              Testimonials
            </h2>
            <Button
              size="sm"
              onClick={() => setShowAddTestimonial(!showAddTestimonial)}
              data-testid="button-add-testimonial"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Testimonial
            </Button>
          </div>

          {showAddTestimonial && (
            <form onSubmit={handleAddTestimonial} className="mb-6 p-4 rounded-lg bg-muted/30 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Name"
                  value={newTestimonial.name}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
                  data-testid="input-testimonial-name"
                />
                <Input
                  placeholder="Role (e.g., Student, Professional)"
                  value={newTestimonial.role}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, role: e.target.value })}
                  data-testid="input-testimonial-role"
                />
              </div>
              <Textarea
                placeholder="Testimonial content..."
                value={newTestimonial.content}
                onChange={(e) => setNewTestimonial({ ...newTestimonial, content: e.target.value })}
                data-testid="input-testimonial-content"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Rating:</label>
                    <select
                      value={newTestimonial.rating}
                      onChange={(e) => setNewTestimonial({ ...newTestimonial, rating: Number(e.target.value) })}
                      className="bg-background border rounded px-2 py-1 text-sm"
                      data-testid="select-testimonial-rating"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} star{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newTestimonial.approved}
                      onCheckedChange={(checked) => setNewTestimonial({ ...newTestimonial, approved: checked })}
                      data-testid="switch-testimonial-approved"
                    />
                    <label className="text-sm">Approved</label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddTestimonial(false)}
                    data-testid="button-cancel-testimonial"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTestimonialMutation.isPending}
                    data-testid="button-save-testimonial"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </form>
          )}

          {testimonialsLoading ? (
            <div className="text-center text-muted-foreground" data-testid="text-testimonials-loading">Loading testimonials...</div>
          ) : testimonials && testimonials.length > 0 ? (
            <div className="space-y-4" data-testid="list-testimonials">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="p-4 rounded-lg bg-muted/20 flex items-start justify-between gap-4"
                  data-testid={`row-testimonial-${testimonial.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium" data-testid={`text-testimonial-name-${testimonial.id}`}>{testimonial.name}</span>
                      {testimonial.role && (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-testimonial-role-${testimonial.id}`}>
                          {testimonial.role}
                        </Badge>
                      )}
                      <div className="flex" data-testid={`rating-testimonial-${testimonial.id}`}>
                        {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-testimonial-content-${testimonial.id}`}>{testimonial.content}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        updateTestimonialMutation.mutate({
                          id: testimonial.id,
                          updates: { approved: !testimonial.approved },
                        })
                      }
                      data-testid={`button-toggle-testimonial-${testimonial.id}`}
                    >
                      {testimonial.approved ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTestimonialMutation.mutate(testimonial.id)}
                      data-testid={`button-delete-testimonial-${testimonial.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center" data-testid="text-no-testimonials">No testimonials yet. Add your first one!</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
