import { Header } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { StatsSection } from "@/components/landing/stats-section"
import { FeaturesGrid } from "@/components/landing/features-grid"
import { HowItWorks } from "@/components/landing/how-it-works"
import { ValueProps } from "@/components/landing/value-props"
import { LeaderboardPreview } from "@/components/landing/leaderboard-preview"
import { CTASection } from "@/components/landing/cta-section"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <StatsSection />
      <FeaturesGrid />
      <HowItWorks />
      <ValueProps />
      <LeaderboardPreview />
      <CTASection />
      <Footer />
    </main>
  )
}
