import Layout from '../components/layout/Layout'
import {
  ArrowRight,
  BookOpen,
  Building2,
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
  Quote,
} from 'lucide-react'

const stats = [
  { label: 'Membros activos', value: '1.2k+' },
  { label: 'Reuniões semanais', value: '6+' },
  { label: 'Grupos comunitários', value: '18' },
  { label: 'Ministérios', value: '12' },
]

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
  'Worship e ensino centrados em Cristo',
  'Hospitalidade genuína e pertencimento',
  'Dependência consciente da oração',
  'Serviço movido por compaixão e verdade',
  'Cultura familiar que acolhe todas as gerações',
  'Missão com visão para a cidade e além',
]

const journey = [
  {
    year: '2012',
    title: 'Nasce uma família de fé',
    text: 'A MER Church começou com a visão de criar um lugar onde as pessoas pudessem encontrar Jesus, pertencer a uma comunidade e crescer na fé.',
  },
  {
    year: '2016',
    title: 'Crescimento no discipulado',
    text: 'Expandimos os nossos ministérios para crianças, jovens, oração, cuidado e formação espiritual em cada fase da vida.',
  },
  {
    year: '2020',
    title: 'Servindo além dos muros',
    text: 'A nossa missão foi além do culto dominical para abranger apoio, cuidado prático e impacto na comunidade local.',
  },
]

const schedule = [
  { day: 'Domingo', time: 'Culto de Celebração • 09:00 e 18:00', icon: CalendarCheck2 },
  { day: 'Terça-feira', time: 'Culto de Adoração • 17:00', icon: Radio },
  { day: 'Quarta-feira', time: 'Culto de Palavra • 16:30', icon: BookOpen },
  { day: 'Quinta-feira', time: 'Culto de Oração • 16:30', icon: HeartHandshake },
  { day: 'Sexta-feira', time: 'Culto de Palavra • 16:30', icon: BookOpen },
  { day: 'Sábado', time: 'Culto de Jovens • 15:00', icon: Users },
]

const principles = [
  { title: 'Missão', text: 'Reconciliar pessoas com Deus e uns com os outros através do evangelho de Jesus Cristo.', icon: Target },
  { title: 'Visão', text: 'Ser uma igreja que transforma vidas, famílias e comunidades com amor, verdade e esperança.', icon: Globe2 },
  { title: 'Valores', text: 'Fé, unidade, humildade, serviço e compromisso com a obra de Deus.', icon: ShieldCheck },
]

export default function AboutPage() {
  return (
    <Layout title="Sobre">
      <div className="min-h-screen bg-background text-foreground">
        <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-br from-muted/40 via-background to-background">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(74,144,164,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(212,165,116,0.12),transparent_30%)]" />

          <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur-sm">
                  <Church className="h-4 w-4" />
                  Plataforma digital da MER
                </div>

                <h1 className="max-w-xl text-4xl font-black tracking-tight text-foreground md:text-5xl lg:text-6xl">
                  Missão Evangélica da<br className="hidden md:block" />
                  <span className="text-primary">Reconciliação</span>
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                  Uma comunidade de fé, reconciliação e propósito divino — comprometida com o culto, o discipulado,
                  o cuidado pastoral e o impacto positivo na vida das pessoas e das comunidades.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <a
                    href="#mission"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    Conhecer a nossa missão
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href="#visit"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
                  >
                    Visitar-nos
                  </a>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm">
                      <div className="text-2xl font-black text-foreground">{stat.value}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
                  <div className="rounded-[1.5rem] bg-gradient-to-br from-primary via-primary/90 to-secondary p-6 text-primary-foreground">
                    <p className="text-sm uppercase tracking-[0.18em] text-primary-foreground/80">Cultos e agenda</p>
                    <div className="mt-6 space-y-4">
                      {schedule.slice(0, 3).map(({ day, time, icon: Icon }) => (
                        <div key={day} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Icon size={18} className="text-accent" />
                            <span className="font-medium">{day}</span>
                          </div>
                          <span className="text-sm text-primary-foreground/90">{time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Porque permanecemos</p>
                    <p className="mt-3 text-base leading-7 text-foreground">
                      Criamos um espaço onde pessoas de todas as idades encontram pertencimento, crescimento espiritual e uma comunidade viva.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8">
          <section id="mission" className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">A nossa missão</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                Enraizados em Cristo, alcançando pessoas com esperança.
              </h2>
            </div>

            <div className="space-y-5 text-lg leading-8 text-muted-foreground">
              <p>
                Na MER Church, acreditamos que o evangelho é transformador. A nossa missão é ajudar as pessoas a encontrar Jesus,
                descobrir o seu chamado e viver com coragem, compaixão e propósito.
              </p>
              <p>
                Estamos comprometidos com a formação espiritual, o cuidado da comunidade e a prática do amor que reflete o coração de Cristo em todas as gerações.
              </p>
            </div>
          </section>

          <section className="mt-20">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">A nossa visão</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                Uma igreja viva, acolhedora e marcada por graça e generosidade.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {principles.map(({ title, text, icon: Icon }) => (
                <div key={title} className="rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{title}</h3>
                  <p className="mt-3 text-base leading-7 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Valores</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                Viver em fé, unidade e serviço ao próximo.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {values.map((value) => (
                <div key={value} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-primary">
                    <Check className="h-5 w-5" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Ministérios</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                Oportunidades de conectar, crescer e servir.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {ministries.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{title}</h3>
                  <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20 rounded-[2rem] bg-primary px-6 py-8 text-primary-foreground md:px-8 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">A nossa história</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">De uma visão a uma família em crescimento.</h2>
              </div>

              <div className="space-y-6">
                {journey.map((item) => (
                  <div key={item.year} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-primary">
                      {item.year}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-primary-foreground/80">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="visit" className="mt-20 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Visite-nos</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                Venha como está e descubra uma comunidade genuína.
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Seja novo na fé, esteja a voltar à igreja ou a explorar a vida espiritual, você é bem-vindo. Gostaríamos de caminhar convosco e ajudar a encontrar o vosso lugar nesta família.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <MapPin className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Localização</p>
                    <p className="text-muted-foreground">Bairro Tchioco — defronte à paragem da Huíla, Lubango, Angola</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <Clock3 className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Horários</p>
                    <p className="text-muted-foreground">Domingo: 09:00 e 18:00 • Terça a Sexta: 16:30–17:00</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Próximos passos</p>
              <h3 className="mt-4 text-2xl font-black text-foreground">Gostaríamos de conhecer-te.</h3>

              <div className="mt-6 space-y-4">
                <a
                  href="mailto:mmerlubango@gmail.com"
                  className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 text-foreground transition-colors hover:bg-muted/70"
                >
                  <span className="inline-flex items-center gap-3"><Mail className="h-4 w-4 text-primary" />mmerlubango@gmail.com</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>

                <a
                  href="tel:+244000000000"
                  className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 text-foreground transition-colors hover:bg-muted/70"
                >
                  <span className="inline-flex items-center gap-3"><Phone className="h-4 w-4 text-primary" />(+244) XXX-XXX-XXX</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>

                <a
                  href="/contact"
                  className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 text-foreground transition-colors hover:bg-muted/70"
                >
                  <span className="inline-flex items-center gap-3"><MessageSquareText className="h-4 w-4 text-primary" />Falar com a equipa</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          </section>

          <section className="mt-20 rounded-[2rem] border border-border bg-card p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-primary">
                <Quote className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Citação</p>
                <p className="mt-4 text-xl font-medium leading-8 text-foreground md:text-2xl">
                  “Tudo isso vem de Deus, que nos reconciliou consigo mesmo por meio de Cristo…”
                </p>
                <p className="mt-3 text-sm font-medium text-muted-foreground">— 2 Coríntios 5:18</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </Layout>
  )
}
