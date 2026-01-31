import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Play,
  Users,
  Star,
  Eye,
  Globe,
  Lock,
  Loader2,
  Lightbulb,
  Briefcase,
  Heart,
  Shield,
  MessageCircle,
  Brain,
  Zap,
  Target,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { CustomScenario, User } from "@shared/schema";

const categories = [
  { value: "workplace", label: "Workplace", icon: Briefcase },
  { value: "relationships", label: "Relationships", icon: Heart },
  { value: "boundaries", label: "Boundaries", icon: Shield },
  { value: "emotional", label: "Emotional", icon: MessageCircle },
  { value: "assertive", label: "Assertive", icon: Zap },
  { value: "mindful", label: "Mindful", icon: Brain },
  { value: "resilience", label: "Resilience", icon: Target },
  { value: "conflict", label: "Conflict", icon: Users },
] as const;

const difficulties = [
  { value: "beginner", label: "Beginner", color: "text-emerald-500 bg-emerald-500/20" },
  { value: "intermediate", label: "Intermediate", color: "text-amber-500 bg-amber-500/20" },
  { value: "advanced", label: "Advanced", color: "text-rose-500 bg-rose-500/20" },
] as const;

const scenarioFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  difficulty: z.string().min(1, "Please select a difficulty"),
  context: z.string().min(20, "Context must be at least 20 characters"),
  prompt: z.string().min(10, "Prompt must be at least 10 characters"),
  sampleResponse: z.string().optional(),
  tips: z.string().optional(),
  isPublic: z.boolean().default(false),
});

type ScenarioFormValues = z.infer<typeof scenarioFormSchema>;

function StarRating({ 
  rating, 
  onRate, 
  readonly = false,
  size = "md"
}: { 
  rating: number; 
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  
  return (
    <div 
      className="flex gap-0.5" 
      onMouseLeave={() => setHoverRating(0)}
      data-testid="star-rating"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn(
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer"
          )}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onClick={() => onRate?.(star)}
          data-testid={`button-star-${star}`}
        >
          <Star
            className={cn(
              iconSize,
              (hoverRating || rating) >= star
                ? "fill-amber-500 text-amber-500"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ScenarioCard({ 
  scenario, 
  creator,
  onEdit,
  onDelete,
  onUse,
  onRate,
  userRating,
  isOwner = false,
}: { 
  scenario: CustomScenario;
  creator?: User;
  onEdit?: () => void;
  onDelete?: () => void;
  onUse?: () => void;
  onRate?: (rating: number) => void;
  userRating?: number;
  isOwner?: boolean;
}) {
  const categoryConfig = categories.find(c => c.value === scenario.category);
  const difficultyConfig = difficulties.find(d => d.value === scenario.difficulty);
  const Icon = categoryConfig?.icon || Briefcase;

  return (
    <GlassCard variant="dark" className="relative overflow-visible">
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
          "bg-muted"
        )}>
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold truncate">{scenario.title}</h3>
            {scenario.isPublic ? (
              <Globe className="w-4 h-4 text-emerald-500" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {scenario.description}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">
              {categoryConfig?.label || scenario.category}
            </Badge>
            {difficultyConfig && (
              <Badge variant="outline" className={difficultyConfig.color}>
                {difficultyConfig.label}
              </Badge>
            )}
            {scenario.usageCount !== null && scenario.usageCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {scenario.usageCount} uses
              </span>
            )}
            {scenario.rating && scenario.ratingCount !== null && scenario.ratingCount > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {scenario.rating.toFixed(1)} ({scenario.ratingCount})
              </span>
            )}
          </div>
          {creator && (
            <p className="text-xs text-muted-foreground mt-2">
              By {creator.firstName || creator.email?.split("@")[0] || "Anonymous"}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-border">
        {!isOwner && onRate && (
          <StarRating 
            rating={userRating || 0} 
            onRate={onRate}
            size="sm"
          />
        )}
        {isOwner && <div />}
        
        <div className="flex items-center gap-2">
          {isOwner && onEdit && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onEdit}
              data-testid={`button-edit-scenario-${scenario.id}`}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {isOwner && onDelete && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onDelete}
              data-testid={`button-delete-scenario-${scenario.id}`}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
          {onUse && (
            <Button 
              size="sm" 
              onClick={onUse}
              data-testid={`button-use-scenario-${scenario.id}`}
            >
              <Play className="w-4 h-4 mr-1" />
              Practice
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export default function ScenarioBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("my-scenarios");
  const [showForm, setShowForm] = useState(false);
  const [editingScenario, setEditingScenario] = useState<CustomScenario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<CustomScenario | null>(null);
  const [communityFilter, setCommunityFilter] = useState<string>("");

  const form = useForm<ScenarioFormValues>({
    resolver: zodResolver(scenarioFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      difficulty: "beginner",
      context: "",
      prompt: "",
      sampleResponse: "",
      tips: "",
      isPublic: false,
    },
  });

  const { data: userScenarios, isLoading: loadingUserScenarios } = useQuery<CustomScenario[]>({
    queryKey: ["/api/scenarios/custom"],
  });

  const { data: communityScenarios, isLoading: loadingCommunity } = useQuery<{ scenario: CustomScenario; creator: User }[]>({
    queryKey: ["/api/scenarios/community", communityFilter],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ScenarioFormValues) => {
      const payload = {
        ...data,
        tips: data.tips ? data.tips.split("\n").filter(t => t.trim()) : null,
      };
      const res = await apiRequest("POST", "/api/scenarios/custom", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenarios/custom"] });
      setShowForm(false);
      form.reset();
      toast({ title: "Scenario created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create scenario", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ScenarioFormValues }) => {
      const payload = {
        ...data,
        tips: data.tips ? data.tips.split("\n").filter(t => t.trim()) : null,
      };
      const res = await apiRequest("PUT", `/api/scenarios/custom/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenarios/custom"] });
      setShowForm(false);
      setEditingScenario(null);
      form.reset();
      toast({ title: "Scenario updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update scenario", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/scenarios/custom/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenarios/custom"] });
      setDeleteDialogOpen(false);
      setScenarioToDelete(null);
      toast({ title: "Scenario deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete scenario", variant: "destructive" });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async ({ scenarioId, rating }: { scenarioId: string; rating: number }) => {
      const res = await apiRequest("POST", `/api/scenarios/custom/${scenarioId}/rate`, { rating });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scenarios/community"] });
      toast({ title: "Rating submitted!" });
    },
  });

  const useMutation2 = useMutation({
    mutationFn: async (scenarioId: string) => {
      await apiRequest("POST", `/api/scenarios/custom/${scenarioId}/use`);
      return scenarioId;
    },
    onSuccess: (scenarioId) => {
      navigate(`/rehearsal/custom/${scenarioId}`);
    },
  });

  const handleSubmit = (data: ScenarioFormValues) => {
    if (editingScenario) {
      updateMutation.mutate({ id: editingScenario.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (scenario: CustomScenario) => {
    setEditingScenario(scenario);
    form.reset({
      title: scenario.title,
      description: scenario.description,
      category: scenario.category,
      difficulty: scenario.difficulty || "beginner",
      context: scenario.context,
      prompt: scenario.prompt,
      sampleResponse: scenario.sampleResponse || "",
      tips: scenario.tips?.join("\n") || "",
      isPublic: scenario.isPublic || false,
    });
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingScenario(null);
    form.reset();
  };

  const handleUseScenario = (scenario: CustomScenario) => {
    useMutation2.mutate(scenario.id);
  };

  const filteredCommunityScenarios = communityFilter
    ? communityScenarios?.filter(s => s.scenario.category === communityFilter)
    : communityScenarios;

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Link to="/scenarios">
          <Button size="icon" variant="ghost" data-testid="button-back-scenarios">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Scenario Builder</h1>
          <p className="text-muted-foreground">Create and share practice scenarios</p>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-scenarios" data-testid="tab-my-scenarios">
            My Scenarios
          </TabsTrigger>
          <TabsTrigger value="community" data-testid="tab-community">
            Community
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-scenarios" className="space-y-4 mt-4">
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GlassCard variant="dark">
                  <h2 className="text-lg font-semibold mb-4">
                    {editingScenario ? "Edit Scenario" : "Create New Scenario"}
                  </h2>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Asking for a Raise" 
                                {...field}
                                data-testid="input-scenario-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of the scenario" 
                                {...field}
                                data-testid="input-scenario-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-category">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="difficulty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Difficulty</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-difficulty">
                                    <SelectValue placeholder="Select difficulty" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {difficulties.map((diff) => (
                                    <SelectItem key={diff.value} value={diff.value}>
                                      {diff.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="context"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Situation Context</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the situation setup. What's happening? Who is involved?" 
                                className="min-h-[100px]"
                                {...field}
                                data-testid="input-scenario-context"
                              />
                            </FormControl>
                            <FormDescription>
                              This sets the scene for the practice conversation.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="prompt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Opening Prompt</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="What the other person says to start the conversation" 
                                {...field}
                                data-testid="input-scenario-prompt"
                              />
                            </FormControl>
                            <FormDescription>
                              The first message the user needs to respond to.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sampleResponse"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sample Response (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="An example of a good response" 
                                {...field}
                                data-testid="input-scenario-sample"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tips"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tips (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter tips, one per line" 
                                {...field}
                                data-testid="input-scenario-tips"
                              />
                            </FormControl>
                            <FormDescription>
                              Helpful tips for responding, one per line.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isPublic"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Share with Community</FormLabel>
                              <FormDescription>
                                Allow other users to practice with this scenario
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-is-public"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCancelForm}
                          className="flex-1"
                          data-testid="button-cancel-form"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={createMutation.isPending || updateMutation.isPending}
                          data-testid="button-submit-scenario"
                        >
                          {(createMutation.isPending || updateMutation.isPending) && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          {editingScenario ? "Update" : "Create"} Scenario
                        </Button>
                      </div>
                    </form>
                  </Form>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <Button 
                  onClick={() => setShowForm(true)}
                  className="w-full"
                  data-testid="button-create-scenario"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Scenario
                </Button>

                {loadingUserScenarios ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : userScenarios && userScenarios.length > 0 ? (
                  <div className="space-y-3">
                    {userScenarios.map((scenario) => (
                      <ScenarioCard
                        key={scenario.id}
                        scenario={scenario}
                        isOwner
                        onEdit={() => handleEdit(scenario)}
                        onDelete={() => {
                          setScenarioToDelete(scenario);
                          setDeleteDialogOpen(true);
                        }}
                        onUse={() => handleUseScenario(scenario)}
                      />
                    ))}
                  </div>
                ) : (
                  <GlassCard variant="dark" className="text-center py-8">
                    <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Scenarios Yet</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Create your first custom practice scenario
                    </p>
                  </GlassCard>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="community" className="space-y-4 mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hidden">
            <Button
              variant={communityFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setCommunityFilter("")}
              data-testid="button-filter-all"
            >
              All
            </Button>
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.value}
                  variant={communityFilter === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCommunityFilter(cat.value)}
                  className="shrink-0"
                  data-testid={`button-filter-${cat.value}`}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {cat.label}
                </Button>
              );
            })}
          </div>

          {loadingCommunity ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCommunityScenarios && filteredCommunityScenarios.length > 0 ? (
            <div className="space-y-3">
              {filteredCommunityScenarios.map(({ scenario, creator }) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  creator={creator}
                  onUse={() => handleUseScenario(scenario)}
                  onRate={(rating) => rateMutation.mutate({ scenarioId: scenario.id, rating })}
                />
              ))}
            </div>
          ) : (
            <GlassCard variant="dark" className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Community Scenarios</h3>
              <p className="text-muted-foreground text-sm">
                {communityFilter 
                  ? "No scenarios found in this category" 
                  : "Be the first to share a scenario with the community!"}
              </p>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scenario</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{scenarioToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => scenarioToDelete && deleteMutation.mutate(scenarioToDelete.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
