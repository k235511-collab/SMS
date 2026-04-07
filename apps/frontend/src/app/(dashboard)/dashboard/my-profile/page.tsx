'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { teachersService } from '@/services/teachers.service'
import { useAuth } from '@/context/auth-context'
import { User, Mail, Phone, MapPin, Briefcase, GraduationCap, Building2, Calendar, Save, CheckCircle2 } from 'lucide-react'

interface TeacherProfile {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  qualification?: string
  specialization?: string
  joinDate?: string
  department?: string
  designation?: string
  experience?: string
  phone?: string
  address?: string
  photo?: string
  note?: string
  religion?: string
  bloodGroup?: string
  gender?: string
  cnic?: string
  salary?: number
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone?: string
    role?: { name: string; slug: string }
  }
  classTeacherOf?: { id: string; name: string }
  campus?: { id: string; name: string }
  classAssignments?: Array<{
    class: { id: string; name: string }
    section?: { id: string; name: string }
    subject?: { id: string; name: string }
  }>
}

export default function MyProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Editable fields
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [religion, setReligion] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')

  // Redirect non-teachers
  useEffect(() => {
    if (user && !user.teacherId) {
      router.replace('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    if (!user?.teacherId) return
    teachersService.getMyProfile().then(res => {
      if (res.success && res.data) {
        const p = res.data
        setProfile(p)
        setPhone(p.phone ?? '')
        setAddress(p.address ?? '')
        setNote(p.note ?? '')
        setReligion(p.religion ?? '')
        setBloodGroup(p.bloodGroup ?? '')
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user?.teacherId])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const res = await teachersService.updateMyProfile({
        phone: phone || undefined,
        address: address || undefined,
        note: note || undefined,
        religion: religion || undefined,
        bloodGroup: bloodGroup || undefined,
      })
      if (res.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setSaveError(res.message || 'Failed to save changes')
      }
    } catch (err: any) {
      setSaveError(err?.message || 'An unexpected error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  if (!user?.teacherId) return null

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>Teacher profile not found. Contact your administration.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">View and update your personal information</p>
      </div>

      {/* Read-only info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Professional Information
          </CardTitle>
          <CardDescription>These details are managed by the school administration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={`${profile.firstName} ${profile.lastName}`} />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.user?.email} />
            <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Employee ID" value={profile.employeeId} />
            <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Qualification" value={profile.qualification} />
            <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Designation" value={profile.designation} />
            <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Department" value={profile.department} />
            <InfoRow icon={<Building2 className="h-4 w-4" />} label="Campus" value={profile.campus?.name} />
            <InfoRow icon={<Calendar className="h-4 w-4" />} label="Join Date" value={profile.joinDate ? new Date(profile.joinDate).toLocaleDateString() : undefined} />
            {profile.specialization && (
              <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Specialization" value={profile.specialization} />
            )}
            {profile.experience && (
              <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Experience" value={profile.experience} />
            )}
          </div>

          {profile.classTeacherOf && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Class Teacher Of:</span>
                <Badge variant="secondary">{profile.classTeacherOf.name}</Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Assigned Classes */}
      {profile.classAssignments && profile.classAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> My Class Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.classAssignments.map((a, i) => (
                <Badge key={i} variant="outline" className="px-3 py-1.5">
                  {a.class.name}
                  {a.section ? ` — ${a.section.name}` : ''}
                  {a.subject ? ` (${a.subject.name})` : ''}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editable fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Personal & Contact Information
          </CardTitle>
          <CardDescription>You can update these details yourself</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="h-3.5 w-3.5 inline mr-1" /> Phone Number
              </Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Input id="bloodGroup" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} placeholder="e.g. A+" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
              <Input id="religion" value={religion} onChange={e => setReligion(e.target.value)} placeholder="Enter religion" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">
              <MapPin className="h-3.5 w-3.5 inline mr-1" /> Address
            </Label>
            <Textarea id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter your address" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Personal Notes</Label>
            <Textarea id="note" value={note} onChange={e => setNote(e.target.value)} placeholder="Any personal notes..." rows={2} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Saved successfully
              </span>
            )}
            {saveError && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                ⚠ {saveError}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '—'}</p>
      </div>
    </div>
  )
}
