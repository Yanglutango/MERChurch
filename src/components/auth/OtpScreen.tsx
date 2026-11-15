import { useCallback, useEffect, useRef, useState } from 'react'
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp'
import { AlertCircle, Check, ClipboardPaste, Loader2, RotateCw } from 'lucide-react'
import { Logo } from '../ui/logo'

export type OtpStatus = 'idle' | 'verifying' | 'success' | 'error'

// ⚠️ Tem de coincidir com o tamanho do código que o backend envia.
// O AuthPage já usava maxLength={4} e a tradução fala em "4 dígitos".
// Se o teu backend enviar 6, muda só este número — tudo o resto adapta-se.
export const OTP_LENGTH = 4

interface OtpScreenProps {
  email: string
  status: OtpStatus
  errorMessage?: string | null
  resending?: boolean
  length?: number
  onSubmit: (code: string) => void
  onTyping: () => void
  onResend: () => void
  onBack: () => void
}

type ClipboardResult = 'ok' | 'empty' | 'used' | 'denied' | 'unsupported'

// Procura um grupo de exactamente `length` dígitos isolado. Assim "O seu código
// é 4821." funciona, mas um telefone de 9 dígitos não é confundido com um código.
const extractCode = (text: string, length: number): string | null => {
  const match = text.match(new RegExp(`(?:^|\\D)(\\d{${length}})(?!\\d)`))
  return match ? match[1] : null
}

export default function OtpScreen({
  email,
  status,
  errorMessage,
  resending = false,
  length = OTP_LENGTH,
  onSubmit,
  onTyping,
  onResend,
  onBack,
}: OtpScreenProps) {
  const [value, setValue] = useState('')
  const [flash, setFlash] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const usedCodesRef = useRef<Set<string>>(new Set())
  const statusRef = useRef(status)
  statusRef.current = status

  const locked = status === 'verifying' || status === 'success'

  const applyCode = useCallback((code: string) => {
    if (statusRef.current === 'verifying' || statusRef.current === 'success') return
    setValue(code)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 650)
  }, [])

  // silent=true  → só lê se o browser JÁ concedeu permissão (nunca abre um pedido
  //                de permissão por surpresa) e nunca reaplica um código já usado,
  //                para não entrar em ciclo depois de um erro.
  // silent=false → chamado por um clique do utilizador (gesto válido em todos os
  //                browsers, incluindo o balão "Colar" do Safari/iOS).
  const readClipboard = useCallback(
    async (silent: boolean): Promise<ClipboardResult> => {
      try {
        if (!navigator.clipboard?.readText) return 'unsupported'

        if (silent) {
          const permission = await navigator.permissions?.query({
            name: 'clipboard-read' as PermissionName,
          })
          if (permission?.state !== 'granted') return 'denied'
        }

        const text = await navigator.clipboard.readText()
        const code = extractCode(text, length)
        if (!code) return 'empty'
        if (silent && usedCodesRef.current.has(code)) return 'used'

        applyCode(code)
        return 'ok'
      } catch {
        return 'denied'
      }
    },
    [applyCode, length]
  )

  // Ao abrir o ecrã e ao voltar do email (o separador volta a ficar visível),
  // tenta preencher a partir da área de transferência.
  useEffect(() => {
    const run = () => {
      if (document.visibilityState === 'visible') void readClipboard(true)
    }
    run()
    document.addEventListener('visibilitychange', run)
    window.addEventListener('focus', run)
    return () => {
      document.removeEventListener('visibilitychange', run)
      window.removeEventListener('focus', run)
    }
  }, [readClipboard])

  // Erro: deixa o abanão e a cor vermelha serem vistos, depois limpa e volta ao 1.º campo.
  useEffect(() => {
    if (status !== 'error') return
    const id = window.setTimeout(() => {
      setValue('')
      inputRef.current?.focus()
    }, 650)
    return () => window.clearTimeout(id)
  }, [status])

  const handleChange = (next: string) => {
    setValue(next)
    setNote(null)
    if (status === 'error') onTyping()
  }

  // Auto-submit: o input-otp chama onComplete assim que o último dígito entra
  // (digitado, colado ou preenchido pelo teclado/clipboard).
  const handleComplete = (code: string) => {
    usedCodesRef.current.add(code)
    onSubmit(code)
  }

  // Colar um texto inteiro ("O seu código é 4821") também funciona.
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const code = extractCode(e.clipboardData.getData('text'), length)
    if (code) {
      e.preventDefault()
      applyCode(code)
    }
  }

  const handlePasteClick = async () => {
    setNote(null)
    const result = await readClipboard(false)
    if (result === 'empty') setNote('Nada para colar')
    else if (result === 'denied' || result === 'unsupported') setNote('Cole no campo')
    inputRef.current?.focus()
  }

  return (
    <div className="otp-root relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      <style>{STYLES}</style>

      <div className="otp-iri" aria-hidden="true">
        <span className="otp-sheen" />
      </div>

      <main className="relative z-10 w-full max-w-[400px] rounded-3xl bg-card/80 px-6 py-9 text-center shadow-[0_24px_70px_-24px_hsl(215_45%_10%/0.45)] backdrop-blur-xl sm:px-9">
        <div className="mx-auto mb-5 w-fit">
          <Logo size="md" showText={false} animated={false} />
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-foreground">Digite o código</h1>

        <p className="mt-1.5 flex items-center justify-center gap-2 text-sm text-foreground/70">
          <span className="max-w-[210px] truncate">{email}</span>
          <button
            type="button"
            onClick={onBack}
            disabled={locked}
            className="rounded font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            Alterar
          </button>
        </p>

        <div className="mt-7">
          <OTPInput
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onComplete={handleComplete}
            onPaste={handlePaste}
            maxLength={length}
            pattern={REGEXP_ONLY_DIGITS}
            disabled={locked}
            autoFocus
            aria-label="Código de verificação"
            render={({ slots }) => (
              <div
                className="otp-tiles"
                data-status={status}
                data-flash={flash}
                style={{ '--otp-n': length } as React.CSSProperties}
              >
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    className="otp-tile"
                    data-active={slot.isActive}
                    data-filled={slot.char !== null}
                    style={{ '--i': i } as React.CSSProperties}
                  >
                    {slot.char !== null ? (
                      <span key={`${i}-${slot.char}`} className="otp-char">
                        {slot.char}
                      </span>
                    ) : slot.hasFakeCaret ? (
                      <span className="otp-caret" />
                    ) : (
                      <span className="otp-dash" />
                    )}
                  </div>
                ))}
              </div>
            )}
          />
        </div>

        <div
          className="mt-5 flex min-h-6 items-center justify-center gap-2 text-sm"
          role="status"
          aria-live="polite"
        >
          {status === 'verifying' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              <span className="text-foreground/80">A verificar</span>
            </>
          )}
          {status === 'success' && (
            <>
              <span className="otp-check" aria-hidden="true">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="font-medium text-emerald-700 dark:text-emerald-300">Confirmado</span>
            </>
          )}
          {status === 'error' && errorMessage && (
            <>
              <AlertCircle className="h-4 w-4 shrink-0 text-red-700 dark:text-red-300" aria-hidden="true" />
              <span className="font-medium text-red-700 dark:text-red-300">{errorMessage}</span>
            </>
          )}
          {status === 'idle' && note && <span className="text-foreground/70">{note}</span>}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={handlePasteClick}
            disabled={locked}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <ClipboardPaste className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Colar
          </button>
          <button
            type="button"
            onClick={onResend}
            disabled={locked || resending}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
            Reenviar
          </button>
        </div>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Estilos do ecrã. Ficam aqui para a peça ser auto-contida (sem mexer no
   tailwind.config nem no index.css). Cores = as da marca (teal 196°, dourado
   ~34°, navy 210°) com valores HSL explícitos por modo — não opacidade sobre o
   fundo, que era o que ficava lavado no light.
   ───────────────────────────────────────────────────────────────────────────── */
const STYLES = `
.otp-root{
  --otp-tile: 215 24% 88%;
  --otp-inset: 215 45% 20%;
  --otp-dash: 215 14% 38%;
  --otp-ok: 161 94% 24%;  --otp-ok-fg: 0 0% 100%;
  --otp-bad: 0 72% 42%;   --otp-bad-fg: 0 0% 100%;
  --otp-iri-a: 196 55% 80%;
  --otp-iri-b: 40 50% 93%;
  --otp-iri-c: 34 62% 80%;
  --otp-iri-d: 210 52% 80%;
}
.dark .otp-root{
  --otp-tile: 215 30% 20%;
  --otp-inset: 215 60% 3%;
  --otp-dash: 215 12% 64%;
  --otp-ok: 158 60% 52%;  --otp-ok-fg: 215 45% 6%;
  --otp-bad: 0 80% 66%;   --otp-bad-fg: 215 45% 6%;
  --otp-iri-a: 196 55% 30%;
  --otp-iri-b: 215 50% 14%;
  --otp-iri-c: 32 48% 30%;
  --otp-iri-d: 210 60% 24%;
}

/* ── Fundo iridescente: duas camadas cónicas a rodar em sentidos opostos ── */
.otp-iri{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:hsl(var(--background))}
.otp-iri::before,.otp-iri::after{content:"";position:absolute;inset:-55%;pointer-events:none;will-change:transform}
.otp-iri::before{
  background:conic-gradient(from 0deg at 50% 50%,
    hsl(var(--otp-iri-a)),hsl(var(--otp-iri-c)),hsl(var(--otp-iri-b)),hsl(var(--otp-iri-d)),hsl(var(--otp-iri-a)));
  filter:blur(48px);opacity:.95;animation:otp-spin 60s linear infinite;
}
.otp-iri::after{
  background:conic-gradient(from 180deg at 32% 68%,
    hsl(var(--otp-iri-d)),hsl(var(--otp-iri-b)),hsl(var(--otp-iri-c)),hsl(var(--otp-iri-a)),hsl(var(--otp-iri-d)));
  filter:blur(64px);opacity:.6;mix-blend-mode:soft-light;animation:otp-spin 90s linear infinite reverse;
}
.dark .otp-root .otp-iri::before{opacity:.8}
.dark .otp-root .otp-iri::after{opacity:.35;mix-blend-mode:screen}
.otp-sheen{
  position:absolute;inset:0;z-index:1;pointer-events:none;mix-blend-mode:soft-light;
  background:linear-gradient(115deg,transparent 35%,hsl(0 0% 100% / .38) 50%,transparent 65%);
  background-size:250% 100%;animation:otp-sheen 14s ease-in-out infinite;
}
.dark .otp-root .otp-sheen{opacity:.3}
@keyframes otp-spin{to{transform:rotate(360deg)}}
@keyframes otp-sheen{0%{background-position:150% 0}100%{background-position:-50% 0}}

/* ── Tiles: sem bordas; o contorno vem do preenchimento + sombra interior ── */
.otp-tiles{display:grid;grid-template-columns:repeat(var(--otp-n),minmax(0,3.5rem));gap:.625rem;justify-content:center}
.otp-tile{
  position:relative;display:flex;align-items:center;justify-content:center;
  width:100%;aspect-ratio:7/8;border-radius:.875rem;
  background:hsl(var(--otp-tile));
  box-shadow:inset 0 2px 5px hsl(var(--otp-inset)/.16);
  color:hsl(var(--foreground));
  font-size:clamp(1.4rem,6vw,1.75rem);font-weight:600;font-variant-numeric:tabular-nums;
  transition:background-color .18s,box-shadow .18s,transform .18s,color .18s;
}
/* activo: anel teal + halo */
.otp-tile[data-active="true"]{
  box-shadow:inset 0 2px 5px hsl(var(--otp-inset)/.16),0 0 0 2px hsl(var(--ring)),0 0 0 7px hsl(var(--ring)/.22);
  transform:translateY(-2px);
}
/* preenchido: cor sólida da marca com o dígito a contrastar (≈14:1 no light) */
.otp-tile[data-filled="true"]{
  background:hsl(var(--primary));color:hsl(var(--primary-foreground));
  box-shadow:0 6px 14px -6px hsl(var(--primary)/.55);
}
.otp-tile[data-filled="true"][data-active="true"]{
  box-shadow:0 0 0 2px hsl(var(--ring)),0 0 0 7px hsl(var(--ring)/.22);
}

/* ── Digitar: o dígito "salta" para dentro; cursor pisca; traço no campo vazio ── */
.otp-char{display:inline-block;animation:otp-pop .22s cubic-bezier(.34,1.56,.64,1) both}
@keyframes otp-pop{0%{transform:scale(.35) translateY(6px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}
.otp-caret{width:2px;height:1.75rem;border-radius:1px;background:hsl(var(--ring));animation:otp-blink 1s steps(1) infinite}
@keyframes otp-blink{50%{opacity:0}}
.otp-dash{width:.75rem;height:.1875rem;border-radius:2px;background:hsl(var(--otp-dash))}

/* ── Estados ── */
/* a verificar: onda sequencial */
.otp-tiles[data-status="verifying"] .otp-tile{animation:otp-wave .9s ease-in-out infinite;animation-delay:calc(var(--i)*110ms)}
@keyframes otp-wave{0%,100%{transform:translateY(0);opacity:1}50%{transform:translateY(-5px);opacity:.78}}
/* sucesso: esmeralda + salto em cascata */
.otp-tiles[data-status="success"] .otp-tile{
  background:hsl(var(--otp-ok));color:hsl(var(--otp-ok-fg));box-shadow:0 6px 14px -6px hsl(var(--otp-ok)/.6);
  animation:otp-win .5s cubic-bezier(.34,1.56,.64,1) both;animation-delay:calc(var(--i)*70ms);
}
@keyframes otp-win{0%{transform:scale(1)}45%{transform:scale(1.14) translateY(-4px)}100%{transform:scale(1)}}
.otp-check{display:inline-flex;height:1.25rem;width:1.25rem;align-items:center;justify-content:center;border-radius:9999px;
  background:hsl(var(--otp-ok));color:hsl(var(--otp-ok-fg));animation:otp-pop .3s cubic-bezier(.34,1.56,.64,1) both}
/* erro: vermelho + abanão */
.otp-tiles[data-status="error"]{animation:otp-shake .45s cubic-bezier(.36,.07,.19,.97) both}
.otp-tiles[data-status="error"] .otp-tile[data-filled="true"]{background:hsl(var(--otp-bad));color:hsl(var(--otp-bad-fg));box-shadow:none}
@keyframes otp-shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-7px)}40%,60%{transform:translateX(7px)}}
/* código colado/auto-preenchido: onda de luz */
.otp-tiles[data-flash="true"] .otp-tile{animation:otp-flash .55s ease-out both;animation-delay:calc(var(--i)*45ms)}
@keyframes otp-flash{0%{box-shadow:0 0 0 0 hsl(var(--ring)/.75)}100%{box-shadow:0 0 0 12px hsl(var(--ring)/0)}}

@media (prefers-reduced-motion:reduce){
  .otp-iri::before,.otp-iri::after,.otp-sheen,.otp-tiles,.otp-tile,.otp-char,.otp-caret,.otp-check{animation:none!important}
  .otp-tile{transition:none}
}
`
