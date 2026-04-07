'use client'

import { School } from 'lucide-react'

interface BrandSplashProps {
    logo?: string | null
    schoolName?: string
}

export function BrandSplash({ logo, schoolName }: BrandSplashProps) {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden">
            {/* Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                {logo ? (
                    <img src={logo} alt="" className="h-[60vh] w-auto animate-pulse-soft" />
                ) : (
                    <School className="h-[60vh] w-auto animate-pulse-soft" />
                )}
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-card shadow-xl border border-border animate-pulse-soft">
                    {logo ? (
                        <img
                            src={logo}
                            alt={schoolName || 'School'}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <School className="h-12 w-12 text-primary-600" />
                    )}
                </div>

                <div className="flex flex-col items-center gap-2">
                    <h1 className="text-xl font-bold text-foreground">
                        {schoolName || 'SMS SaaS'}
                    </h1>
                    <p className="text-sm font-medium animate-shimmer-text">
                        Loading your workspace...
                    </p>
                </div>
            </div>

            {/* Bottom Footer */}
            <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 opacity-40">
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
            </div>
        </div>
    )
}
