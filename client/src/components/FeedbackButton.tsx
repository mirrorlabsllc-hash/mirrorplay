import { useState } from "react";
import { MessageCircle, X, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const feedbackFormSchema = z.object({
  category: z.enum(["bug", "feature", "improvement", "other"], {
    required_error: "Please select a category",
  }),
  message: z.string().min(1, "Please enter your feedback"),
  rating: z.number().min(1).max(5).nullable().optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "Report a Bug" },
  { value: "feature", label: "Feature Request" },
  { value: "improvement", label: "Improvement Idea" },
  { value: "other", label: "Other Feedback" },
] as const;

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const { toast } = useToast();
  const [location] = useLocation();

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      category: undefined,
      message: "",
      rating: null,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FeedbackFormValues & { page?: string }) => {
      return apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      toast({
        title: "Thanks for your feedback!",
        description: "We appreciate you helping us improve.",
      });
      setIsOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Failed to submit feedback",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FeedbackFormValues) => {
    submitMutation.mutate({
      ...values,
      page: location,
    });
  };

  const currentRating = form.watch("rating");

  return (
    <>
      <Button
        data-testid="button-feedback-open"
        onClick={() => setIsOpen(true)}
        size="default"
        className="fixed bottom-20 right-4 z-50 rounded-full shadow-lg md:bottom-6"
        variant="default"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Send Feedback</h2>
              <Button
                data-testid="button-feedback-close"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-feedback-category">
                            <SelectValue placeholder="What type of feedback?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FEEDBACK_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
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
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Feedback</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-feedback-message"
                          placeholder="Tell us what's on your mind..."
                          rows={4}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How's your experience? (optional)</FormLabel>
                      <FormControl>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              data-testid={`button-rating-${star}`}
                              onClick={() => field.onChange(star)}
                              onMouseEnter={() => setHoveredRating(star)}
                              onMouseLeave={() => setHoveredRating(null)}
                              className="p-1"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  (hoveredRating !== null ? star <= hoveredRating : star <= (currentRating || 0))
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  data-testid="button-feedback-submit"
                  disabled={submitMutation.isPending}
                  className="w-full"
                >
                  {submitMutation.isPending ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      )}
    </>
  );
}
