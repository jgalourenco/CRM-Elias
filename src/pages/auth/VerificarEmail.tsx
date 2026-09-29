import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Sparkles } from 'lucide-react'

export default function VerificarEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVerifying(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [token])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F6F3] p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in text-center">
        <div className="space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-[#166A5A] to-[#0F5145] items-center justify-center text-white shadow-lg shadow-[#166A5A]/25 mb-1">
            <Sparkles className="h-6 w-6 text-[#C9A227]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C2B29]">
            Clínica Seleta
          </h1>
        </div>

        <Card className="rounded-2xl border-[#E3E7E5] shadow-xl bg-white p-6 space-y-4">
          {verifying ? (
            <div className="py-6 space-y-3 flex flex-col items-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#166A5A] border-t-transparent" />
              <p className="text-sm font-medium text-[#667C78]">
                Validando confirmação de e-mail...
              </p>
            </div>
          ) : (
            <CardContent className="pt-2 pb-2 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold text-[#1C2B29]">
                E-mail Confirmado com Sucesso!
              </CardTitle>
              <p className="text-xs text-[#667C78]">
                Sua conta foi ativada no sistema da Clínica Seleta. Você já pode fazer login na
                plataforma.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
                >
                  Entrar no CRM
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
