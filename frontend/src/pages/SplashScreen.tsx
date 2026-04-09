import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'

export default function SplashScreen() {
  const navigate = useNavigate()
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    setOpacity(1)
    const timer = setTimeout(() => {
      navigate('/login')
    }, 2500)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-background transition-opacity duration-500"
      style={{ opacity }}
    >
      {/* Pulse Rings */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="pulse-ring w-32 h-32 absolute" style={{ animationDelay: '0s' }} />
        <div className="pulse-ring w-44 h-44 absolute" style={{ animationDelay: '0.5s' }} />
        <div className="pulse-ring w-56 h-56 absolute" style={{ animationDelay: '1s' }} />

        {/* Shield Icon */}
        <div className="relative z-10 w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center animate-pulse-ring">
          <Shield className="w-14 h-14 text-accent" />
        </div>
      </div>

      {/* App Name */}
      <h1 className="text-4xl font-bold text-white mb-2 tracking-wider">
        WATCH GUARD
      </h1>

      {/* Tagline */}
      <p className="text-text-secondary text-lg mb-8">
        Smart Face Recognition Security System
      </p>

      {/* Loading indicator */}
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-accent animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  )
}
