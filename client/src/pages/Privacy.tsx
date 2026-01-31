import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" data-testid="link-privacy-back-home">
            <Button variant="ghost" size="sm" data-testid="button-privacy-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Mirror Labs</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Privacy Policy</h1>
                <p className="text-muted-foreground">Last updated: January 2026</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="prose prose-invert max-w-none"
          >
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold mb-4">Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Mirror Labs ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use Mirror Play and related services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Information We Collect</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Account Information</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      When you create an account, we collect your email address and display name. We use secure authentication through Replit's identity service.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Voice Data</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      When you use voice features, your audio is processed to provide feedback on tone and communication patterns. Voice recordings are processed in real-time and are not permanently stored unless you explicitly save a session.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Usage Data</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      We collect information about how you use the app, including practice sessions completed, progress metrics, and feature interactions. This helps us improve the product and personalize your experience.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">How We Use Your Information</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>To provide and maintain our services</li>
                  <li>To personalize your experience and provide relevant feedback</li>
                  <li>To track your progress and improvement over time</li>
                  <li>To communicate with you about updates and new features</li>
                  <li>To improve our AI models and service quality</li>
                  <li>To process payments and manage subscriptions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational security measures to protect your personal information. This includes encryption in transit and at rest, secure authentication, and regular security assessments.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Third-Party Services</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We use the following third-party services to provide our product:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li><strong>OpenAI</strong> - For AI-powered conversation and feedback analysis</li>
                  <li><strong>ElevenLabs</strong> - For text-to-speech voice synthesis</li>
                  <li><strong>Stripe</strong> - For payment processing</li>
                  <li><strong>Replit</strong> - For hosting and authentication</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Each of these services has their own privacy policies that govern their use of your data.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Your Rights</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Access and receive a copy of your personal data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Opt out of marketing communications</li>
                  <li>Export your data in a portable format</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Data Retention</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your personal information for as long as your account is active or as needed to provide you services. You can request deletion of your account and associated data at any time by contacting us.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Mirror Play is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Changes to This Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <p className="text-foreground mt-2">
                  <strong>Email:</strong> privacy@mirrorlabs.ai
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
