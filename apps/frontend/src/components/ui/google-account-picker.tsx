'use client'

import { GoogleLogin } from '@react-oauth/google'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export interface GoogleAccount {
  email: string
  name: string
  picture?: string
  googleId: string
}

interface Props {
  account: GoogleAccount | null
  onChange: (account: GoogleAccount | null, credential?: string) => void
  disabled?: boolean
}

export function GoogleAccountPicker({ account, onChange, disabled }: Props) {
  if (account) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
        <div className="flex items-center gap-3">
          {account.picture ? (
            <img src={account.picture} alt={account.name} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {account.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{account.name}</p>
            <p className="text-xs text-muted-foreground">{account.email}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          disabled={disabled}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex justify-center w-full [&>div]:w-full">
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) {
            try {
              // Decode JWT payload without a library
              const base64Url = credentialResponse.credential.split('.')[1]
              const base64 = base64Url.replace(/-/g, '+').replace(/_/, '/')
              const decoded = JSON.parse(window.atob(base64))

              onChange(
                {
                  email: decoded.email,
                  name: decoded.name,
                  picture: decoded.picture,
                  googleId: decoded.sub,
                },
                credentialResponse.credential,
              )
            } catch (err) {
              console.error('Failed to parse Google credential', err)
            }
          }
        }}
        onError={() => {
          console.error('Google Sign In Failed')
        }}
        useOneTap={false}
        text="continue_with"
        width="100%"
      />
    </div>
  )
}
