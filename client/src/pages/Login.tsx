import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Mail, ArrowLeft, AlertCircle } from "lucide-react";
import { SiGoogle, SiApple } from "react-icons/si";

const mirrorLabsLogo = "/images/login-bg.jpg";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const reason = urlParams.get("reason");
    
    if (error === "google_unavailable") {
      const errorMessage = "Google sign-in is not configured yet. Please use email.";
      setGoogleError(errorMessage);
      toast({
        title: "Sign-in unavailable",
        description: errorMessage,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/login");
      return;
    }

    if (error === "google_failed") {
      let errorMessage = "Google sign-in failed. Please try again or use email.";
      if (reason === "no_user") {
        errorMessage = "Could not retrieve your Google account information.";
      } else if (reason === "login_failed") {
        errorMessage = "Failed to complete sign-in. Please try again.";
      } else if (reason) {
        errorMessage = `Google sign-in error: ${decodeURIComponent(reason)}`;
      }
      setGoogleError(errorMessage);
      toast({
        title: "Sign-in failed",
        description: errorMessage,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/login");
    }
  }, [toast]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
      const body = isRegistering
        ? formData
        : { email: formData.email, password: formData.password };

      const res = await apiRequest("POST", endpoint, body);
      const data = await res.json();

      if (data.user) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({
          title: isRegistering ? "Account created!" : "Welcome back!",
          description: "Redirecting to your practice hub...",
        });
        setLocation("/");
      } else if (data.message) {
        toast({
          title: isRegistering ? "Registration failed" : "Login failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link href="/">
            <a className="inline-flex items-center gap-2 mb-6">
              <img
                src="/images/login-bg.jpg"
                alt="Mirror Labs"
                className="w-12 h-12 rounded-lg"
              />
              <span className="text-xl font-semibold">Mirror Play</span>
            </a>
          </Link>
          <h1 className="text-2xl font-bold mb-2">
            {showEmailForm
              ? isRegistering
                ? "Create your account"
                : "Sign in with email"
              : "Welcome"}
          </h1>
          <p className="text-muted-foreground">
            {showEmailForm
              ? isRegistering
                ? "Start your emotional intelligence journey"
                : "Enter your credentials to continue"
              : "Choose how you'd like to sign in"}
          </p>
        </div>

        {googleError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{googleError}</p>
          </div>
        )}

        {!showEmailForm ? (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={handleGoogleLogin}
              data-testid="button-google-login"
            >
              <SiGoogle className="w-5 h-5 mr-3" />
              Continue with Google
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 text-base opacity-50 cursor-not-allowed"
              disabled
              data-testid="button-apple-login"
            >
              <SiApple className="w-5 h-5 mr-3" />
              Continue with Apple
              <span className="ml-2 text-xs text-muted-foreground">(Coming soon)</span>
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full h-12 text-base"
              onClick={() => setShowEmailForm(true)}
              data-testid="button-email-login"
            >
              <Mail className="w-5 h-5 mr-3" />
              Continue with Email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2"
              onClick={() => {
                setShowEmailForm(false);
                setIsRegistering(false);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {isRegistering && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    data-testid="input-last-name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={isRegistering ? "At least 8 characters" : "Your password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={isRegistering ? 8 : undefined}
                data-testid="input-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading}
              data-testid="button-submit-login"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRegistering ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {isRegistering ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setIsRegistering(false)}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setIsRegistering(true)}
                  >
                    Create one
                  </button>
                </>
              )}
            </p>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          By continuing, you agree to our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
