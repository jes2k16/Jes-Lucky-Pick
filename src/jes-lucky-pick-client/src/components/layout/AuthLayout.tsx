import { motion } from "motion/react";
import { NumberBall } from "@/components/shared/NumberBall";

const floatingBalls = [
  { number: 7, x: "10%", y: "15%", size: "lg" as const, opacity: 0.9, duration: 4, delay: 0 },
  { number: 14, x: "75%", y: "10%", size: "md" as const, opacity: 0.3, duration: 5, delay: 1 },
  { number: 21, x: "20%", y: "70%", size: "md" as const, opacity: 0.4, duration: 3.5, delay: 0.5 },
  { number: 33, x: "80%", y: "65%", size: "lg" as const, opacity: 0.9, duration: 4.5, delay: 1.5 },
  { number: 38, x: "50%", y: "25%", size: "sm" as const, opacity: 0.25, duration: 5.5, delay: 0.8 },
  { number: 42, x: "65%", y: "80%", size: "md" as const, opacity: 0.35, duration: 3.8, delay: 2 },
  { number: 3, x: "35%", y: "85%", size: "sm" as const, opacity: 0.2, duration: 4.2, delay: 1.2 },
  { number: 27, x: "85%", y: "40%", size: "sm" as const, opacity: 0.3, duration: 5, delay: 0.3 },
  { number: 19, x: "15%", y: "45%", size: "lg" as const, opacity: 0.9, duration: 3.2, delay: 1.8 },
];

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Left panel — decorative, hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary to-primary/80">
        {/* Floating NumberBalls */}
        {floatingBalls.map((ball) => (
          <motion.div
            key={ball.number}
            className="absolute"
            style={{ left: ball.x, top: ball.y, opacity: ball.opacity }}
            animate={{ y: [0, -20, 0] }}
            transition={{
              duration: ball.duration,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: ball.delay,
            }}
          >
            <NumberBall number={ball.number} size={ball.size} />
          </motion.div>
        ))}

        {/* Branding overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 shadow-lg"
          >
            <span className="text-2xl font-bold text-primary-foreground">JP</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-3xl font-bold text-primary-foreground mb-2"
          >
            Jes Lucky Pick
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-primary-foreground/70 text-sm max-w-xs text-center"
          >
            PCSO 6/42 Lotto Number Predictor powered by statistical analysis
          </motion.p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background p-6">
        {children}
      </div>
    </div>
  );
}
