import Layout from '../components/layout/Layout'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  Check,
  Church,
  Clock3,
  Compass,
  Globe2,
  HeartHandshake,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'

const ministries = [
  {
    title: 'Crianças & Jovens',
    description: 'Espaços seguros e alegres onde crianças e jovens são nutridos em fé, identidade e propósito.',
    icon: Users,
  },
  {
    title: 'Oração & Cuidado',
    description: 'Uma rede de oração e cuidado pastoral que sustenta pessoas em épocas difíceis e de celebração.',
    icon: HeartHandshake,
  },
  {
    title: 'Discipulado',
    description: 'Ensino bíblico e acompanhamento espiritual para crescimento na maturidade cristã.',
    icon: Compass,
  },
  {
    title: 'Missão & Impacto',
    description: 'Serviço, generosidade e ação local para refletir o amor de Cristo na comunidade.',
    icon: Sparkles,
  },
]

const values = [
  'Adoração e ensino centrados em Cristo',
  'Hospitalidade genuína e pertencimento',
  'Dependência consciente da oração',
  'Serviço movido por compaixão e verdade',
  'Cultura familiar que acolhe todas as gerações',
  'Missão com visão para a cidade e além',
]

const journey = [
  {
    year: '2000',
    title: 'Nasce uma família de fé',
    text: 'A MER começou com a visão de criar um lugar onde as pessoas pudessem encontrar Jesus, pertencer a uma comunidade e crescer na fé. E no ano de 2000, o Pastor Garcia Lutango foi comissionado a implantar essa visão na cidade do Lubango.',
  },
  {
    year: '2018',
    title: 'Crescimento no discipulado',
    text: 'Expandimos os nossos ministérios para crianças, jovens, oração, cuidado e formação espiritual em cada fase da vida. Esses pequenos ministérios contribuem de maneira significativa para a congregação.',
  },
  {
    year: '2020',
    title: 'Servindo além dos muros',
    text: 'A nossa missão foi além dos cultos para abranger apoio, cuidado prático e impacto na comunidade local. Nesse mesmo ano, começamos o projeto "Sopa Solidária", uma campanha para alimentar pessoas desabrigadas e necessitadas.',
  },
  {
    year: '2025/26',
    title: 'Rumo ao crescimento digital',
    text: 'Com a evolução tecnológica acelerando a cada dia, nossos jovens tiveram a ideia da criação e implementação da KAIROS - uma plataforma digital para a congregação, visando o benefício da mesma e o maior alcance de pessoas.',
  },
]

const schedule = [
  { day: 'Domingo', time: 'Culto de Celebração • 09:00', icon: 'CalendarCheck2' },
  { day: 'Terça-feira', time: 'Culto de Adoração • 17:00', icon: 'Radio' },
  { day: 'Quarta-feira', time: 'Culto de Palavra • 16:30', icon: 'BookOpen' },
  { day: 'Quinta-feira', time: 'Culto de Oração • 16:30', icon: 'HeartHandshake' },
  { day: 'Sexta-feira', time: 'Culto de Palavra • 16:30', icon: 'BookOpen' },
  { day: 'Sábado', time: 'Culto de Jovens • 15:00', icon: 'Users' },
]

const principles = [
  { title: 'Missão', text: 'Reconciliar pessoas com Deus e uns com os outros através do evangelho de Jesus Cristo.', icon: 'Target' },
  { title: 'Visão', text: 'Ser uma igreja que transforma vidas, famílias e comunidades com amor, verdade e esperança.', icon: 'Globe2' },
  { title: 'Valores', text: 'Fé, unidade, humildade, serviço e compromisso com a obra de Deus.', icon: 'ShieldCheck' },
]

type Leader = { name: string; role: string; description: string; photo?: string }

const leadership = [
  { name: 'Garcia Doki Lutango', role: 'Pastor Principal', description: 'Lidera a visão espiritual da congregação e o cuidado pastoral da igreja.', image: '' },
  { name: 'Nzinga Manuel Lutango', role: 'Pastora', description: 'Apoia o ensino, o acompanhamento espiritual e o cuidado dos membros.', image: '' },
  { name: 'Afonso Nsiya Makulu', role: 'Pastor', description: 'Apoia o ensino, o acompanhamento espiritual e o cuidado dos membros.', image: '' },
  { name: 'Gideão Samuel', role: 'Presidente dos Jovens', description: 'Coordena o ministério de jovens, as suas actividades e o seu crescimento na fé.', image: '' },
  { name: 'Albertina Kambinda', role: 'Presidente das Mulheres', description: 'Coordena o ministério de mulheres e promove comunhão, oração e serviço.', image: '' },
  { name: 'Mireille Baseya', role: 'Presidente da Escola Bíblica Dominical', description: 'Coordena a Escola Dominical e promove o ensino e fundamentação de crianças e adolescentes.', image: '' },
]

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

/* ───────────────────────── PEÇAS VISUAIS REUTILIZÁVEIS ───────────────────────── */

// Cruz latina desenhada inline: sem dependência de versão do lucide-react.
const CrossMark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path d="M10.5 2h3v5H19v3h-5.5v12h-3V10H5V7h5.5V2z" fill="currentColor" />
  </svg>
)

// Regra de contraste: dourado NUNCA é texto sobre fundo claro (2,2:1).
// No light a etiqueta é navy (14:1); no dark passa a dourado (alto contraste
// sobre fundo escuro). Sobre painéis navy usa-se sempre o dourado claro (8,8:1).
const Eyebrow = ({
  children,
  onDark = false,
  className = '',
}: {
  children: React.ReactNode
  onDark?: boolean
  className?: string
}) => (
  <p
    className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] ${
      onDark ? 'text-[#E8C89A]' : 'text-[#0A2E4A] dark:text-[#D4A574]'
    } ${className}`}
  >
    <span aria-hidden="true" className="h-px w-8 bg-[#D4A574]" />
    {children}
  </p>
)

const SectionHeader = ({
  eyebrow,
  title,
  id,
  onDark = false,
  className = '',
}: {
  eyebrow: string
  title: string
  id: string
  onDark?: boolean
  className?: string
}) => (
  <div className={className}>
    <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>
    <h2
      id={id}
      className={`mt-4 font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl ${
        onDark ? 'text-white' : 'text-foreground'
      }`}
    >
      {title}
    </h2>
  </div>
)

// Ícone: navy com glifo dourado claro (8,8:1) e aro teal subtil.
// Funciona igual nos dois modos porque não depende de tokens do tema.
const IconTile = ({ icon: Icon }: { icon: LucideIcon }) => (
  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A2E4A] text-[#E8C89A] ring-1 ring-[#4A90A4]/30">
    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
  </div>
)

const focusLight =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] focus-visible:ring-offset-2 focus-visible:ring-offset-background'
const focusDark =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C89A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A2E4A]'

/* ───────────────────────── PÁGINA ───────────────────────── */

export default function AboutPage() {
  return (
    <Layout title="Sobre">
      <div className="min-h-screen bg-background text-foreground">

        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden bg-[#0A2E4A] text-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#4A90A4]/20 blur-3xl" />
            <div className="absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full bg-[#D4A574]/10 blur-3xl" />
            <CrossMark className="absolute right-[6%] top-10 hidden h-72 w-72 text-white/[0.04] lg:block" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-16 md:px-6 md:pb-32 md:pt-20 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="motion-safe:animate-in motion-safe:fade-in duration-500">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4A574]/40 bg-white/5 px-4 py-2 text-sm font-medium text-[#E8C89A]">
                  <Church className="h-4 w-4" aria-hidden="true" />
                  Plataforma digital da MER
                </div>

                <h1 className="max-w-xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl">
                  Missão Evangélica da<br className="hidden md:block" />{' '}
                  <span className="text-[#E8C89A]">Reconciliação</span>
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
                  Uma comunidade de fé, reconciliação e propósito divino — comprometida com o culto, o discipulado,
                  o cuidado pastoral e o impacto positivo na vida das pessoas e das comunidades.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <a
                    href="#mission"
                    className={`inline-flex items-center justify-center gap-2 rounded-md bg-[#D4A574] px-6 py-3.5 text-sm font-semibold text-[#0A2E4A] transition-colors hover:bg-[#E8C89A] ${focusDark}`}
                  >
                    Conhecer a nossa missão
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a
                    href="#visit"
                    className={`inline-flex items-center justify-center gap-2 rounded-md border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:border-[#D4A574]/70 hover:bg-white/10 ${focusDark}`}
                  >
                    Visitar-nos
                  </a>
                </div>
              </div>

              {/* Cartão de cultos — só texto branco/dourado claro sobre navy */}
              <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E8C89A]">Cultos e agenda</p>

                <ul className="mt-5 space-y-3">
                  {schedule.slice(0, 3).map(({ day, time, icon: Icon }) => (
                    <li
                      key={day}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3"
                    >
                      <span className="flex items-center gap-3 font-medium text-white">
                        <Icon size={18} className="text-[#E8C89A]" aria-hidden="true" />
                        {day}
                      </span>
                      <span className="text-right text-sm text-white/90">{time}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#visit"
                  className={`mt-4 inline-flex items-center gap-1.5 rounded text-sm font-medium text-[#E8C89A] hover:underline ${focusDark}`}
                >
                  Ver todos os horários
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>

                <div className="mt-5 border-t border-white/15 pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E8C89A]">Porque permanecemos</p>
                  <p className="mt-3 text-base leading-7 text-white/90">
                    Criamos um espaço onde pessoas de todas as idades encontram pertencimento, crescimento espiritual e uma comunidade viva.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ ESTATÍSTICAS — faixa sobreposta ao hero ═══ */}
        <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 md:px-6 lg:px-8">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-xl lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse bg-card px-5 py-6 text-center">
                <dt className="mt-1 text-sm text-foreground/70">{stat.label}</dt>
                <dd className="font-serif text-3xl font-semibold tracking-tight text-[#0A2E4A] dark:text-[#E8C89A]">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <main className="mx-auto max-w-7xl px-4 pb-20 pt-20 md:px-6 lg:px-8">

          {/* ═══ MISSÃO ═══ */}
          <section
            id="mission"
            aria-labelledby="mission-title"
            className="grid scroll-mt-24 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"
          >
            <SectionHeader
              id="mission-title"
              eyebrow="A nossa missão"
              title="Enraizados em Cristo, alcançando pessoas com esperança."
            />

            <div className="space-y-5 border-l-2 border-[#D4A574] pl-6 text-lg leading-8 text-foreground/80">
              <p className="text-xl leading-9 text-foreground">
                Na MER, acreditamos que o Evangelho genuíno é transformador e restaurador. A nossa missão é ajudar as pessoas a encontrar Jesus,
                descobrir o seu chamado e viver com coragem, compaixão e propósito.
              </p>
              <p>
                Estamos comprometidos com a formação espiritual, o cuidado da comunidade e a prática do amor que reflete o coração de Cristo em todas as gerações.
              </p>
            </div>
          </section>

          {/* ═══ VISÃO / PRINCÍPIOS ═══ */}
          <section aria-labelledby="vision-title" className="mt-24">
            <SectionHeader
              id="vision-title"
              eyebrow="A nossa visão"
              title="Uma igreja viva, acolhedora e marcada por graça e generosidade."
              className="mb-10 max-w-2xl"
            />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {principles.map(({ title, text, icon }) => (
                <article
                  key={title}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-200 hover:border-[#4A90A4]/60 hover:shadow-lg motion-safe:hover:-translate-y-1"
                >
                  {/* Barra com as três cores da marca */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0A2E4A] via-[#4A90A4] to-[#D4A574]"
                  />
                  <IconTile icon={icon} />
                  <h3 className="mt-5 font-serif text-2xl font-semibold text-foreground">{title}</h3>
                  <p className="mt-3 text-base leading-7 text-foreground/75">{text}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ═══ VALORES — banda neutra para quebrar o ritmo ═══ */}
          <section
            aria-labelledby="values-title"
            className="mt-24 rounded-3xl border border-border bg-muted/50 p-6 md:p-10"
          >
            <SectionHeader
              id="values-title"
              eyebrow="Valores"
              title="Viver em fé, unidade e serviço ao próximo."
              className="mb-10 max-w-2xl"
            />

            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {values.map((value) => (
                <li
                  key={value}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-[#4A90A4]/60"
                >
                  {/* Navy sobre dourado: 6,3:1 — legível nos dois modos */}
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4A574] text-[#0A2E4A]">
                    <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <p className="pt-1 text-lg font-medium leading-snug text-foreground">{value}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* ═══ MINISTÉRIOS ═══ */}
          <section aria-labelledby="ministries-title" className="mt-24">
            <SectionHeader
              id="ministries-title"
              eyebrow="Ministérios"
              title="Oportunidades de conectar, crescer e servir."
              className="mb-10 max-w-2xl"
            />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {ministries.map(({ title, description, icon }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:border-[#4A90A4]/60 hover:shadow-lg motion-safe:hover:-translate-y-1"
                >
                  <IconTile icon={icon} />
                  <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
                  <p className="mt-3 text-base leading-7 text-foreground/75">{description}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ═══ LIDERANÇA — retratos em arco, como um vitral ═══ */}
          <section aria-labelledby="leadership-title" className="mt-24">
            <SectionHeader
              id="leadership-title"
              eyebrow="Liderança"
              title="Servos que cuidam, ensinam e caminham connosco."
              className="mb-10 max-w-2xl"
            />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {leadership.map(({ name, role, description, photo }) => (
                <article
                  key={`${role}-${name}`}
                  className="overflow-hidden rounded-2xl border border-border bg-card text-center transition-all duration-200 hover:shadow-lg motion-safe:hover:-translate-y-1"
                >
                  <div className="bg-gradient-to-b from-[#0A2E4A] to-[#123d5c] px-6 pt-8">
                    <div className="mx-auto flex h-36 w-28 items-center justify-center overflow-hidden rounded-t-full border-2 border-b-0 border-[#D4A574]/70 bg-[#0A2E4A]">
                      {photo ? (
                        <img
                          src={photo}
                          alt={`${name}, ${role}`}
                          width={112}
                          height={144}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-serif text-4xl font-semibold text-[#E8C89A]" aria-hidden="true">
                          {getInitials(name)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0A2E4A] dark:text-[#D4A574]">
                      {role}
                    </p>
                    <h3 className="mt-2 font-serif text-xl font-semibold text-foreground">{name}</h3>
                    <p className="mt-3 text-base leading-7 text-foreground/75">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ═══ HISTÓRIA — linha do tempo vertical ═══ */}
          <section
            aria-labelledby="history-title"
            className="relative mt-24 overflow-hidden rounded-3xl bg-[#0A2E4A] px-6 py-12 text-white ring-1 ring-[#4A90A4]/20 md:px-10 lg:px-14 lg:py-16"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#4A90A4]/15 blur-3xl" />
            </div>

            <div className="relative grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <SectionHeader
                id="history-title"
                eyebrow="A nossa história"
                title="De uma visão a uma família em crescimento."
                onDark
                className="self-start lg:sticky lg:top-24"
              />

              <ol className="border-l border-[#4A90A4]/50">
                {journey.map((item) => (
                  <li key={item.year} className="relative pb-10 pl-8 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[8px] top-2 h-3.5 w-3.5 rounded-full border-2 border-[#D4A574] bg-[#0A2E4A]"
                    />
                    <span className="block font-serif text-2xl font-semibold text-[#E8C89A]">{item.year}</span>
                    <h3 className="mt-1 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-base leading-7 text-white/85">{item.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ═══ VISITE-NOS ═══ */}
          <section
            id="visit"
            aria-labelledby="visit-title"
            className="mt-24 grid scroll-mt-24 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start"
          >
            <div>
              <SectionHeader
                id="visit-title"
                eyebrow="Visite-nos"
                title="Venha como está e descubra uma comunidade genuína."
              />
              <p className="mt-5 text-lg leading-8 text-foreground/80">
                Seja novo na fé, esteja a voltar à igreja ou a explorar a vida espiritual, você é bem-vindo. Gostaríamos de caminhar convosco e ajudar a encontrar o vosso lugar nesta família.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#4A90A4]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-foreground">Localização</p>
                    <p className="mt-1 text-foreground/75">Bairro Tchioco — defronte à paragem da Huíla, Lubango, Angola</p>
                  </div>
                </div>

                {/* Mesma informação do resumo anterior, agora completa e legível */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-4">
                    <Clock3 className="h-5 w-5 shrink-0 text-[#4A90A4]" aria-hidden="true" />
                    <p className="font-semibold text-foreground">Horários</p>
                  </div>
                  <ul className="mt-3 divide-y divide-border">
                    {schedule.map(({ day, time, icon: Icon }) => (
                      <li key={day} className="flex items-center justify-between gap-4 py-3">
                        <span className="flex items-center gap-3 font-medium text-foreground">
                          <Icon className="h-4 w-4 text-[#4A90A4]" aria-hidden="true" />
                          {day}
                        </span>
                        <span className="text-right text-sm text-foreground/75">{time}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Próximos passos — painel navy, texto branco/dourado claro */}
            <div className="rounded-3xl bg-[#0A2E4A] p-7 text-white ring-1 ring-[#4A90A4]/20 md:p-8 lg:sticky lg:top-24">
              <Eyebrow onDark>Próximos passos</Eyebrow>
              <h3 className="mt-4 font-serif text-2xl font-semibold text-white md:text-3xl">
                Gostaríamos de conhecer-te.
              </h3>

              <div className="mt-7 space-y-3">
                <a
                  href="mailto:mmerlubango@gmail.com"
                  className={`group flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white transition-colors hover:border-[#D4A574]/60 hover:bg-white/10 ${focusDark}`}
                >
                  <span className="inline-flex items-center gap-3">
                    <Mail className="h-4 w-4 text-[#E8C89A]" aria-hidden="true" />
                    mmerlubango@gmail.com
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/60 transition-colors group-hover:text-[#E8C89A]" aria-hidden="true" />
                </a>

                <a
                  href="tel:+244000000000"
                  className={`group flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white transition-colors hover:border-[#D4A574]/60 hover:bg-white/10 ${focusDark}`}
                >
                  <span className="inline-flex items-center gap-3">
                    <Phone className="h-4 w-4 text-[#E8C89A]" aria-hidden="true" />
                    (+244) XXX-XXX-XXX
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/60 transition-colors group-hover:text-[#E8C89A]" aria-hidden="true" />
                </a>

                <a
                  href="/contact"
                  className={`group flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white transition-colors hover:border-[#D4A574]/60 hover:bg-white/10 ${focusDark}`}
                >
                  <span className="inline-flex items-center gap-3">
                    <MessageSquareText className="h-4 w-4 text-[#E8C89A]" aria-hidden="true" />
                    Falar com a equipa
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/60 transition-colors group-hover:text-[#E8C89A]" aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>

          {/* ═══ VERSÍCULO — fecho solene ═══ */}
          <section
            aria-label="Versículo bíblico"
            className="relative mt-24 overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center md:px-12 md:py-16"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0A2E4A] via-[#4A90A4] to-[#D4A574]"
            />
            <CrossMark className="mx-auto h-9 w-9 text-[#D4A574]" />
            <Eyebrow className="mt-6 justify-center">Citação</Eyebrow>

            <figure className="mx-auto mt-6 max-w-3xl">
              <blockquote className="font-serif text-2xl leading-10 text-foreground md:text-3xl md:leading-[1.5]">
                “Tudo isso vem de Deus, que nos reconciliou consigo mesmo por meio de Cristo, e nos deu o ministério da reconciliação.”
              </blockquote>
              <figcaption className="mt-5 text-sm font-semibold tracking-wide text-foreground/70">
                — 2 Coríntios 5:18
              </figcaption>
            </figure>
          </section>
        </main>
      </div>
    </Layout>
  )
}
