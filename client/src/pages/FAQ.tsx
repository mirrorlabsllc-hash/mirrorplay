import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { 
  ArrowLeft, 
  Sparkles, 
  HelpCircle,
  ChevronDown
} from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: "General",
    question: "What is Mirror Play?",
    answer: "Mirror Play is a voice-first app for practicing emotional intelligence and communication skills. You speak naturally, and our AI provides real-time feedback on your tone, pacing, and emotional expression—all without judgment."
  },
  {
    category: "General",
    question: "Who is Mirror Labs?",
    answer: "Mirror Labs is the company behind Mirror Play. We're building AI-powered tools to help people communicate more effectively. Our mission is to make emotional intelligence training accessible to everyone."
  },
  {
    category: "General",
    question: "Is Mirror Play a therapy app?",
    answer: "No. Mirror Play is an educational and practice tool for communication skills. It is not a substitute for professional mental health services. If you need therapeutic support, please consult a licensed mental health professional."
  },
  {
    category: "How It Works",
    question: "How does the voice analysis work?",
    answer: "When you speak, our AI analyzes your voice for tone, pacing, emotional intensity, and communication patterns. We use advanced speech processing technology to provide helpful feedback without recording or storing your raw audio permanently."
  },
  {
    category: "How It Works",
    question: "Do I need any special equipment?",
    answer: "Just a device with a microphone—your smartphone, tablet, or computer works perfectly. For the best experience, use headphones in a quiet environment."
  },
  {
    category: "How It Works",
    question: "Can I practice specific scenarios?",
    answer: "Yes! Mirror Play includes over 150 practice scenarios covering workplace conversations, relationships, personal growth, and more. You can also create your own custom scenarios."
  },
  {
    category: "Privacy & Security",
    question: "Is my voice data stored?",
    answer: "Voice recordings are processed in real-time and are not permanently stored. Only the analysis results and feedback are saved to track your progress. You can delete your data at any time."
  },
  {
    category: "Privacy & Security",
    question: "Who can see my practice sessions?",
    answer: "Your practice sessions are private by default. Only you can see your history, scores, and progress. You control what, if anything, you choose to share."
  },
  {
    category: "Privacy & Security",
    question: "How is my data protected?",
    answer: "We use industry-standard encryption for data in transit and at rest. We partner with trusted providers like Stripe for payments and follow security best practices throughout our platform."
  },
  {
    category: "Pricing",
    question: "Is Mirror Play free?",
    answer: "Mirror Play offers a free tier with one practice session per day. Paid plans (Mirror Play+ and Pro Mind) offer unlimited practice, deeper insights, and additional features like voice cloning."
  },
  {
    category: "Pricing",
    question: "What's included in Mirror Play+?",
    answer: "Mirror Play+ ($4.99/month) includes unlimited daily practice sessions, detailed tone analysis, full access to Story Mode, and comprehensive progress tracking."
  },
  {
    category: "Pricing",
    question: "What's included in Pro Mind?",
    answer: "Pro Mind ($9.99/month) includes everything in Mirror Play+ plus voice cloning (practice with your own AI voice), all cosmetic items, and enhanced gamification features."
  },
  {
    category: "Pricing",
    question: "Can I cancel my subscription?",
    answer: "Yes, you can cancel anytime. Your subscription will remain active until the end of your billing period, and you'll retain access to all features until then."
  },
  {
    category: "Support",
    question: "How do I get help if I have issues?",
    answer: "You can reach our support team at support@mirrorlabs.ai. We typically respond within 24-48 hours."
  },
  {
    category: "Support",
    question: "Can organizations use Mirror Play?",
    answer: "Yes! We're exploring partnerships with schools, healthcare providers, and businesses. If you're interested in bringing Mirror Play to your organization, contact us at partnerships@mirrorlabs.ai."
  }
];

function FAQAccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-start justify-between text-left hover-elevate rounded-lg px-2 -mx-2"
        data-testid={`faq-toggle-${item.question.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`}
      >
        <span className="font-medium pr-4">{item.question}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="pb-5 px-2 -mx-2"
        >
          <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
        </motion.div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));

  const toggleItem = (index: number) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenItems(newOpen);
  };

  const categories = Array.from(new Set(faqData.map(item => item.category)));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" data-testid="link-faq-back-home">
            <Button variant="ghost" size="sm" data-testid="button-faq-back">
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
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about Mirror Play and Mirror Labs.
            </p>
          </motion.div>

          <div className="space-y-8">
            {categories.map((category, categoryIndex) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
              >
                <GlassCard variant="dark">
                  <h2 className="text-lg font-semibold mb-4 text-primary">{category}</h2>
                  <div>
                    {faqData
                      .filter(item => item.category === category)
                      .map((item, itemIndex) => {
                        const globalIndex = faqData.findIndex(
                          faq => faq.question === item.question
                        );
                        return (
                          <FAQAccordionItem
                            key={item.question}
                            item={item}
                            isOpen={openItems.has(globalIndex)}
                            onToggle={() => toggleItem(globalIndex)}
                          />
                        );
                      })}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Still Have Questions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center"
          >
            <GlassCard variant="glow" className="max-w-xl mx-auto">
              <h3 className="text-xl font-semibold mb-3">Still Have Questions?</h3>
              <p className="text-muted-foreground mb-6">
                We're here to help. Reach out and we'll get back to you as soon as possible.
              </p>
              <a href="mailto:support@mirrorlabs.ai">
                <Button data-testid="button-contact-support">
                  Contact Support
                </Button>
              </a>
            </GlassCard>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
