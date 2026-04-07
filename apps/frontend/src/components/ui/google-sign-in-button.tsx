'use client'

import { GoogleLogin } from '@react-oauth/google'
import env from '@/lib/env'

interface Props {
  onSuccess: (credential: string) => void
  onError?: () => void
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

export function GoogleSignInButton({ onSuccess, onError, text = 'continue_with' }: Props) {
  if (!env.GOOGLE_CLIENT_ID) {
    return (
      <div className="rounded-lg bg-danger-50 p-4 text-center text-sm text-danger-700">
        Google Client ID is missing. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID.
      </div>
    )
  }

  return (
    <div className="flex justify-center w-full">
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) {
            onSuccess(credentialResponse.credential)
          }
        }}
        onError={() => {
          console.error('Google Sign In Failed')
          onError?.()
        }}
        useOneTap={false}
        text={text}
        theme="outline"
        size="large"
        shape="rectangular"
        width="384"
        logo_alignment="center"
      />
    </div>
  )
}
