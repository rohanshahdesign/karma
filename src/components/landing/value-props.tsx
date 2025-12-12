import { Heart, Trophy, Eye, Rocket } from "lucide-react"

export function ValueProps() {
  const values = [
    {
      icon: Heart,
      title: "Boost Motivation",
      description:
        "Regular recognition drives engagement. Teams report significantly higher morale and job satisfaction.",
      metric: "+85%",
    },
    {
      icon: Trophy,
      title: "Desirable Rewards",
      description: "Let employees choose perks that matter. From coffee days to extra PTO, rewards that motivate.",
      metric: "50+",
    },
    {
      icon: Eye,
      title: "Full Transparency",
      description: "Public ledger ensures fairness. Every transaction is visible, building trust across your org.",
      metric: "100%",
    },
    {
      icon: Rocket,
      title: "Effortless",
      description: "One Slack command does it all. No context switching, no new apps. Recognition where work happens.",
      metric: "< 5s",
    },
  ]

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-16 space-y-3 sm:space-y-4 px-2">
          <p className="text-sm font-medium text-accent uppercase tracking-wider">Why Claimsy</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground text-balance">
            Recognition that actually works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {values.map((value, index) => (
            <div
              key={index}
              className="flex gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow"
            >
              <div className="shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-accent/10 flex items-center justify-center">
                  <value.icon className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">{value.title}</h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent rounded-full">
                    {value.metric}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
