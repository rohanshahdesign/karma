import { Crown, TrendingUp, Medal } from "lucide-react"

export function LeaderboardPreview() {
  const leaders = [
    { rank: 1, name: "Jessica Chen", role: "Product Manager", karma: 2847, trend: "+234", avatar: "JC" },
    { rank: 2, name: "Marcus Johnson", role: "Senior Engineer", karma: 2651, trend: "+189", avatar: "MJ" },
    { rank: 3, name: "Aisha Patel", role: "Designer", karma: 2498, trend: "+156", avatar: "AP" },
    { rank: 4, name: "David Kim", role: "Developer", karma: 2234, trend: "+143", avatar: "DK" },
    { rank: 5, name: "Emma Wilson", role: "Marketing Lead", karma: 2102, trend: "+98", avatar: "EW" },
  ]

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-4 sm:space-y-6 text-center lg:text-left">
            <p className="text-sm font-medium text-accent uppercase tracking-wider">Leaderboards</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground text-balance">
              Foster healthy competition
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
              Real-time leaderboards showcase top contributors and inspire friendly competition. Filter by team or time
              period.
            </p>
            <ul className="space-y-2 sm:space-y-3 text-left max-w-sm mx-auto lg:mx-0">
              <li className="flex items-center gap-3 text-xs sm:text-sm text-foreground">
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
                Weekly, monthly, and all-time rankings
              </li>
              <li className="flex items-center gap-3 text-xs sm:text-sm text-foreground">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
                Track karma given and received
              </li>
              <li className="flex items-center gap-3 text-xs sm:text-sm text-foreground">
                <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
                Celebrate top performers automatically
              </li>
            </ul>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">Top Contributors</h3>
              <span className="text-xs text-muted-foreground shrink-0">Updated 2m ago</span>
            </div>
            <div className="divide-y divide-border">
              {leaders.map((leader) => (
                <div
                  key={leader.rank}
                  className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 hover:bg-muted/50 transition-colors"
                >
                  <span
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
                      leader.rank === 1
                        ? "bg-chart-4/20 text-chart-4"
                        : leader.rank === 2
                          ? "bg-muted text-muted-foreground"
                          : leader.rank === 3
                            ? "bg-accent/20 text-accent"
                            : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {leader.rank}
                  </span>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm font-medium text-primary shrink-0">
                    {leader.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{leader.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{leader.role}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">{leader.karma.toLocaleString()}</p>
                    <p className="text-xs text-chart-2 flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {leader.trend}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
