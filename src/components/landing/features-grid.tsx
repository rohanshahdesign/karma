import { Gift, Users, History, BarChart3, Shield, Zap } from "lucide-react"

export function FeaturesGrid() {
  const features = [
    {
      icon: Zap,
      title: "Instant Karma Transfers",
      description:
        "Send karma with a simple /karma command in Slack. Recognition happens in seconds, right where your team already works.",
    },
    {
      icon: Gift,
      title: "Rewards Marketplace",
      description:
        "Admins curate desirable rewards. Team members redeem karma for perks with built-in approval workflows.",
    },
    {
      icon: History,
      title: "Public Ledger",
      description:
        "Complete transparency with a real-time activity feed. Every karma transaction visible to the entire workspace.",
    },
    {
      icon: Users,
      title: "User Profiles",
      description: "Personal karma dashboards track accumulation, badges earned, and recognition history over time.",
    },
    {
      icon: BarChart3,
      title: "Leaderboards",
      description:
        "Foster healthy competition with team and individual rankings. Filter by time period for fresh engagement.",
    },
    {
      icon: Shield,
      title: "Admin Controls",
      description: "Manage quotas, roles, and workspace settings. Full control with comprehensive transaction history.",
    },
  ]

  return (
    <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-16 space-y-3 sm:space-y-4 px-2">
          <p className="text-sm font-medium text-accent uppercase tracking-wider">What you get</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground text-balance">
            Simple building blocks for a healthy recognition habit
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-5 sm:p-6 rounded-2xl bg-card border border-border hover:border-accent/50 hover:shadow-lg transition-all"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
