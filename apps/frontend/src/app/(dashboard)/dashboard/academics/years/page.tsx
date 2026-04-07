'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AcademicYearsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/settings?tab=academic-years')
  }, [router])

  return null
}
