export function StatsSection() {
  const stats = [
    { value: "85%", label: "increase in engagement" },
    { value: "3x", label: "faster recognition" },
    { value: "92%", label: "employee satisfaction" },
    { value: "40%", label: "less turnover" },
  ]

  return (
    <section className="py-12 sm:py-16 border-y border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8">
          Trusted by forward-thinking HR teams worldwide
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center space-y-1 sm:space-y-2 p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
