'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useSession } from '@/context/session-context'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ImageUpload } from '@/components/ui/image-upload'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Building2, User, Lock, Palette, MapPin, Plus, Pencil, Trash2, GraduationCap, Calendar, Star, MoreHorizontal, Phone, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function SettingsPage() {
  const { user, hasPermission, updateUser } = useAuth()
  const { academicYears: sessionYears, refreshYears, isLoading: sessionYearsLoading } = useSession()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'profile'
  const [saving, setSaving] = useState(false)

  // Profile form
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '', avatar: '' })

  // Password form
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  // School settings
  const [school, setSchool] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    subscriptionPlan: null as null | { slug?: string; name?: string; maxCampuses?: number | null },
    settings: { branding: { primaryColor: '#2563eb' } },
  })

  // Campus management
  interface CampusItem {
    id: string
    name: string
    code: string
    address?: string
    phone?: string
    isActive: boolean
    _count?: { classes: number; teachers: number; users: number }
  }
  const [campuses, setCampuses] = useState<CampusItem[]>([])
  const [campusLoading, setCampusLoading] = useState(false)
  const [campusDialogOpen, setCampusDialogOpen] = useState(false)
  const [editingCampus, setEditingCampus] = useState<CampusItem | null>(null)
  const [campusForm, setCampusForm] = useState({ name: '', code: '', address: '', phone: '' })
  const [deletingCampusId, setDeletingCampusId] = useState<string | null>(null)

  // Grading scales
  interface GradingScaleItem {
    id: string
    name: string
    minPercent: number
    maxPercent: number
    gpa?: number
    description?: string
  }
  const [gradingScales, setGradingScales] = useState<GradingScaleItem[]>([])
  const [gradingLoading, setGradingLoading] = useState(false)
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false)
  const [editingGradingScale, setEditingGradingScale] = useState<GradingScaleItem | null>(null)
  const [gradingForm, setGradingForm] = useState({ name: '', minPercent: 0, maxPercent: 100, gpa: 4.0, description: '' })
  const [deletingGradingId, setDeletingGradingId] = useState<string | null>(null)

  // Academic Years
  interface AcademicYearItem {
    id: string
    name: string
    startDate: string
    endDate: string
    isCurrent: boolean
    isActive: boolean
  }
  // Use session context data (same source as the header year switcher)
  const academicYears = sessionYears as AcademicYearItem[]
  const yearsLoading = sessionYearsLoading
  const [yearDialogOpen, setYearDialogOpen] = useState(false)
  const [editingYear, setEditingYear] = useState<AcademicYearItem | null>(null)
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false })

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: (user as any).phone || '',
        avatar: (user as any).avatar || '',
      })
    }
  }, [user])

  const fetchSchool = useCallback(async () => {
    const res = await api.get<any>('/schools/profile')
    if (res.success && res.data) {
      setSchool({
        name: res.data.name || '',
        code: res.data.code || '',
        address: res.data.address || '',
        phone: res.data.phone || '',
        email: res.data.email || '',
        website: res.data.website || '',
        logo: res.data.logo || '',
        subscriptionPlan: res.data.subscriptionPlan || null,
        settings: res.data.settings || { branding: { primaryColor: '#2563eb' } },
      })
    }
  }, [])

  useEffect(() => { fetchSchool() }, [fetchSchool])

  // ─── Campus CRUD ──────────────────────────────────────────────
  const fetchCampuses = useCallback(async () => {
    setCampusLoading(true)
    try {
      const res = await api.get<any>('/campuses?pageSize=100&sortBy=name&sortOrder=asc')
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.data || []
        setCampuses(list)
      }
    } catch { /* ignore */ } finally {
      setCampusLoading(false)
    }
  }, [])

  useEffect(() => { fetchCampuses() }, [fetchCampuses])

  // ─── Grading Scales CRUD ───────────────────────────────────────
  const fetchGradingScales = useCallback(async () => {
    setGradingLoading(true)
    try {
      const res = await api.get<GradingScaleItem[]>('/exams/grading-scales')
      if (res.success && res.data) {
        setGradingScales(res.data)
      }
    } catch { /* ignore */ } finally {
      setGradingLoading(false)
    }
  }, [])

  useEffect(() => { fetchGradingScales() }, [fetchGradingScales])

  // ─── Academic Years CRUD ───────────────────────────────────────
  const openYearDialog = (year?: AcademicYearItem) => {
    if (year) {
      setEditingYear(year)
      setYearForm({
        name: year.name,
        startDate: year.startDate?.slice(0, 10) || '',
        endDate: year.endDate?.slice(0, 10) || '',
        isCurrent: year.isCurrent,
      })
    } else {
      setEditingYear(null)
      setYearForm({ name: '', startDate: '', endDate: '', isCurrent: false })
    }
    setYearDialogOpen(true)
  }

  const handleSaveYear = async () => {
    if (!yearForm.name.trim() || !yearForm.startDate || !yearForm.endDate) {
      toast.error('Name, start date and end date are required')
      return
    }
    setSaving(true)
    try {
      const body = { name: yearForm.name, startDate: yearForm.startDate, endDate: yearForm.endDate, isCurrent: yearForm.isCurrent }
      const res = editingYear
        ? await api.patch(`/academic-years/${editingYear.id}`, body)
        : await api.post('/academic-years', body)
      if (res.success) {
        toast.success(editingYear ? 'Academic year updated' : 'Academic year created')
        setYearDialogOpen(false)
        refreshYears()
      } else {
        toast.error(res.message || 'Failed to save academic year')
      }
    } finally { setSaving(false) }
  }

  const confirmDialog = useConfirmDialog()

  const handleDeleteYear = async (id: string) => {
    confirmDialog.showConfirm('Delete Academic Year', 'Delete this academic year? This cannot be undone.', async () => {
      const res = await api.delete(`/academic-years/${id}`)
      if (res.success) {
        toast.success('Academic year deleted')
        refreshYears()
      } else {
        toast.error(res.message || 'Failed to delete academic year')
      }
    }, true)
  }

  const handleSetDefaultYear = async (id: string) => {
    const res = await api.patch(`/academic-years/${id}`, { isCurrent: true })
    if (res.success) {
      toast.success('Academic year set as current')
      refreshYears()
    } else {
      toast.error(res.message || 'Failed to set default year')
    }
  }

  const openGradingDialog = (scale?: GradingScaleItem) => {
    if (scale) {
      setEditingGradingScale(scale)
      setGradingForm({
        name: scale.name,
        minPercent: scale.minPercent,
        maxPercent: scale.maxPercent,
        gpa: scale.gpa || 0,
        description: scale.description || '',
      })
    } else {
      setEditingGradingScale(null)
      setGradingForm({ name: '', minPercent: 0, maxPercent: 100, gpa: 4.0, description: '' })
    }
    setGradingDialogOpen(true)
  }

  const handleSaveGradingScale = async () => {
    if (!gradingForm.name.trim()) {
      toast.error('Grade Name is required')
      return
    }
    if (gradingForm.minPercent >= gradingForm.maxPercent) {
      toast.error('Min percentage must be less than max percentage')
      return
    }
    setSaving(true)
    try {
      if (editingGradingScale) {
        const res = await api.patch(`/exams/grading-scales/${editingGradingScale.id}`, {
          name: gradingForm.name,
          minPercent: gradingForm.minPercent,
          maxPercent: gradingForm.maxPercent,
          gpa: gradingForm.gpa || undefined,
        })
        if (res.success) {
          toast.success('Grading scale updated')
          setGradingDialogOpen(false)
          fetchGradingScales()
        } else {
          toast.error(res.message || 'Failed to update grading scale')
        }
      } else {
        const res = await api.post('/exams/grading-scales', gradingForm)
        if (res.success) {
          toast.success('Grading scale created')
          setGradingDialogOpen(false)
          fetchGradingScales()
        } else {
          toast.error(res.message || 'Failed to create grading scale')
        }
      }
    } finally { setSaving(false) }
  }

  const handleDeleteGradingScale = async (id: string) => {
    setDeletingGradingId(id)
    try {
      const res = await api.delete(`/exams/grading-scales/${id}`)
      if (res.success) {
        toast.success('Grading scale deleted')
        fetchGradingScales()
      } else {
        toast.error(res.message || 'Failed to delete grading scale')
      }
    } finally { setDeletingGradingId(null) }
  }

  const openCampusDialog = (campus?: CampusItem) => {
    if (campus) {
      setEditingCampus(campus)
      setCampusForm({ name: campus.name, code: campus.code, address: campus.address || '', phone: campus.phone || '' })
    } else {
      setEditingCampus(null)
      setCampusForm({ name: '', code: '', address: '', phone: '' })
    }
    setCampusDialogOpen(true)
  }

  const handleSaveCampus = async () => {
    if (!campusForm.name.trim() || !campusForm.code.trim()) {
      toast.error('Name and Code are required')
      return
    }
    setSaving(true)
    try {
      if (editingCampus) {
        const res = await api.patch(`/campuses/${editingCampus.id}`, {
          name: campusForm.name,
          address: campusForm.address || undefined,
          phone: campusForm.phone || undefined,
        })
        if (res.success) {
          toast.success('Campus updated')
          setCampusDialogOpen(false)
          fetchCampuses()
        } else {
          toast.error(res.message || 'Failed to update campus')
        }
      } else {
        const res = await api.post('/campuses', campusForm)
        if (res.success) {
          toast.success('Campus created')
          setCampusDialogOpen(false)
          fetchCampuses()
        } else {
          toast.error(res.message || 'Failed to create campus')
        }
      }
    } finally { setSaving(false) }
  }

  const handleDeleteCampus = async (id: string) => {
    setDeletingCampusId(id)
    try {
      const res = await api.delete(`/campuses/${id}`)
      if (res.success) {
        toast.success('Campus deleted')
        fetchCampuses()
      } else {
        toast.error(res.message || 'Failed to delete campus')
      }
    } finally { setDeletingCampusId(null) }
  }

  const handleToggleCampusActive = async (campus: CampusItem) => {
    const res = await api.patch(`/campuses/${campus.id}`, { isActive: !campus.isActive })
    if (res.success) {
      toast.success(campus.isActive ? 'Campus deactivated' : 'Campus activated')
      fetchCampuses()
    } else {
      toast.error(res.message || 'Failed')
    }
  }

  const handleUpdateProfile = async () => {
    setSaving(true)
    try {
      const res = await api.patch('/users/me', { firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone || undefined })
      if (res.success) {
        updateUser({ firstName: profile.firstName, lastName: profile.lastName })
        toast.success('Profile updated')
      } else toast.error(res.message || 'Failed')
    } finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      if (res.success) {
        toast.success('Password changed')
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
        if (user?.mustChangePassword) {
          updateUser({ mustChangePassword: false })
        }
      } else {
        toast.error(res.message || 'Failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSchool = async () => {
    setSaving(true)
    try {
      // Only send fields the backend DTO accepts — exclude subscriptionPlan, etc.
      const payload: Record<string, any> = {
        name: school.name || undefined,
        code: school.code || undefined,
        address: school.address || undefined,
        phone: school.phone || undefined,
        email: school.email || undefined,       // empty string → undefined (avoids @IsEmail fail)
        website: school.website || undefined,
        logo: school.logo || undefined,
        settings: school.settings,
      }
      const res = await api.patch('/schools/profile', payload)
      if (res.success) {
        updateUser({ schoolName: payload.name, schoolLogo: payload.logo })
        toast.success('School settings updated. Refresh to apply all changes.')
      } else {
        toast.error(res.message || 'Failed to update school settings')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    // We use a custom fetch or extend the api client if it doesn't support FormData
    // Let's assume api.post handles FormData or we use raw fetch
    try {
      const res = await api.post<any>('/users/me/avatar', formData)
      if (res.success) {
        const avatarUrl = res.data.avatar
        setProfile(prev => ({ ...prev, avatar: avatarUrl }))
        updateUser({ avatar: avatarUrl })
        return avatarUrl
      }
      throw new Error(res.message || 'Upload failed')
    } catch (error: any) {
      toast.error(error.message || 'Avatar upload failed')
      throw error
    }
  }

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await api.post<any>('/schools/profile/logo', formData)
      if (res.success) {
        const logoUrl = res.data.logo
        setSchool(prev => ({ ...prev, logo: logoUrl }))
        updateUser({ schoolLogo: logoUrl })
        return logoUrl
      }
      throw new Error(res.message || 'Upload failed')
    } catch (error: any) {
      toast.error(error.message || 'Logo upload failed')
      throw error
    }
  }

  const handleAvatarDelete = async () => {
    const res = await api.delete('/users/me/avatar')
    // We treat 200 or 204 as success
    if (res.success || res.statusCode === 204) {
      setProfile(prev => ({ ...prev, avatar: '' }))
      updateUser({ avatar: '' })
    } else {
      throw new Error(res.message || 'Failed to delete avatar')
    }
  }

  const handleLogoDelete = async () => {
    const res = await api.delete('/schools/profile/logo')
    if (res.success || res.statusCode === 204) {
      setSchool(prev => ({ ...prev, logo: '' }))
      updateUser({ schoolLogo: '' })
    } else {
      throw new Error(res.message || 'Failed to delete school logo')
    }
  }

  const canEditSchool = hasPermission('schools:update') || user?.isPlatformAdmin
  const isCampusCreationLocked =
    school.subscriptionPlan?.slug === 'free' ||
    (school.subscriptionPlan?.maxCampuses != null && school.subscriptionPlan.maxCampuses <= 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your school and account settings</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="password"><Lock className="mr-2 h-4 w-4" />Password</TabsTrigger>
          <TabsTrigger value="school"><Building2 className="mr-2 h-4 w-4" />School</TabsTrigger>
          <TabsTrigger value="campuses"><MapPin className="mr-2 h-4 w-4" />Campuses</TabsTrigger>
          <TabsTrigger value="academic-years"><Calendar className="mr-2 h-4 w-4" />Academic Years</TabsTrigger>
          <TabsTrigger value="grading"><GraduationCap className="mr-2 h-4 w-4" />Grading</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardBody className="p-6 md:p-8 space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Profile Information</h2>
                <p className="text-sm text-muted-foreground mt-1">Update your personal account details.</p>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-4xl">
                <div className="md:col-span-1 flex flex-col items-center gap-4">
                  <Label>Profile Picture</Label>
                  <ImageUpload 
                    value={profile.avatar} 
                    onChange={(url) => setProfile({ ...profile, avatar: url })}
                    onUpload={handleAvatarUpload}
                    onRemove={handleAvatarDelete}
                    className="w-32 h-32"
                  />
                  <p className="text-[10px] text-muted-foreground text-center">
                    Square image works best. Max 5MB.
                  </p>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="grid gap-2"><Label>First Name</Label><Input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>Last Name</Label><Input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} /></div>
                  <div className="grid gap-2 sm:col-span-2"><Label>Phone</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
                  <div className="grid gap-2 sm:col-span-2"><Label>Email</Label><Input value={user?.email || ''} disabled className="bg-muted" /></div>
                </div>
              </div>
              <Button onClick={handleUpdateProfile} disabled={saving} className="w-fit">{saving ? 'Saving...' : 'Save Changes'}</Button>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <Card>
            <CardBody className="p-6 md:p-8 space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Change Password</h2>
                <p className="text-sm text-muted-foreground mt-1">Ensure your account is using a long, random password to stay secure.</p>
              </div>
              <div className="grid gap-6 max-w-sm">
                <div className="grid gap-2"><Label>Current Password</Label><Input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} /></div>
                <div className="grid gap-2"><Label>New Password</Label><Input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Confirm New Password</Label><Input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} /></div>
              </div>
              <Button onClick={handleChangePassword} disabled={saving || !passwords.currentPassword || !passwords.newPassword} className="w-fit">{saving ? 'Changing...' : 'Change Password'}</Button>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="school" className="mt-6">
          <Card>
            <CardBody className="p-6 md:p-8 space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">School Information</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {canEditSchool
                      ? 'Update your school profile, code, and branding.'
                      : 'View your school details. Contact your administrator to make changes.'}
                  </p>
                </div>
                {canEditSchool && (
                  <Button onClick={handleUpdateSchool} disabled={saving} className="w-full sm:w-fit">
                    {saving ? 'Saving...' : 'Save School Settings'}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label>School Name</Label>
                      <Input
                        value={school.name}
                        onChange={(e) => setSchool({ ...school, name: e.target.value })}
                        disabled={!canEditSchool}
                        className={!canEditSchool ? 'bg-muted' : ''}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>School Code (Invoice Prefix)</Label>
                      <Input
                        value={school.code}
                        onChange={(e) => setSchool({ ...school, code: e.target.value.toUpperCase() })}
                        disabled={!canEditSchool}
                        className={!canEditSchool ? 'bg-muted font-mono' : 'font-mono uppercase'}
                        placeholder="e.g. TCF"
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Address</Label>
                    <Input
                      value={school.address}
                      onChange={(e) => setSchool({ ...school, address: e.target.value })}
                      disabled={!canEditSchool}
                      className={!canEditSchool ? 'bg-muted' : ''}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label>Phone</Label>
                      <Input
                        value={school.phone}
                        onChange={(e) => setSchool({ ...school, phone: e.target.value })}
                        disabled={!canEditSchool}
                        className={!canEditSchool ? 'bg-muted' : ''}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <Input
                        value={school.email}
                        onChange={(e) => setSchool({ ...school, email: e.target.value })}
                        disabled={!canEditSchool}
                        className={!canEditSchool ? 'bg-muted' : ''}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Website</Label>
                    <Input
                      value={school.website}
                      onChange={(e) => setSchool({ ...school, website: e.target.value })}
                      disabled={!canEditSchool}
                      className={!canEditSchool ? 'bg-muted' : ''}
                    />
                  </div>
                </div>

                <div className="space-y-6 rounded-xl border border-border bg-slate-50/50 p-6 dark:bg-slate-900/20">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Palette className="h-4 w-4 text-primary-600" />
                    Branding
                  </div>

                  <div className="space-y-6">
                    <div className="grid gap-2">
                      <Label>School Logo</Label>
                      <ImageUpload
                        value={school.logo}
                        onChange={(url) => setSchool({ ...school, logo: url })}
                        onUpload={handleLogoUpload}
                        onRemove={handleLogoDelete}
                        disabled={!canEditSchool}
                        aspectRatio="square"
                        className="w-32 h-32 mx-auto"
                      />
                      <p className="text-[10px] text-muted-foreground text-center">
                        Upload your school logo. Max 5MB.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Primary Branding Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="h-10 w-16 cursor-pointer p-1"
                          value={school.settings?.branding?.primaryColor || '#2563eb'}
                          onChange={(e) =>
                            setSchool({
                              ...school,
                              settings: {
                                ...school.settings,
                                branding: {
                                  ...school.settings?.branding,
                                  primaryColor: e.target.value,
                                },
                              },
                            })
                          }
                          disabled={!canEditSchool}
                        />
                        <Input
                          value={school.settings?.branding?.primaryColor || '#2563eb'}
                          onChange={(e) =>
                            setSchool({
                              ...school,
                              settings: {
                                ...school.settings,
                                branding: {
                                  ...school.settings?.branding,
                                  primaryColor: e.target.value,
                                },
                              },
                            })
                          }
                          disabled={!canEditSchool}
                          placeholder="#2563eb"
                          className="font-mono"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used for buttons, links, and navigation accents.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </TabsContent>

        {/* ─── Campuses Tab ──────────────────────────────────────── */}
        <TabsContent value="campuses" className="mt-6">
          <Card>
            <CardBody className="p-6 md:p-8 space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Campus Management</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your school campuses. Classes, teachers, and students can be assigned to specific campuses.
                  </p>
                </div>
                {canEditSchool && !isCampusCreationLocked && (
                  <Button onClick={() => openCampusDialog()} size="sm" className="w-full sm:w-fit">
                    <Plus className="mr-2 h-4 w-4" />Add Campus
                  </Button>
                )}
              </div>

              {isCampusCreationLocked && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 px-4 py-3 text-sm text-orange-800 dark:text-orange-300">
                  Campus creation is locked for your current plan. Upgrade your plan to add more campuses.
                </div>
              )}

              <div className="mt-2">
                {campusLoading ? (
                  <div className="flex justify-center py-12 text-muted-foreground">Loading campuses...</div>
                ) : campuses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl">
                    <MapPin className="mb-4 h-12 w-12 text-muted-foreground/30" />
                    <h3 className="text-lg font-medium text-foreground">No campuses yet</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Add campuses to organize your classes, teachers, and students by location.
                    </p>
                    {canEditSchool && !isCampusCreationLocked && (
                      <Button onClick={() => openCampusDialog()} className="mt-6" size="sm">
                        <Plus className="mr-2 h-4 w-4" />Add Your First Campus
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop View */}
                    <div className="hidden sm:block overflow-x-auto rounded-xl border border-border shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="px-6 py-4 text-left font-semibold text-foreground">Campus</th>
                            <th className="px-6 py-4 text-left font-semibold text-foreground">Code</th>
                            <th className="px-6 py-4 text-left font-semibold text-foreground">Address</th>
                            <th className="px-4 py-4 text-center font-semibold text-foreground">Classes</th>
                            <th className="px-4 py-4 text-center font-semibold text-foreground">Teachers</th>
                            <th className="px-4 py-4 text-center font-semibold text-foreground">Status</th>
                            {canEditSchool && (
                              <th className="px-6 py-4 text-right font-semibold text-foreground">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {campuses.map((campus) => (
                            <tr key={campus.id} className="hover:bg-muted/30 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="font-medium text-foreground">{campus.name}</div>
                                {campus.phone && <div className="text-xs text-muted-foreground mt-0.5">{campus.phone}</div>}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground font-mono text-xs uppercase tracking-wider">{campus.code}</td>
                              <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">{campus.address || '—'}</td>
                              <td className="px-4 py-4 text-center">{campus._count?.classes ?? 0}</td>
                              <td className="px-4 py-4 text-center">{campus._count?.teachers ?? 0}</td>
                              <td className="px-4 py-4 text-center">
                                <Badge
                                  variant={campus.isActive ? 'default' : 'secondary'}
                                  className={cn("cursor-pointer", !campus.isActive && "bg-muted text-muted-foreground opacity-70")}
                                  onClick={() => canEditSchool && handleToggleCampusActive(campus)}
                                >
                                  {campus.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              {canEditSchool && (
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-1 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => openCampusDialog(campus)} className="h-8 w-8 p-0">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteCampus(campus.id)}
                                      disabled={deletingCampusId === campus.id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="sm:hidden space-y-4">
                      {campuses.map((campus) => (
                        <div key={campus.id} className="group bg-card hover:bg-muted/5 transition-all p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-4 relative overflow-hidden">
                          {/* Decorative Background Icon */}
                          <div className="absolute -right-4 -top-4 p-8 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                          <MapPin className="absolute -right-2 -top-2 h-16 w-16 text-primary/5 -rotate-12 transition-transform group-hover:scale-110" />

                          <div className="flex items-start justify-between relative">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center border transition-colors",
                                campus.isActive ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                              )}>
                                <Building2 className="h-6 w-6" />
                              </div>
                              <div className="space-y-0.5">
                                <h3 className="font-bold text-foreground leading-tight">{campus.name}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {campus.code}
                                  </span>
                                  <Badge 
                                    variant={campus.isActive ? 'default' : 'secondary'} 
                                    className={cn("h-4 px-1 text-[9px] uppercase font-bold", !campus.isActive && "opacity-60")}
                                  >
                                    {campus.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            {canEditSchool && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5">
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => openCampusDialog(campus)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Campus
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className={cn("text-primary", !campus.isActive && "text-green-600")}
                                    onClick={() => handleToggleCampusActive(campus)}
                                  >
                                    <Building2 className="mr-2 h-4 w-4" /> {campus.isActive ? 'Deactivate' : 'Activate'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/5" 
                                    onClick={() => handleDeleteCampus(campus.id)}
                                    disabled={deletingCampusId === campus.id}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Campus
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 relative">
                            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Classes</span>
                              <span className="text-sm font-bold text-foreground">{campus._count?.classes ?? 0}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Teachers</span>
                              <span className="text-sm font-bold text-foreground">{campus._count?.teachers ?? 0}</span>
                            </div>
                          </div>

                          {(campus.address || campus.phone) && (
                            <div className="space-y-2 pt-1 border-t border-border/50 relative">
                              {campus.address && (
                                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                  <span className="line-clamp-1">{campus.address}</span>
                                </div>
                              )}
                              {campus.phone && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  <span>{campus.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Campus Add/Edit Dialog */}
          <Dialog open={campusDialogOpen} onOpenChange={setCampusDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCampus ? 'Edit Campus' : 'Add Campus'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Campus Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. Main Campus"
                    value={campusForm.name}
                    onChange={(e) => setCampusForm({ ...campusForm, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Code <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. MAIN-01"
                    value={campusForm.code}
                    onChange={(e) => setCampusForm({ ...campusForm, code: e.target.value.toUpperCase() })}
                    disabled={!!editingCampus}
                    className={editingCampus ? 'bg-muted' : ''}
                  />
                  {editingCampus && (
                    <p className="text-xs text-muted-foreground">Campus code cannot be changed after creation.</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="456 Campus Road"
                    value={campusForm.address}
                    onChange={(e) => setCampusForm({ ...campusForm, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+92 300 1234567"
                    value={campusForm.phone}
                    onChange={(e) => setCampusForm({ ...campusForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCampusDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveCampus} disabled={saving}>
                  {saving ? 'Saving...' : editingCampus ? 'Update Campus' : 'Create Campus'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── Academic Years Tab ──────────────────────────────────── */}
        <TabsContent value="academic-years" className="mt-6">
          <Card>
            <CardBody className="p-6 md:p-8 space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Academic Years</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage academic year periods. The current year is used across all campuses.
                  </p>
                </div>
                {canEditSchool && (
                  <Button onClick={() => openYearDialog()} size="sm" className="w-full sm:w-fit">
                    <Plus className="mr-2 h-4 w-4" />Add Year
                  </Button>
                )}
              </div>

              <div className="mt-2">
                {yearsLoading ? (
                  <div className="flex justify-center py-12 text-muted-foreground">Loading academic years...</div>
                ) : academicYears.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl">
                    <Calendar className="mb-4 h-12 w-12 text-muted-foreground/30" />
                    <h3 className="text-lg font-medium text-foreground">No academic years yet</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Create an academic year to start managing classes, exams, and timetables.
                    </p>
                    {canEditSchool && (
                      <Button onClick={() => openYearDialog()} className="mt-6" size="sm">
                        <Plus className="mr-2 h-4 w-4" />Add Your First Year
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop View */}
                    <div className="hidden sm:block overflow-x-auto rounded-xl border border-border shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="px-6 py-4 text-left font-semibold text-foreground">Year</th>
                            <th className="px-6 py-4 text-left font-semibold text-foreground">Start Date</th>
                            <th className="px-6 py-4 text-left font-semibold text-foreground">End Date</th>
                            <th className="px-4 py-4 text-center font-semibold text-foreground">Status</th>
                            {canEditSchool && (
                              <th className="px-6 py-4 text-right font-semibold text-foreground">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {academicYears.map((year) => (
                            <tr key={year.id} className="hover:bg-muted/30 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-foreground">{year.name}</span>
                                  {year.isCurrent && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">{new Date(year.startDate).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-muted-foreground">{new Date(year.endDate).toLocaleDateString()}</td>
                              <td className="px-4 py-4 text-center">
                                <Badge variant={year.isCurrent ? 'default' : 'secondary'}>
                                  {year.isCurrent ? 'Current' : 'Inactive'}
                                </Badge>
                              </td>
                              {canEditSchool && (
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-1">
                                    {!year.isCurrent && (
                                      <Button variant="ghost" size="sm" onClick={() => handleSetDefaultYear(year.id)} className="h-8 px-2 text-xs">
                                        <Star className="mr-1 h-3.5 w-3.5" />Set Default
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => openYearDialog(year)} className="h-8 w-8 p-0">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteYear(year.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="sm:hidden space-y-4">
                      {academicYears.map((year) => (
                        <div key={year.id} className="group bg-card hover:bg-muted/5 transition-all p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-4 relative overflow-hidden">
                          {/* Decorative Background Icon */}
                          <div className="absolute -right-4 -top-4 p-8 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                          <Calendar className="absolute -right-2 -top-2 h-16 w-16 text-primary/5 -rotate-12 transition-transform group-hover:scale-110" />

                          <div className="flex items-start justify-between relative">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center border transition-colors",
                                year.isCurrent ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]" : "bg-muted text-muted-foreground border-border"
                              )}>
                                {year.isCurrent ? <Star className="h-6 w-6 fill-primary" /> : <Calendar className="h-6 w-6" />}
                              </div>
                              <div className="space-y-0.5">
                                <h3 className="font-bold text-foreground leading-tight flex items-center gap-2">
                                  {year.name}
                                  {year.isCurrent && (
                                    <Badge className="h-4 px-1 text-[9px] uppercase font-bold bg-primary text-primary-foreground border-none">Current</Badge>
                                  )}
                                </h3>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>Academic Period</span>
                                </div>
                              </div>
                            </div>
                            {canEditSchool && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5">
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  {!year.isCurrent && (
                                    <DropdownMenuItem onClick={() => handleSetDefaultYear(year.id)}>
                                      <Star className="mr-2 h-4 w-4 text-amber-500" /> Set as Default
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => openYearDialog(year)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Year
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/5" 
                                    onClick={() => handleDeleteYear(year.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Year
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 relative">
                            <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Starts</span>
                              <span className="text-sm font-semibold text-foreground">{new Date(year.startDate).toLocaleDateString()}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Ends</span>
                              <span className="text-sm font-semibold text-foreground">{new Date(year.endDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Academic Year Add/Edit Dialog */}
          <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingYear ? 'Edit Academic Year' : 'Add Academic Year'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Year Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="2025-2026"
                    value={yearForm.name}
                    onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start Date <span className="text-destructive">*</span></Label>
                    <Input
                      type="date"
                      value={yearForm.startDate}
                      onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Date <span className="text-destructive">*</span></Label>
                    <Input
                      type="date"
                      value={yearForm.endDate}
                      onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={yearForm.isCurrent}
                    onChange={(e) => setYearForm({ ...yearForm, isCurrent: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Set as current academic year</span>
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setYearDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveYear} disabled={saving || !yearForm.name || !yearForm.startDate || !yearForm.endDate}>
                  {saving ? 'Saving...' : editingYear ? 'Update Year' : 'Create Year'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── Grading Tab ──────────────────────────────────────── */}
        <TabsContent value="grading" className="mt-6">
          <Card>
            <CardBody className="p-6 md:p-8 space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Grading Scales</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure grade ranges for automatic grade calculation. Example: A (90-100%), B (80-89%), etc.
                  </p>
                </div>
                {canEditSchool && (
                  <Button onClick={() => openGradingDialog()} size="sm" className="w-full sm:w-fit">
                    <Plus className="mr-2 h-4 w-4" />Add Grade
                  </Button>
                )}
              </div>

              <div className="mt-2">
                {gradingLoading ? (
                  <div className="flex justify-center py-12 text-muted-foreground">Loading grading scales...</div>
                ) : gradingScales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl">
                    <GraduationCap className="mb-4 h-12 w-12 text-muted-foreground/30" />
                    <h3 className="text-lg font-medium text-foreground">No grading scales yet</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Add grading scales to automatically calculate grades based on percentage.
                    </p>
                    {canEditSchool && (
                      <Button onClick={() => openGradingDialog()} className="mt-6" size="sm">
                        <Plus className="mr-2 h-4 w-4" />Add Your First Grade
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop View */}
                    <div className="hidden sm:block overflow-x-auto rounded-xl border border-border shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                          <tr>
                            <th className="px-6 py-4 text-left font-semibold text-foreground w-32">Grade</th>
                            <th className="px-6 py-4 text-center font-semibold text-foreground">Range %</th>
                            <th className="px-6 py-4 text-center font-semibold text-foreground">GPA Points</th>
                            <th className="px-6 py-4 text-left font-semibold text-foreground">Status</th>
                            {canEditSchool && (
                              <th className="px-6 py-4 text-right font-semibold text-foreground">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {gradingScales.map((scale) => (
                            <tr key={scale.id} className="hover:bg-muted/30 transition-colors group">
                              <td className="px-6 py-4">
                                <Badge variant="outline" className="text-base font-bold px-4 py-1.5 border-2 border-primary/20 bg-primary/5">
                                  {scale.name}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-sm font-medium">{scale.minPercent}%</span>
                                  <div className="h-px w-4 bg-muted-foreground/30"></div>
                                  <span className="text-sm font-medium">{scale.maxPercent}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center justify-center h-8 w-12 rounded-lg bg-muted font-bold text-primary">
                                  {scale.gpa?.toFixed(1) || '—'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-none">
                                  Active
                                </Badge>
                              </td>
                              {canEditSchool && (
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-1 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => openGradingDialog(scale)} className="h-8 w-8 p-0">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteGradingScale(scale.id)}
                                      disabled={deletingGradingId === scale.id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="sm:hidden space-y-4">
                      {gradingScales.map((scale) => (
                        <div key={scale.id} className="group bg-card hover:bg-muted/5 transition-all p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-4 relative overflow-hidden">
                          {/* Decorative Background Icon */}
                          <div className="absolute -right-4 -top-4 p-8 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                          <GraduationCap className="absolute -right-2 -top-2 h-16 w-16 text-primary/5 -rotate-12 transition-transform group-hover:scale-110" />

                          <div className="flex items-start justify-between relative">
                            <div className="flex items-start gap-4">
                              <div className="h-14 w-14 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]">
                                <span className="text-2xl font-black text-primary">{scale.name}</span>
                              </div>
                              <div className="space-y-1">
                                <h3 className="font-bold text-foreground leading-tight">Grade Level</h3>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                                    <div className="h-1.5 w-1.5 rounded-full bg-current" />
                                    Active
                                  </div>
                                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-muted/30">
                                    Scale {scale.minPercent}% - {scale.maxPercent}%
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            {canEditSchool && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5">
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => openGradingDialog(scale)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Grade
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/5" 
                                    onClick={() => handleDeleteGradingScale(scale.id)}
                                    disabled={deletingGradingId === scale.id}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Grade
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 relative">
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col items-center justify-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">GPA Points</span>
                              <span className="text-xl font-black text-primary">{scale.gpa?.toFixed(1) || '0.0'}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col items-center justify-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Target Range</span>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-bold text-foreground">{scale.minPercent}%</span>
                                <div className="h-px w-2 bg-muted-foreground/30" />
                                <span className="text-sm font-bold text-foreground">{scale.maxPercent}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Grading Scale Add/Edit Dialog */}
          <Dialog open={gradingDialogOpen} onOpenChange={setGradingDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGradingScale ? 'Edit Grade' : 'Add Grade'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Grade Name (e.g. A, B+, Excellent) <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Excellent"
                    value={gradingForm.name}
                    onChange={(e) => setGradingForm({ ...gradingForm, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Min Percentage <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={gradingForm.minPercent}
                      onChange={(e) => setGradingForm({ ...gradingForm, minPercent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Max Percentage <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={gradingForm.maxPercent}
                      onChange={(e) => setGradingForm({ ...gradingForm, maxPercent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>GPA Value</Label>
                  <Input
                    type="number"
                    step={0.1}
                    min={0}
                    max={4}
                    placeholder="4.0"
                    value={gradingForm.gpa}
                    onChange={(e) => setGradingForm({ ...gradingForm, gpa: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Excellent performance"
                    value={gradingForm.description}
                    onChange={(e) => setGradingForm({ ...gradingForm, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGradingDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveGradingScale} disabled={saving}>
                  {saving ? 'Saving...' : editingGradingScale ? 'Update Grade' : 'Create Grade'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={confirmDialog.handleClose}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.handleConfirm}
        confirmLabel="Delete"
      />
    </div >
  )
}
