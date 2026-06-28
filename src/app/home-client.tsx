'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import {
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Shield,
  Zap,
  Compass,
  CheckCircle,
  HelpCircle,
  Github,
  Linkedin,
  Globe,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import './home.css'

interface HomeClientProps {
  user: User | null
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

export function HomeClient({ user }: HomeClientProps) {
  // Refs for HTML Elements
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoFallbackRef = useRef<HTMLVideoElement | null>(null)
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const heroRef = useRef<HTMLDivElement | null>(null)
  const cardsTriggerRef = useRef<HTMLDivElement | null>(null)
  const fixedCardsRef = useRef<HTMLDivElement | null>(null)
  const cardsGridRef = useRef<HTMLDivElement | null>(null)
  const sectionThreeInnerRef = useRef<HTMLDivElement | null>(null)

  // Video state refs to prevent re-triggering effects
  const framesRef = useRef<ImageBitmap[]>([])
  const framesReadyRef = useRef<boolean>(false)
  const lastFrameIndexRef = useRef<number>(-1)
  const videoSeekingRef = useRef<boolean>(false)
  
  // Animation frame cancels
  const videoRafRef = useRef<number | null>(null)
  const particlesRafRef = useRef<number | null>(null)
  const cardsRafRef = useRef<number | null>(null)

  const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260616_212935_bbf608da-62d1-4f25-9be4-c346e4d09cc8.mp4'

  // Pricing & features mock data from original page.tsx
  const features = [
    {
      icon: <Sparkles className="h-6 w-6 text-blue-400" />,
      title: 'Career Command Center',
      description: 'Ditch the spreadsheets. Track applications, networking, and offers from one Unified Command dashboard.'
    },
    {
      icon: <Zap className="h-6 w-6 text-purple-400" />,
      title: 'Intelligent Profiles',
      description: 'Your digital career twin. Sync your skills, graduation dates, and resumes to auto-match opportunities.'
    },
    {
      icon: <Compass className="h-6 w-6 text-emerald-400" />,
      title: 'Journey Tracker',
      description: 'Visualize every stage of your recruitment funnel, from initial application to signed offer letter.'
    },
    {
      icon: <Shield className="h-6 w-6 text-rose-400" />,
      title: 'Secure & Verified',
      description: 'Your resume and academic history are protected by strict Row-Level Security and encryption policies.'
    }
  ]

  const steps = [
    {
      number: '01',
      title: 'Deploy Profile',
      description: 'Input your academic credentials, technical skills, and career interests into your profile dashboard.'
    },
    {
      number: '02',
      title: 'Synchronize Resumes',
      description: 'Upload your resumes and link GitHub/LinkedIn. Build a comprehensive portfolio of your accomplishments.'
    },
    {
      number: '03',
      title: 'Track Funnel',
      description: 'Organize interviews, complete technical assessments, and log feedback as you advance through cycles.'
    },
    {
      number: '04',
      title: 'Secure the Offer',
      description: 'Compare multiple compensation offers side-by-side and launch your engineering career.'
    }
  ]

  const pricingTiers = [
    {
      name: 'Pilot',
      price: '$0',
      description: 'Essential command tools for student developers.',
      features: [
        'Single Active Profile',
        'Standard Application Tracking',
        'Command Palette Navigation',
        'Email Verification Protection',
        'Community Support access'
      ],
      cta: 'Initialize Account',
      popular: false
    },
    {
      name: 'Command Pro',
      price: '$12',
      period: '/mo',
      description: 'For candidates aiming for top-tier tech offers.',
      features: [
        'Everything in Pilot tier',
        'Unlimited Active Resumes',
        'Priority OAuth Login access',
        'Advanced Application Metrics',
        'Mock Interview scheduler',
        'Priority Server support'
      ],
      cta: 'Go Command Pro',
      popular: true
    }
  ]

  const faqs = [
    {
      question: 'Is InternHQ an internship listing board?',
      answer: 'No. InternHQ is a Career Command Center. Instead of browsing static job feeds, InternHQ helps you organize, track, and optimize your entire applications funnel from initial discovery to final offer.'
    },
    {
      question: 'How does the command palette work?',
      answer: 'Pressing Cmd+K (or Ctrl+K) triggers the command palette overlay anywhere on the platform, allowing you to search pages, trigger actions, and run profile configuration commands quickly.'
    },
    {
      question: 'Is my student data secure?',
      answer: 'Absolutely. We utilize Supabase Row Level Security (RLS) policies. Your profile data and resume assets can only be accessed or modified by you.'
    },
    {
      question: 'Can I import my existing spreadsheet tracker?',
      answer: 'Yes! In the upcoming updates of Phase 2, you will be able to import CSV trackers directly into your Command dashboard with auto-matching columns.'
    }
  ]

  useEffect(() => {
    // --------------------- RESIZE CANVAS ---------------------
    const canvas = videoCanvasRef.current
    const videoEl = videoFallbackRef.current
    if (!canvas || !videoEl) return

    const ctx = canvas.getContext('2d')

    function resizeCanvas() {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      const w = Math.round(rect.width * dpr)
      const h = Math.round(rect.height * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      lastFrameIndexRef.current = -1
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // --------------------- SCROLL VIDEO FRAMES ---------------------
    async function extractFrames() {
      try {
        const response = await fetch(VIDEO_URL, { mode: 'cors' })
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)

        const video = document.createElement('video')
        video.muted = true
        video.preload = 'auto'
        video.playsInline = true
        video.crossOrigin = 'anonymous'
        video.src = objectUrl

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve()
          video.onerror = () => reject()
          setTimeout(() => reject(new Error('Timeout loading metadata')), 15000)
        })

        const scale = Math.min(1, 1280 / video.videoWidth)
        const scaledWidth = Math.round(video.videoWidth * scale)
        const scaledHeight = Math.round(video.videoHeight * scale)
        const frameCount = Math.max(30, Math.min(120, Math.round(video.duration * 24)))

        const tempFrames: ImageBitmap[] = []
        for (let i = 0; i < frameCount; i++) {
          const time = (i / (frameCount - 1)) * (video.duration - 0.05)
          video.currentTime = time
          await new Promise<void>((resolve, reject) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked)
              resolve()
            }
            video.addEventListener('seeked', onSeeked)
            setTimeout(() => {
              video.removeEventListener('seeked', onSeeked)
              reject(new Error('Timeout seeked'))
            }, 3000)
          })
          const bitmap = await createImageBitmap(video, {
            resizeWidth: scaledWidth,
            resizeHeight: scaledHeight
          })
          tempFrames.push(bitmap)
        }

        if (tempFrames.length > 0 && canvas && videoEl) {
          framesRef.current = tempFrames
          framesReadyRef.current = true
          canvas.style.visibility = 'visible'
          videoEl.style.display = 'none'
        }
        URL.revokeObjectURL(objectUrl)
      } catch (e) {
        console.warn('Frame extraction failed, falling back to seek method:', e)
      }
    }

    function getScrollBounds() {
      const vh = window.innerHeight
      return { start: vh * 0.5, end: document.documentElement.scrollHeight - vh }
    }

    function getProgress() {
      const { start, end } = getScrollBounds()
      const range = end - start
      if (range <= 0) return 0
      return Math.max(0, Math.min(1, (window.scrollY - start) / range))
    }

    function drawFrame(frame: ImageBitmap) {
      if (!canvas || !ctx) return
      const cw = canvas.width
      const ch = canvas.height
      const s = Math.max(cw / frame.width, ch / frame.height)
      const dw = frame.width * s
      const dh = frame.height * s
      ctx.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
    }

    function videoTick() {
      const progress = getProgress()
      if (framesReadyRef.current && framesRef.current.length > 0) {
        const idx = Math.round(progress * (framesRef.current.length - 1))
        if (idx !== lastFrameIndexRef.current) {
          lastFrameIndexRef.current = idx
          const frame = framesRef.current[idx]
          if (frame) drawFrame(frame)
        }
      } else if (videoEl && videoEl.duration && isFinite(videoEl.duration) && videoEl.readyState >= 1) {
        const target = progress * videoEl.duration
        if (!videoSeekingRef.current && Math.abs(videoEl.currentTime - target) > 0.001) {
          videoSeekingRef.current = true
          videoEl.currentTime = target
        }
      }
      videoRafRef.current = requestAnimationFrame(videoTick)
    }

    const onSeeked = () => {
      videoSeekingRef.current = false
    }
    const onStalled = () => {
      videoSeekingRef.current = false
    }
    const onLoadedData = () => {
      if (videoEl) videoEl.currentTime = 0
    }

    videoEl.addEventListener('seeked', onSeeked)
    videoEl.addEventListener('stalled', onStalled)
    videoEl.addEventListener('loadeddata', onLoadedData)

    if (canvas) canvas.style.visibility = 'hidden'

    videoRafRef.current = requestAnimationFrame(videoTick)
    extractFrames()

    // --------------------- PARTICLES ---------------------
    const pCanvas = particlesCanvasRef.current
    if (!pCanvas) return

    const pCtx = pCanvas.getContext('2d')
    let particles: Particle[] = []

    function resizeParticles() {
      if (!pCanvas) return
      pCanvas.width = window.innerWidth
      pCanvas.height = window.innerHeight
      createParticles()
    }

    function createParticles() {
      if (!pCanvas) return
      particles = []
      const count = Math.floor((pCanvas.width * pCanvas.height) / 12000)
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * pCanvas.width,
          y: Math.random() * pCanvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.6 + 0.2
        })
      }
    }

    function animateParticles() {
      if (!pCanvas || !pCtx) return
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = pCanvas.width
        if (p.x > pCanvas.width) p.x = 0
        if (p.y < 0) p.y = pCanvas.height
        if (p.y > pCanvas.height) p.y = 0
        pCtx.beginPath()
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        pCtx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
        pCtx.fill()
      }
      particlesRafRef.current = requestAnimationFrame(animateParticles)
    }

    resizeParticles()
    window.addEventListener('resize', resizeParticles)
    particlesRafRef.current = requestAnimationFrame(animateParticles)

    // --------------------- HERO OPACITY FADE ---------------------
    function updateHeroOpacity() {
      const hero = heroRef.current
      if (!hero) return
      const fade = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.3))
      hero.style.opacity = fade.toString()
    }
    window.addEventListener('scroll', updateHeroOpacity, { passive: true })

    // --------------------- FIXED CARDS MASK REVEAL ---------------------
    function tickCards() {
      const trigger = cardsTriggerRef.current
      const fixedCards = fixedCardsRef.current
      const cardsGrid = cardsGridRef.current
      if (!trigger || !fixedCards || !cardsGrid) {
        cardsRafRef.current = requestAnimationFrame(tickCards)
        return
      }

      const rect = trigger.getBoundingClientRect()
      const triggerTop = rect.top + window.scrollY
      const triggerHeight = rect.height
      const scrollY = window.scrollY
      const vh = window.innerHeight

      const start = triggerTop - vh * 0.5
      const end = triggerTop + triggerHeight - vh * 0.3
      const range = end - start

      let progress = range > 0 ? (scrollY - start) / range : 0
      progress = Math.max(0, Math.min(1, progress))

      const isActive = scrollY >= start - vh * 0.2 && scrollY <= end + vh * 0.3
      const fadeIn = Math.min(1, Math.max(0, (scrollY - (start - vh * 0.2)) / (vh * 0.2)))
      const fadeOut = Math.min(1, Math.max(0, (end + vh * 0.3 - scrollY) / (vh * 0.3)))
      const containerOpacity = isActive ? Math.min(fadeIn, fadeOut) : 0

      fixedCards.style.opacity = containerOpacity.toString()
      fixedCards.style.pointerEvents = containerOpacity > 0.1 ? 'auto' : 'none'

      const isMobile = window.innerWidth < 768
      const revealPct = progress * 130
      const maskGradient = isMobile
        ? `linear-gradient(to bottom, black ${revealPct}%, transparent ${revealPct + 20}%)`
        : `linear-gradient(to right, black ${revealPct}%, transparent ${revealPct + 15}%)`

      cardsGrid.style.maskImage = maskGradient
      cardsGrid.style.webkitMaskImage = maskGradient

      cardsRafRef.current = requestAnimationFrame(tickCards)
    }
    cardsRafRef.current = requestAnimationFrame(tickCards)

    // --------------------- SECTION 3 INTERSECTION ---------------------
    const sectionInner = sectionThreeInnerRef.current
    let observer: IntersectionObserver | null = null

    if (sectionInner) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            sectionInner.classList.add('visible')
            if (observer) observer.unobserve(sectionInner)
          }
        },
        { threshold: 0.15 }
      )
      observer.observe(sectionInner)
    }

    // --------------------- CLEANUP ---------------------
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('resize', resizeParticles)
      window.removeEventListener('scroll', updateHeroOpacity)
      if (videoEl) {
        videoEl.removeEventListener('seeked', onSeeked)
        videoEl.removeEventListener('stalled', onStalled)
        videoEl.removeEventListener('loadeddata', onLoadedData)
      }
      if (observer && sectionInner) {
        observer.unobserve(sectionInner)
      }
      if (videoRafRef.current) cancelAnimationFrame(videoRafRef.current)
      if (particlesRafRef.current) cancelAnimationFrame(particlesRafRef.current)
      if (cardsRafRef.current) cancelAnimationFrame(cardsRafRef.current)

      // Close all ImageBitmaps to free up CPU memory
      const currentFrames = framesRef.current
      currentFrames.forEach((frame) => {
        try {
          frame.close()
        } catch {
          // ignore already closed bitmaps
        }
      })
    }
  }, [])

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Scroll Video Background */}
      <div id="scroll-video-container">
        <canvas ref={videoCanvasRef} id="video-canvas"></canvas>
        <video
          ref={videoFallbackRef}
          id="video-fallback"
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          src={VIDEO_URL}
        ></video>
        <div className="overlay"></div>
      </div>

      {/* Particles Canvas */}
      <canvas ref={particlesCanvasRef} id="particles-canvas"></canvas>

      {/* Header / Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            I
          </div>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            InternHQ
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
          <a href="#workflow" className="hover:text-slate-200 transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-slate-200 transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-slate-200 transition-colors">FAQ</a>
          {user ? (
            <Link href="/dashboard" className="hover:text-slate-200 transition-colors">Get Started</Link>
          ) : (
            <Link href="/signup" className="hover:text-slate-200 transition-colors">Get Started</Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          {user ? (
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/10 hover:bg-white/5 flex items-center gap-2 text-xs">
                <LayoutDashboard className="h-4 w-4 text-blue-400" />
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                Sign In
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium text-xs rounded-lg shadow-lg shadow-blue-500/10">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Fixed Cards Overlay (Reveals on scroll trigger) */}
      <div ref={fixedCardsRef} id="fixed-cards">
        <div ref={cardsGridRef} className="grid-container">
          <div className="card-item">
            <h3>Explore InternHQ</h3>
            <p>
              InternHQ merges application tracking with modern, simple organization tools. It&apos;s crafted to be clear and customizable while remaining intuitive and easy to use.
            </p>
          </div>
          <div className="card-item">
            <h3>Unlock Opportunities</h3>
            <p>
              The search for internships can be overwhelming. InternHQ offers a centralized dashboard to manage your applications and timeline from application to final offer.
            </p>
          </div>
          <div className="card-item">
            <h3>Connect Everything</h3>
            <p>
              InternHQ comes with tools for resume tracking, interview scheduling, and contact logs to make landing your next role simple and straightforward.
            </p>
          </div>
        </div>
      </div>

      {/* Main Scroller Content */}
      <div id="main-scroller">
        
        {/* Section 1: Hero */}
        <section ref={heroRef} id="hero-section">
          <div className="gradient-overlay"></div>
          <div className="hero-content">
            <div className="max-w-6xl mx-auto text-center">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold text-white mb-12 select-none" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                InternHQ
              </h1>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                {user ? (
                  <Link href="/dashboard">
                    <Button className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-base px-10 py-6 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/15 transition-all duration-200">
                      Go to Dashboard <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/signup">
                      <Button className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-base px-10 py-6 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/15 transition-all duration-200">
                        Get Started <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button variant="outline" className="border-white/10 hover:bg-white/5 text-slate-300 font-medium text-base px-10 py-6 rounded-xl transition-all duration-200">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="bounce-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </section>

        {/* Scroll triggers and content spacers */}
        <div style={{ height: '150vh' }}></div>

        {/* Cards Trigger Zone */}
        <div ref={cardsTriggerRef} id="cards-trigger" style={{ height: '200vh' }}></div>

        <div style={{ height: '100vh' }}></div>

        {/* Section 3 Presentation */}
        <section id="section-three">
          <div ref={sectionThreeInnerRef} className="inner">
            <p>Presenting</p>
            <h2>InternHQ Console 1.0</h2>
            <p className="mt-6 text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
              InternHQ is a centralized career organizer designed for students. It consolidates application tracking, contact logs, resume versions, and interview schedules into a single place so you can secure your next role without the stress.
            </p>
          </div>
        </section>

        {/* Dashboard Mockup Showcase Section */}
        <section className="relative py-24 px-6 flex flex-col items-center text-center">
          <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-slate-900/30 p-2 shadow-2xl backdrop-blur-md relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-10 blur-xl group-hover:opacity-15 transition duration-1000" />
            <div className="rounded-xl border border-white/5 bg-slate-950/80 overflow-hidden aspect-[16/10] flex flex-col">
              {/* Window bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 bg-slate-950 border border-white/5 px-3 py-1 rounded-md">
                  <span>internhq.com/dashboard</span>
                </div>
                <div className="w-14" />
              </div>
              
              {/* Inner Content Placeholder Mockup */}
              <div className="flex-1 grid grid-cols-5 text-left text-xs bg-slate-950/60 p-4 gap-4 overflow-hidden">
                {/* Sidebar Mock */}
                <div className="col-span-1 border-r border-white/5 pr-4 flex flex-col gap-4">
                  <div className="h-6 w-24 rounded bg-slate-800" />
                  <div className="flex flex-col gap-2">
                    <div className="h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center px-2 gap-2 text-[10px]">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Overview</span>
                    </div>
                    <div className="h-8 rounded hover:bg-white/5 flex items-center px-2 gap-2 text-[10px] text-slate-500">
                      <div className="w-2 h-2 rounded-full bg-slate-800" />
                      <span>Applications</span>
                    </div>
                    <div className="h-8 rounded hover:bg-white/5 flex items-center px-2 gap-2 text-[10px] text-slate-500">
                      <div className="w-2 h-2 rounded-full bg-slate-800" />
                      <span>Interviews</span>
                    </div>
                    <div className="h-8 rounded hover:bg-white/5 flex items-center px-2 gap-2 text-[10px] text-slate-500">
                      <div className="w-2 h-2 rounded-full bg-slate-800" />
                      <span>Resumes</span>
                    </div>
                  </div>
                </div>
                
                {/* Main Workspace Mock */}
                <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div className="flex flex-col gap-1">
                      <div className="h-4 w-32 rounded bg-slate-800" />
                      <div className="h-3 w-48 rounded bg-slate-900" />
                    </div>
                    <div className="h-8 w-24 rounded bg-slate-900 border border-white/5" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border border-white/5 bg-slate-900/40 p-3 rounded-lg flex flex-col gap-2">
                      <span className="text-[10px] text-slate-500">Applications Sent</span>
                      <span className="text-xl font-bold font-mono">14</span>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full w-[45%]" />
                      </div>
                    </div>
                    <div className="border border-white/5 bg-slate-900/40 p-3 rounded-lg flex flex-col gap-2">
                      <span className="text-[10px] text-slate-500">Interview Rate</span>
                      <span className="text-xl font-bold font-mono">32.8%</span>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full w-[65%]" />
                      </div>
                    </div>
                    <div className="border border-white/5 bg-slate-900/40 p-3 rounded-lg flex flex-col gap-2">
                      <span className="text-[10px] text-slate-500">Active Offers</span>
                      <span className="text-xl font-bold font-mono">2</span>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-[25%]" />
                      </div>
                    </div>
                  </div>

                  {/* Welcome Card Mock */}
                  <div className="flex-1 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-8 text-center bg-slate-950">
                    <Sparkles className="h-8 w-8 text-blue-500 mb-2 animate-bounce" />
                    <p className="font-semibold text-sm text-slate-200">Your internship journey starts here.</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-sm">
                      Complete onboarding and sync your details to deploy your personalized dashboard tracking panel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 border-t border-white/5 bg-slate-950/80 relative backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Engineered for the Modern Student
              </h2>
              <p className="text-slate-400">
                The tools you need to secure top offers in tech. Integrated database tracking, elegant UI workflows, and profile syncing.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <Card key={i} className="bg-slate-900/40 border-white/5 hover:border-white/10 p-6 backdrop-blur-md hover:bg-slate-900/60 transition-all duration-300 relative group flex flex-col gap-4">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition duration-300" />
                  <div className="p-3 bg-white/5 rounded-lg w-fit">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-1.5 text-slate-200">{feature.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{feature.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-24 border-t border-white/5 bg-slate-900/40 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                How InternHQ Commands Your Search
              </h2>
              <p className="text-slate-400">
                Four structured phases that take you from initial preparation to signed compensation sheets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <div className="hidden md:block absolute top-10 left-12 right-12 h-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-transparent z-0" />
              {steps.map((step, i) => (
                <div key={i} className="flex flex-col gap-4 z-10 relative">
                  <div className="text-3xl font-extrabold font-mono bg-clip-text text-transparent bg-gradient-to-b from-blue-500 to-purple-600 w-fit">
                    {step.number}
                  </div>
                  <h3 className="font-bold text-base text-slate-200">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 border-t border-white/5 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Approved by Student Engineers
              </h2>
              <p className="text-slate-400">
                See how students from top universities landed software engineering internships using command consoles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: "InternHQ completely streamlined my summer cycle. I logged every technical round and could see which resume versions fetched responses.",
                  author: "Alex Rivera",
                  role: "SWE Intern @ Vercel",
                  school: "Stanford University"
                },
                {
                  quote: "Spreadsheets are too slow and lack integrations. Having my GitHub, portfolio links, and files linked to a command interface saved hours.",
                  author: "Tariq Mahmood",
                  role: "Platform Intern @ Stripe",
                  school: "Carnegie Mellon"
                },
                {
                  quote: "The interface is incredible. It looks like Vercel and Linear had a baby. The keyboard-driven shortcuts make logging updates super satisfying.",
                  author: "Sasha Gusev",
                  role: "Frontend Intern @ Framer",
                  school: "MIT"
                }
              ].map((t, i) => (
                <Card key={i} className="bg-slate-900/30 border-white/5 p-6 backdrop-blur-md hover:bg-slate-900/50 transition duration-300 flex flex-col justify-between gap-6">
                  <div className="flex gap-1 text-yellow-500">
                    {[...Array(5)].map((_, idx) => <Star key={idx} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-xs text-slate-300 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="border-t border-white/5 pt-4 flex flex-col">
                    <span className="font-semibold text-xs text-slate-200">{t.author}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{t.role}</span>
                    <span className="text-[9px] text-slate-500 font-mono mt-0.5">{t.school}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 border-t border-white/5 bg-slate-900/20 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Predictable Command Tiers
              </h2>
              <p className="text-slate-400">
                Start for free with essential tools, or unlock priority console features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {pricingTiers.map((tier, idx) => (
                <Card
                  key={idx}
                  className={`bg-slate-900/40 border-white/5 hover:border-white/10 p-8 flex flex-col justify-between relative group ${
                    tier.popular ? 'border-blue-500/30 shadow-2xl shadow-blue-500/5' : ''
                  }`}
                >
                  {tier.popular && (
                    <Badge className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-purple-600 border-none text-white text-[9px] py-0.5 font-bold uppercase tracking-wider">
                      Most Popular
                    </Badge>
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-slate-200">{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="text-4xl font-extrabold font-mono text-white">{tier.price}</span>
                      {tier.period && <span className="text-sm text-slate-400">{tier.period}</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{tier.description}</p>
                    
                    <ul className="space-y-3 mt-6 border-t border-white/5 pt-6 text-xs text-slate-300">
                      {tier.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-8">
                    <Link href={user ? '/dashboard' : '/signup'}>
                      <Button className={`w-full font-semibold py-5 rounded-lg text-xs ${
                        tier.popular
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-500 hover:to-purple-500'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300'
                      }`}>
                        {tier.cta}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 border-t border-white/5 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Frequently Queried Questions
              </h2>
              <p className="text-slate-400">
                Clear, transparent answers to questions regarding Phase 1 and data infrastructure.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <Card key={idx} className="bg-slate-900/30 border-white/5 p-6 hover:bg-slate-900/40 transition duration-150">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-sm text-slate-200">{faq.question}</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="py-20 border-t border-white/5 bg-gradient-to-b from-slate-950 to-slate-900 relative px-6 text-center">
          <div className="max-w-4xl mx-auto border border-white/10 bg-slate-950/60 p-12 rounded-3xl relative overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              Take Command of Your Career Funnel
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto mb-8">
              Deploy your dashboard panel in 2 minutes. Fill in your details, synchronise your skills, and secure your tech internship.
            </p>
            <Link href={user ? '/dashboard' : '/signup'}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-8 py-5 rounded-xl text-xs md:text-sm flex items-center gap-2 mx-auto shadow-lg shadow-blue-500/15">
                Start Your Journey
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 px-6 bg-slate-950 text-slate-500 text-xs">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white text-[10px]">
                I
              </div>
              <span className="font-bold text-sm text-slate-300">InternHQ</span>
              <span className="text-[10px] text-slate-600 ml-2 font-mono">v1.0 (Phase 1 Console)</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-slate-300 transition-colors"><Github className="h-4 w-4" /></a>
              <a href="#" className="hover:text-slate-300 transition-colors"><Linkedin className="h-4 w-4" /></a>
              <a href="#" className="hover:text-slate-300 transition-colors"><Globe className="h-4 w-4" /></a>
            </div>
            
            <div>
              &copy; {new Date().getFullYear()} InternHQ Technologies Inc. All rights reserved.
            </div>
          </div>
        </footer>
      </div>

    </div>
  )
}
