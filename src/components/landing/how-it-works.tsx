import { MessageSquare, Sparkles, Gift, TrendingUp } from "lucide-react"

export function HowItWorks() {
  const steps = [
    {
      icon: MessageSquare,
      step: "01",
      title: "Connect to Slack",
      description: "Install Claimsy in your workspace with one click.",
    },
    {
      icon: Sparkles,
      step: "02",
      title: "Send Karma",
      description: "Type /karma @teammate 10 — recognition flows naturally.",
    },
    {
      icon: Gift,
      step: "03",
      title: "Redeem Rewards",
      description: "Exchange karma for curated perks set by admins.",
    },
    {
      icon: TrendingUp,
      step: "04",
      title: "Track Impact",
      description: "Monitor engagement through leaderboards and analytics.",
    },
  ]

  return (
    <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-16 space-y-3 sm:space-y-4 px-2">
          <p className="text-sm font-medium text-accent uppercase tracking-wider">How it works</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground text-balance">
            From Slack command to team motivation
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((item, index) => (
            <div key={index} className="relative">
              <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm">
                    <item.icon className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
              {index < steps.length - 1 && index !== 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(100%-1rem)] w-8 border-t-2 border-dashed border-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
