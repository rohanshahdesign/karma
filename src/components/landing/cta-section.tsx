import { Button } from "@/components/ui/button"
import { ArrowRight, Slack } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-primary rounded-2xl sm:rounded-3xl px-6 py-12 sm:px-12 sm:py-16 relative overflow-hidden">
          <div className="relative z-10 space-y-4 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-foreground text-balance">
              Ready to build a culture of recognition?
            </h2>
            <p className="text-sm sm:text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Join thousands of teams using Claimsy to boost engagement and celebrate wins.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 px-6 sm:px-8"
              >
                <Slack className="w-5 h-5 mr-2" />
                Add to Slack
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                Schedule a demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-primary-foreground/60">
              Free for teams up to 10 • No credit card required
            </p>
          </div>

          <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 sm:w-48 h-32 sm:h-48 bg-primary-foreground/5 rounded-full blur-2xl" />
        </div>
      </div>
    </section>
  )
}
