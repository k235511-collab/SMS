'use client'

import Link from 'next/link'
import {
  GraduationCap,
  Users,
  BookOpen,
  DollarSign,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary-500/30">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/20">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              SMS <span className="text-primary-600">SaaS</span>
            </span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#security" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Security</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="font-semibold shadow-lg shadow-primary-600/10">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
          {/* Background Orbs */}
          <div className="absolute top-0 -z-10 h-full w-full overflow-hidden">
            <div className="absolute -left-[10%] top-0 h-[500px] w-[500px] rounded-full bg-primary-600/10 blur-[120px]" />
            <div className="absolute -right-[10%] top-[20%] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px]" />
          </div>

          <div className="container mx-auto px-4 text-center">
            <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              The Next-Gen <br />
              <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                School Management
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl animate-in fade-in slide-in-from-bottom-6 duration-700">
              A complete, multi-tenant SaaS platform built for modern educational institutions. Manage students, academics, finance, and more from a single dashboard.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg font-bold shadow-xl shadow-primary-600/20">
                  Register Your School
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-semibold bg-white/50 backdrop-blur-sm">
                  Live Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section id="how-it-works" className="border-y border-border bg-muted/30">
          <div className="container mx-auto py-12 px-4 sm:py-16">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <StatItem label="Active Schools" value="500+" />
              <StatItem label="Total Students" value="100k+" />
              <StatItem label="Reliability" value="99.9%" />
              <StatItem label="Support" value="24/7" />
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24 sm:py-32">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything you need to run your school
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful modules designed to streamline every aspect of school administration.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={Users}
                title="Student Management"
                description="Monitor admissions, records, attendance, and performance with ease."
              />
              <FeatureCard
                icon={BookOpen}
                title="Academic Planning"
                description="Manage classes, sections, subjects, and timetables efficiently."
              />
              <FeatureCard
                icon={DollarSign}
                title="Finance & Fees"
                description="Automated invoicing, fee collection, and comprehensive financial reports."
              />
              <FeatureCard
                icon={BarChart3}
                title="Analytics & Reports"
                description="Gain insights into student performance and school operations with data."
              />
              <FeatureCard
                id="security"
                icon={ShieldCheck}
                title="Role-Based Security"
                description="Advanced permission system for admins, teachers, and staff."
              />
              <FeatureCard
                icon={RotateCcw}
                title="Universal Trash"
                description="Never lose data again. Soft-delete and restore records with one click."
              />
            </div>
          </div>
        </section>

        {/* CTAs */}
        <section className="bg-primary-600 py-16 sm:py-24">
          <div className="container mx-auto px-4 text-center text-primary-foreground">
            <h2 className="text-3xl font-extrabold sm:text-5xl">
              Ready to modernize your school?
            </h2>
            <p className="mt-6 text-lg text-primary-100/90 max-w-xl mx-auto">
              Join hundreds of schools already using SMS SaaS to streamline their operations.
            </p>
            <div className="mt-10">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="h-14 px-10 text-xl font-bold text-primary-700 hover:bg-white">
                  Get Started Today
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/20 py-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SMS SaaS Implementation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-foreground sm:text-3xl">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, id }: { icon: any; title: string; description: string; id?: string }) {
  return (
    <div id={id} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary-500/50 hover:shadow-xl">
      <div className="absolute top-0 right-0 h-24 w-24 translate-x-12 -translate-y-12 rounded-full bg-primary-100 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative z-10">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function Badge({ className }: { className?: string }) {
  return <div className={className} />
}

function RotateCcw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
