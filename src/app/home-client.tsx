'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionTemplate
} from 'framer-motion'

interface HomeClientProps {
  user: User | null
}

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><'

// 1. ScrambleIn component
interface ScrambleInProps {
  text: string
  delay: number
  triggered: boolean
}

export function ScrambleIn({ text, delay, triggered }: ScrambleInProps) {
  const [displayText, setDisplayText] = useState('')
  const [isStarted, setIsStarted] = useState(false)

  useEffect(() => {
    if (!triggered) {
      setDisplayText('')
      return
    }

    const startTimeout = setTimeout(() => {
      setIsStarted(true)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [triggered, delay])

  useEffect(() => {
    if (!isStarted) return

    let frame = 0
    const charsPerFrame = 0.5
    const totalLength = text.length

    const interval = setInterval(() => {
      frame++
      const revealIndex = Math.floor(frame * charsPerFrame)

      if (revealIndex >= totalLength) {
        setDisplayText(text)
        clearInterval(interval)
        return
      }

      let result = ''
      for (let i = 0; i < totalLength; i++) {
        if (text[i] === ' ') {
          result += ' '
          continue
        }

        if (i < revealIndex) {
          result += text[i]
        } else if (i < revealIndex + 3) {
          result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        } else {
          // empty
        }
      }
      setDisplayText(result)
    }, 25)

    return () => clearInterval(interval)
  }, [isStarted, text])

  if (!triggered) {
    return <span>&nbsp;</span>
  }

  return <span>{displayText || '\u00A0'}</span>
}

// 2. ScrambleText component
interface ScrambleTextProps {
  text: string
  isHovered: boolean
  className?: string
}

export function ScrambleText({ text, isHovered, className }: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState(text)

  useEffect(() => {
    if (!isHovered) {
      setDisplayText(text)
      return
    }

    let frame = 0
    const framesPerChar = 4
    const totalLength = text.length

    const interval = setInterval(() => {
      frame++
      const revealIndex = Math.floor(frame / framesPerChar)

      if (revealIndex >= totalLength) {
        setDisplayText(text)
        clearInterval(interval)
        return
      }

      let result = ''
      for (let i = 0; i < totalLength; i++) {
        if (text[i] === ' ') {
          result += ' '
          continue
        }

        if (i < revealIndex) {
          result += text[i]
        } else {
          result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        }
      }
      setDisplayText(result)
    }, 25)

    return () => clearInterval(interval)
  }, [isHovered, text])

  return <span className={className}>{displayText}</span>
}

// 3. Custom SVG Logo component
interface LogoProps {
  className?: string
}

export function SynapseXLogo({ className }: LogoProps) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} fill="currentColor">
      <path d="M 1.5,23 L 1.5,33 C 1.5,38.5 6,43 11.5,43 L 16.5,43 C 22,43 26.5,38.5 26.5,33 Q 28,28 33,26.5 C 38.5,26.5 43,22 43,16.5 L 43,11.5 C 43,6 38.5,1.5 33,1.5 L 23,1.5 Q 12,12 1.5,23 Z" />
      <path d="M 1.5,23 L 1.5,33 C 1.5,38.5 6,43 11.5,43 L 16.5,43 C 22,43 26.5,38.5 26.5,33 Q 28,28 33,26.5 C 38.5,26.5 43,22 43,16.5 L 43,11.5 C 43,6 38.5,1.5 33,1.5 L 23,1.5 Q 12,12 1.5,23 Z" transform="rotate(90)" />
      <path d="M 1.5,23 L 1.5,33 C 1.5,38.5 6,43 11.5,43 L 16.5,43 C 22,43 26.5,38.5 26.5,33 Q 28,28 33,26.5 C 38.5,26.5 43,22 43,16.5 L 43,11.5 C 43,6 38.5,1.5 33,1.5 L 23,1.5 Q 12,12 1.5,23 Z" transform="rotate(180)" />
      <path d="M 1.5,23 L 1.5,33 C 1.5,38.5 6,43 11.5,43 L 16.5,43 C 22,43 26.5,38.5 26.5,33 Q 28,28 33,26.5 C 38.5,26.5 43,22 43,16.5 L 43,11.5 C 43,6 38.5,1.5 33,1.5 L 23,1.5 Q 12,12 1.5,23 Z" transform="rotate(270)" />
    </svg>
  )
}

// 4. SquashHamburger component
interface HamburgerProps {
  isOpen: boolean
  onClick: () => void
}

export function SquashHamburger({ isOpen, onClick }: HamburgerProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col justify-center items-center focus:outline-none cursor-pointer w-[15px] h-[10px] sm:w-[18px] sm:h-[12px]"
      aria-label="Toggle menu"
    >
      <motion.span
        animate={isOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="absolute w-full bg-white h-[1.2px] sm:h-[1.5px]"
      />
      <motion.span
        animate={isOpen ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="absolute w-full bg-white h-[1.2px] sm:h-[1.5px]"
      />
      <motion.span
        animate={isOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="absolute w-full bg-white h-[1.2px] sm:h-[1.5px]"
      />
    </button>
  )
}

export function HomeClient({ user }: HomeClientProps) {
  const [entranceComplete, setEntranceComplete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const [hoveredDl, setHoveredDl] = useState(false)

  // References for mouse scrub video
  const heroVideoRef = useRef<HTMLVideoElement | null>(null)
  const isSeeking = useRef(false)
  const targetTime = useRef(0)

  // Trigger entrance complete state after 800ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setEntranceComplete(true)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  // Mouse scrubbing handler for Video 1
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = heroVideoRef.current
    if (!video || !video.duration || isNaN(video.duration)) return

    const percent = e.clientX / window.innerWidth
    // Sensitivity factor 0.8
    targetTime.current = percent * video.duration * 0.8

    if (!isSeeking.current) {
      isSeeking.current = true
      video.currentTime = targetTime.current
    }
  }

  const handleSeeked = () => {
    const video = heroVideoRef.current
    if (!video) return

    if (Math.abs(video.currentTime - targetTime.current) > 0.05) {
      video.currentTime = targetTime.current
    } else {
      isSeeking.current = false
    }
  }

  // Section 2 scroll references and calculations
  const section2Ref = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress: scrollYSection2 } = useScroll({
    target: section2Ref,
    offset: ["start end", "end start"]
  })

  const ySpring = useSpring(scrollYSection2, {
    stiffness: 15,
    damping: 32,
    mass: 1.8
  })

  const yScaleValue = useTransform(ySpring, [0, 1], [60, -120])
  const opacitySection2 = useTransform(ySpring, [0.3, 0.5], [0, 1])
  const transformStyle = useMotionTemplate`perspective(400px) rotateX(24deg) translateY(${yScaleValue}px) translateZ(15px)`

  // Smooth scroll helper
  const scrollTo = (heightMultiplier: number) => {
    window.scrollTo({
      top: window.innerHeight * heightMultiplier,
      behavior: 'smooth'
    })
    setMenuOpen(false)
  }

  return (
    <div
      style={{ fontFamily: '"Space Mono", monospace' }}
      className="relative min-h-screen bg-black text-white overflow-x-hidden selection:bg-white/20 selection:text-white"
    >
      
      {/* NAVBAR */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={entranceComplete ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 right-0 h-20 z-50 flex items-center px-4 sm:px-6 md:px-8 select-none pointer-events-none"
      >
        <div className="w-full flex items-center justify-between pointer-events-auto gap-2">
          {/* Logo pill */}
          <motion.div
            animate={{
              width: menuOpen ? 0 : 'auto',
              opacity: menuOpen ? 0 : 1,
              marginRight: menuOpen ? 0 : 8
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.22)' }}
            whileTap={{ scale: 0.98 }}
            className="h-9 sm:h-12 bg-white/15 backdrop-blur-md rounded-[10px] sm:rounded-[14px] flex items-center gap-2 sm:gap-2.5 overflow-hidden cursor-pointer shrink-0"
            style={{ paddingLeft: menuOpen ? 0 : 20, paddingRight: menuOpen ? 0 : 20 }}
          >
            <SynapseXLogo className="h-4.5 w-4.5 text-white" />
            <span className="text-[13px] sm:text-[16px] font-medium tracking-tight text-white whitespace-nowrap">
              InternHQ
            </span>
          </motion.div>

          {/* Expanding menu pill */}
          <motion.div
            animate={{
              flexGrow: menuOpen ? 1 : 0,
              width: menuOpen ? 'auto' : '48px'
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="h-9 sm:h-12 rounded-[10px] sm:rounded-[14px] bg-white/15 backdrop-blur-md flex items-center justify-between overflow-hidden"
          >
            {/* Hamburger Button */}
            <div
              className={`flex items-center justify-center rounded-[10px] sm:rounded-[14px] transition-colors cursor-pointer shrink-0 ${
                menuOpen
                  ? 'w-[30px] h-[30px] sm:w-[36px] sm:h-[36px] bg-white/10 hover:bg-white/20 ml-1.5'
                  : 'w-[48px] h-full'
              }`}
            >
              <SquashHamburger isOpen={menuOpen} onClick={() => setMenuOpen(!menuOpen)} />
            </div>

            {/* Nav links */}
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex items-center gap-4 sm:gap-6 pl-4 pr-6 text-[13px] sm:text-[16px] overflow-hidden"
              >
                <button
                  onClick={() => scrollTo(1)}
                  onMouseEnter={() => setHoveredLink('about')}
                  onMouseLeave={() => setHoveredLink(null)}
                  className="font-normal text-white/85 hover:text-white cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                >
                  <ScrambleText text="About" isHovered={hoveredLink === 'about'} />
                </button>
                <button
                  onClick={() => scrollTo(2)}
                  onMouseEnter={() => setHoveredLink('metrics')}
                  onMouseLeave={() => setHoveredLink(null)}
                  className="font-normal text-white/85 hover:text-white cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                >
                  <ScrambleText text="Metrics" isHovered={hoveredLink === 'metrics'} />
                </button>
                
                {/* Console entry */}
                {user ? (
                  <Link
                    href="/dashboard"
                    onMouseEnter={() => setHoveredLink('console')}
                    onMouseLeave={() => setHoveredLink(null)}
                    className="font-bold text-white/85 hover:text-white cursor-pointer"
                  >
                    <ScrambleText text="Console" isHovered={hoveredLink === 'console'} />
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onMouseEnter={() => setHoveredLink('portal')}
                    onMouseLeave={() => setHoveredLink(null)}
                    className="font-bold text-white/85 hover:text-white cursor-pointer"
                  >
                    <ScrambleText text="Portal" isHovered={hoveredLink === 'portal'} />
                  </Link>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Spacer when closed to push CTA to the right */}
          {!menuOpen && <div className="flex-1 shrink-0" />}

          {/* Right: Dashboard Redirection Button */}
          <motion.div
            animate={{
              width: menuOpen ? 0 : 'auto',
              opacity: menuOpen ? 0 : 1,
              marginLeft: menuOpen ? 0 : 8
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="overflow-hidden shrink-0"
          >
            {user ? (
              <motion.div
                onMouseEnter={() => setHoveredDl(true)}
                onMouseLeave={() => setHoveredDl(false)}
                whileHover={{ scale: 1.03, backgroundColor: '#e2e2e6' }}
                whileTap={{ scale: 0.97 }}
                className="h-9 sm:h-12 px-3.5 sm:px-6 bg-white rounded-full flex items-center justify-center text-black cursor-pointer text-[13px] sm:text-[16px] font-semibold"
              >
                <Link href="/dashboard">
                  <ScrambleText text="Go to Dashboard" isHovered={hoveredDl} />
                </Link>
              </motion.div>
            ) : (
              <motion.div
                onMouseEnter={() => setHoveredDl(true)}
                onMouseLeave={() => setHoveredDl(false)}
                whileHover={{ scale: 1.03, backgroundColor: '#e2e2e6' }}
                whileTap={{ scale: 0.97 }}
                className="h-9 sm:h-12 px-3.5 sm:px-6 bg-white rounded-full flex items-center justify-center text-black cursor-pointer text-[13px] sm:text-[16px] font-semibold"
              >
                <Link href="/signup">
                  <ScrambleText text="Get Started" isHovered={hoveredDl} />
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.header>


      {/* SECTION 1: HERO */}
      <div
        onMouseMove={handleMouseMove}
        className="relative w-full h-screen h-[100dvh] flex flex-col justify-end overflow-hidden"
      >
        {/* Background mouse-scrubbed video */}
        <video
          ref={heroVideoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_083515_290e5a10-0b95-41af-a5e2-32b6389baa4d.mp4"
          onSeeked={handleSeeked}
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
          muted
          playsInline
          preload="auto"
        />

        {/* Dot grid overlay */}
        <div
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.05,
          }}
          className="absolute inset-0 pointer-events-none z-10"
        />

        {/* Watermark text */}
        <div
          style={{
            top: '50%',
            transform: 'translateY(-50%) translateY(50px)',
            fontSize: 'clamp(120px, 30vw, 521px)',
            fontWeight: 400,
            letterSpacing: '-4px',
            opacity: 0.10,
            background: 'radial-gradient(circle, rgba(142,127,148,0) 0%, #8E7F94 70%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
          className="absolute inset-x-0 flex items-center justify-center font-anton-sc uppercase text-center select-none z-2 pointer-events-none whitespace-nowrap"
        >
          INTERNHQ
        </div>

        {/* Hero content */}
        <div className="relative z-20 px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 pb-8 sm:pb-12 max-w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={entranceComplete ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1.0 }}
            className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          >
            {/* Left column */}
            <div className="flex flex-col gap-4">
              <h1 className="text-white font-light leading-[0.95] tracking-[-0.03em] text-[clamp(40px,10vw,100px)]">
                <ScrambleIn text="Command" delay={200} triggered={entranceComplete} />
                <br />
                <ScrambleIn text="Console" delay={500} triggered={entranceComplete} />
              </h1>
              <motion.p
                initial={{ y: 25, opacity: 0 }}
                animate={entranceComplete ? { y: 0, opacity: 1 } : { y: 25, opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.215, 0.610, 0.355, 1.000], delay: 0.2 }}
                className="max-w-md text-[13px] sm:text-[15px] text-white/60 leading-relaxed mb-4"
              >
                InternHQ merges application tracking, resume cataloging, and interview scheduling into a single unified workspace. Optimize your recruiting funnel and secure top engineering offers.
              </motion.p>
              
              {/* Dashboard buttons inside Hero section */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={entranceComplete ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
                transition={{ duration: 0.9, delay: 0.3 }}
                className="flex items-center gap-3"
              >
                {user ? (
                  <Link href="/dashboard" className="h-11 px-6 bg-white hover:bg-white/90 text-black font-semibold rounded-lg text-xs flex items-center justify-center transition-all duration-150 cursor-pointer">
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/signup" className="h-11 px-6 bg-white hover:bg-white/90 text-black font-semibold rounded-lg text-xs flex items-center justify-center transition-all duration-150 cursor-pointer">
                      Get Started
                    </Link>
                    <Link href="/login" className="h-11 px-6 border-2 border-white hover:bg-white/10 text-white font-semibold rounded-lg text-xs flex items-center justify-center transition-all duration-150 cursor-pointer">
                      Sign In
                    </Link>
                  </>
                )}
              </motion.div>
            </div>

            {/* Right column */}
            <div className="text-left md:text-right">
              <h1 className="text-white font-light leading-[0.95] tracking-[-0.03em] text-[clamp(40px,10vw,100px)]">
                <ScrambleIn text="Career" delay={700} triggered={entranceComplete} />
                <br />
                <ScrambleIn text="Pipeline" delay={1000} triggered={entranceComplete} />
              </h1>
            </div>
          </motion.div>
        </div>
      </div>


      {/* SECTION 2: CINEMATIC TEXT */}
      <div
        ref={section2Ref}
        className="relative w-full h-screen h-[100dvh] flex items-center justify-center overflow-hidden"
      >
        {/* Autoplay loop video background */}
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_092455_089c54f8-3b03-4966-9df1-e9746063d0ef.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
        />

        {/* Top gradient overlay */}
        <div
          style={{
            background: 'linear-gradient(to bottom, #000000, transparent)',
            height: '180px',
          }}
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        />

        {/* Text content with 3D perspective scroll effect */}
        <motion.div
          style={{
            transform: transformStyle,
            opacity: opacitySection2,
          }}
          className="relative z-20 max-w-5xl px-6 sm:px-12 text-center"
        >
          <p className="font-sans font-normal text-[22px] sm:text-[30px] md:text-[36px] lg:text-[42px] text-white leading-[1.35] tracking-[-0.02em] select-none">
            A career command console built for the next generation of student developers. InternHQ translates your applications, interviews, and portfolio signals into a structured recruitment pipeline. Every connection becomes measurable, searchable, and visible. It continuously reconstructs your candidate profile as a dynamic career map. Administrative noise is filtered into actionable timeline alerts.
          </p>
        </motion.div>
      </div>


      {/* SECTION 3: METRICS */}
      <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
        {/* Autoplay loop video background */}
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095810_ecea3dd2-fc5e-4e41-8696-4219290b6589.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
        />

        {/* Content */}
        <div className="relative z-20 pt-32 pb-32 px-6 w-full max-w-6xl">
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.2 }}
            className="text-white/40 text-[13px] sm:text-[14px] tracking-[0.2em] uppercase mb-20 text-center"
          >
            PLACEMENT ASSURANCE
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
            {[
              { val: '100%', label: 'Placement Guarantee' },
              { val: '100%', label: 'Verified Career Success' },
              { val: '100%', label: 'Interview Conversion' }
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                <span className="text-white text-[clamp(48px,10vw,96px)] font-light tracking-[-0.04em] leading-none">
                  {m.val}
                </span>
                <span className="text-white/40 text-[13px] sm:text-[15px] mt-4 tracking-wide font-sans">
                  {m.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>


      {/* SECTION 4: TECHNOLOGY / ADAPTIVE INTELLIGENCE */}
      <div className="relative w-full h-screen h-[100dvh] flex flex-col justify-between overflow-hidden">
        {/* Autoplay loop video background */}
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095750_32a52ce0-2005-45c9-9093-41f03fde9530.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
        />

        {/* Content grid */}
        <div className="relative z-20 px-8 sm:px-12 md:px-16 py-12 sm:py-16 h-full flex flex-col justify-between">
          {/* Top area */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
            <motion.h2
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1.0 }}
              className="text-white font-light text-[clamp(36px,8vw,72px)] leading-[0.95] tracking-[-0.03em]"
            >
              Pipeline
              <br />
              Intelligence
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1.0, delay: 0.2 }}
              className="text-white/50 text-[13px] sm:text-[15px] leading-relaxed max-w-xs md:text-right md:pt-2"
            >
              The dashboard syncs your academic and career details within minutes. From there, every application cycle is tracked, logged, and organized in real time.
            </motion.p>
          </div>

          <div className="flex-1" />

          {/* Bottom grid */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6"
          >
            {[
              { title: 'Funnel Mapping', desc: 'Real-time pipeline tracker showing every recruitment stage from start to offer.' },
              { title: 'OAuth Syncing', desc: 'Syncs your schedules, emails, and interview invitations.' },
              { title: 'Timeline Alerts', desc: 'Anticipates interview preparation tasks before deadlines arrive.' },
              { title: 'Closed-Loop Feedback', desc: 'Refines resume versions based on response feedback metrics.' }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
                className="flex flex-col"
              >
                <h3 className="text-white text-[14px] sm:text-[16px] font-normal mb-2">
                  {item.title}
                </h3>
                <p className="text-white/40 text-[12px] sm:text-[14px] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>


      {/* SECTION 5: ARCHITECTURE (Pure black, no video) */}
      <div className="relative w-full min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="relative z-20 w-full max-w-3xl px-6 py-32 text-center">
          {/* Heading block */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.0 }}
            className="flex flex-col items-center"
          >
            <span className="text-white/40 text-[13px] sm:text-[14px] tracking-[0.2em] uppercase mb-8">
              Platform Architecture
            </span>
            <h2 className="text-white font-light text-[clamp(28px,6vw,56px)] leading-[1.15] tracking-[-0.02em] mb-10">
              Three layers. Zero spreadsheets.
            </h2>
            <p className="text-white/45 text-[15px] sm:text-[17px] leading-relaxed max-w-xl mx-auto">
              Database layer secures candidate assets. Pipeline layer isolates application stages. Console layer delivers keyboard-driven controls to accelerate updates.
            </p>
          </motion.div>

          {/* Layer Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.2, delay: 0.4 }}
            className="mt-20 flex flex-col items-center gap-4 w-full"
          >
            {[
              { idx: 'Layer 1', label: 'Secure Vault' },
              { idx: 'Layer 2', label: 'Funnel Command' },
              { idx: 'Layer 3', label: 'Keyboard Control' }
            ].map((layer, i) => (
              <div
                key={i}
                className="w-full max-w-md h-[72px] border border-white/10 rounded-lg flex items-center justify-between px-6 bg-transparent"
              >
                <span className="text-white/30 text-[12px] tracking-[0.15em] uppercase">
                  {layer.idx}
                </span>
                <span className="text-white text-[16px] sm:text-[18px] font-light font-sans">
                  {layer.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>


      {/* FOOTER */}
      <footer className="relative w-full bg-black overflow-hidden select-none">
        <div className="flex flex-col md:flex-row min-h-[400px]">
          {/* Left panel: loop video */}
          <div className="relative w-full md:w-1/2 h-[300px] md:h-auto overflow-hidden">
            <video
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_080203_fd7f4f85-3a86-4837-8192-85e7bfe68e75.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
            />
          </div>

          {/* Right panel: content */}
          <div className="w-full md:w-1/2 flex flex-col justify-between p-10 sm:p-16">
            <div>
              {/* Logo block */}
              <div className="flex items-center gap-2 mb-8 text-white/70">
                <SynapseXLogo className="h-4.5 w-4.5" />
                <span className="text-[15px] font-medium tracking-tight">InternHQ</span>
              </div>
              <p className="text-white/40 text-[14px] sm:text-[15px] leading-relaxed max-w-sm">
                The career command console for student developers. Built to accelerate recruitment pipelines and secure engineering opportunities.
              </p>
            </div>

            <div>
              <p className="text-white/25 text-[12px] mt-12 font-mono">
                &copy; {new Date().getFullYear()} InternHQ Technologies Inc. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
