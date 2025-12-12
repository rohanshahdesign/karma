import { Button } from "@/components/ui/button"
import { ArrowRight, Slack } from "lucide-react"

export function HeroSection() {
  return (
    <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-medium">
              <Slack className="w-4 h-4" />
              <span>Native Slack Integration</span>
              <ArrowRight className="w-4 h-4" />
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight text-balance">
              Build a culture of
              <span className="block text-accent"> recognition</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Claimsy is where teams give karma, celebrate wins, and redeem rewards — all with simple workflows that
              drive engagement.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-6 sm:px-8"
              >
              Get started — it&apos;s free
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto group bg-transparent">
                Explore features
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          <div className="relative mt-8 lg:mt-0">
            <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/50" />
                <div className="w-3 h-3 rounded-full bg-chart-4/50" />
                <div className="w-3 h-3 rounded-full bg-chart-2/50" />
              </div>
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/30 rounded-xl">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-base sm:text-lg">✨</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      <span className="text-accent">@sarah</span> sent 10 karma to{" "}
                      <span className="text-accent">@mike</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">For helping with the product launch</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/30 rounded-xl">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-chart-2/20 flex items-center justify-center shrink-0">
                    <span className="text-base sm:text-lg">🏆</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      <span className="text-accent">@alex</span> redeemed &quot;Coffee Day&quot;
                    </p>
                    <p className="text-xs text-muted-foreground">50 karma • Approved</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/30 rounded-xl">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-chart-4/20 flex items-center justify-center shrink-0">
                    <span className="text-base sm:text-lg">📊</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground">Weekly Leaderboard Updated</p>
                    <p className="text-xs text-muted-foreground">@jessica leads with 145 karma</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
            <div className="absolute -top-4 -left-4 w-32 h-32 bg-chart-2/20 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
