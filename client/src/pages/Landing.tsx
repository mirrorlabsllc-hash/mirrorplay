import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Testimonial } from "@shared/schema";
import { ThemeToggleSimple } from "@/components/ThemeToggle";
import mirrorLabsLogo from "@assets/unnamed_1769507171068.jpg";
import { 
  Sparkles,
  Brain,
  Heart,
  MessageCircle,
  Target,
  Users,
  Shield,
  Lightbulb,
  TrendingUp,
  ArrowRight,
  Check,
  Loader2,
  Mail,
  Building2,
  GraduationCap,
  Briefcase,
  HeartHandshake,
  Star,
  Quote
} from "lucide-react";

export default function Landing() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [customDonation, setCustomDonation] = useState("");

  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
  });

  const betaSignupMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/beta-signup", { email });
      return res.json();
    },
    onSuccess: () => {
      setEmail("");
      toast({
        title: "You're on the list!",
        description: "We'll reach out when Mirror Play is ready for you.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleBetaSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      betaSignupMutation.mutate(email.trim());
    }
  };

  const handleDonate = async (amount: number) => {
    try {
      const res = await apiRequest("POST", "/api/donate", { amount });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.message) {
        toast({
          title: "Unable to process donation",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const message = error?.message || "Please try again later";
      toast({
        title: "Unable to process donation",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={mirrorLabsLogo} alt="Mirror Labs" className="w-8 h-8 rounded-md object-cover" />
            <span className="font-semibold text-lg">Mirror Labs</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#about" className="text-muted-foreground transition-colors" data-testid="link-nav-about">About</a>
            <a href="#how-it-works" className="text-muted-foreground transition-colors" data-testid="link-nav-how">How It Works</a>
            <a href="#mission" className="text-muted-foreground transition-colors" data-testid="link-nav-mission">Mission</a>
            <Link href="/faq" className="text-muted-foreground transition-colors" data-testid="link-nav-faq">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggleSimple />
            <a href="/login" data-testid="link-nav-login">
              <Button size="sm" data-testid="button-nav-login">
                Sign In
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-24 pt-32 text-center">
        <motion.h1 
          className="text-4xl md:text-6xl font-bold mb-6 max-w-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Building the Future of{" "}
          <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
            Emotional Intelligence
          </span>
        </motion.h1>

        <motion.p 
          className="text-xl text-muted-foreground mb-8 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Mirror Labs develops AI-powered tools that help people practice and improve their communication skills through voice-first, judgment-free interactions.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <a href="/login" data-testid="link-hero-login">
            <Button size="lg" data-testid="button-try-app">
              <Sparkles className="w-5 h-5 mr-2" />
              Try Mirror Play
            </Button>
          </a>
          <a href="#about" data-testid="link-learn-more">
            <Button size="lg" variant="outline" data-testid="button-learn-more">
              Learn More
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </a>
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="px-6 py-24 bg-gradient-to-b from-transparent via-muted/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">About Mirror Labs</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Communication Skills for the Modern World
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We believe everyone deserves access to tools that help them communicate with confidence, empathy, and clarity. Mirror Labs creates technology that makes emotional intelligence practice accessible, private, and effective.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Safe & Private",
                description: "Practice without judgment. Your conversations stay private, and our AI is designed to support—never criticize."
              },
              {
                icon: Brain,
                title: "Science-Backed",
                description: "Built on research in emotional intelligence, communication psychology, and voice analysis technology."
              },
              {
                icon: Heart,
                title: "Human-Centered",
                description: "Technology that adapts to you. Our AI learns your patterns and provides personalized feedback for real growth."
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard variant="dark" className="h-full">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Mirror Play</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Mirror Play is our flagship product—a voice-first app for practicing difficult conversations and building emotional awareness.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: MessageCircle,
                title: "Speak Naturally",
                description: "Use your voice. No typing required. The AI listens and responds like a real conversation partner."
              },
              {
                step: "02",
                icon: Target,
                title: "Get Feedback",
                description: "Receive instant analysis on your tone, pacing, and emotional impact—without judgment."
              },
              {
                step: "03",
                icon: TrendingUp,
                title: "Track Growth",
                description: "See your progress over time. Celebrate improvements and identify areas to practice."
              },
              {
                step: "04",
                icon: Lightbulb,
                title: "Build Skills",
                description: "Apply what you learn to real-life conversations with greater confidence."
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard variant="dark" className="h-full relative">
                  <span className="absolute top-4 right-4 text-4xl font-bold text-muted/20">{item.step}</span>
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="px-6 py-24 bg-gradient-to-b from-transparent via-muted/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Use Cases</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Who Benefits from Mirror Play
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: GraduationCap,
                title: "Students",
                description: "Build communication skills for interviews, presentations, and social situations."
              },
              {
                icon: HeartHandshake,
                title: "Relationships",
                description: "Practice having important conversations with partners, family, and friends."
              },
              {
                icon: Users,
                title: "Personal Growth",
                description: "Develop emotional awareness and communication skills for everyday life."
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard variant="dark" className="h-full text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ready to Start CTA */}
      <section className="px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Begin building your emotional intelligence today.
          </p>
          <a href="/login" data-testid="link-footer-login">
            <Button size="lg" data-testid="button-start-journey">
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </a>
        </motion.div>
      </section>

      {/* Support Section - Final CTA before footer */}
      <section id="support" className="px-6 py-24">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard variant="dark" className="text-center">
              <Heart className="w-12 h-12 text-pink-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-3">Support Our Mission</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Mirror Labs is building technology to help people communicate better. Your contribution directly supports development and helps us reach more people.
              </p>
              
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                {[5, 10, 25].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => handleDonate(amount)}
                    data-testid={`button-donate-${amount}`}
                  >
                    ${amount}
                  </Button>
                ))}
                <Button
                  variant="secondary"
                  onClick={() => handleDonate(50)}
                  data-testid="button-donate-50"
                >
                  $50
                  <Sparkles className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Custom"
                    value={customDonation}
                    onChange={(e) => setCustomDonation(e.target.value)}
                    className="pl-7 text-center"
                    data-testid="input-custom-donation"
                  />
                </div>
                <Button
                  variant="default"
                  onClick={() => {
                    const amount = parseInt(customDonation);
                    if (amount && amount >= 1) {
                      handleDonate(amount);
                    } else {
                      toast({
                        title: "Invalid amount",
                        description: "Please enter an amount of at least $1",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!customDonation || parseInt(customDonation) < 1}
                  data-testid="button-donate-custom"
                >
                  Donate
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mt-6">
                One-time contribution. Processed securely via Stripe.
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src={mirrorLabsLogo} alt="Mirror Labs" className="w-8 h-8 rounded-md object-cover" />
              <span className="font-semibold">Mirror Labs</span>
            </div>
            
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/faq" className="text-muted-foreground transition-colors" data-testid="link-footer-faq">
                FAQ
              </Link>
              <Link href="/privacy" className="text-muted-foreground transition-colors" data-testid="link-footer-privacy">
                Privacy Policy
              </Link>
              <a href="mailto:contact@mirrorlabs.ai" className="text-muted-foreground transition-colors" data-testid="link-footer-contact">
                Contact
              </a>
            </nav>
            
            <p className="text-sm text-muted-foreground">
              © 2026 Mirror Labs. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
