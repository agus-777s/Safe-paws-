import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { abrirConversacion } from '@/services/supabase/chat'
import { mensajeError } from '@/utils/errores'

/** Abre (o crea) la conversación con otra persona y navega a ella. */
export function useAbrirChat() {
  const navigate = useNavigate()
  const [abriendo, setAbriendo] = useState(false)
  const [errorChat, setErrorChat] = useState<string | null>(null)

  const abrirChat = useCallback(
    async (otroId: string) => {
      setAbriendo(true)
      setErrorChat(null)
      try {
        const conversacionId = await abrirConversacion(otroId)
        navigate(`/mensajes/${conversacionId}`)
      } catch (e) {
        setErrorChat(mensajeError(e))
        setAbriendo(false)
      }
    },
    [navigate],
  )

  return { abrirChat, abriendo, errorChat }
}
