import { ArrowRight, CalendarClock, CheckCircle2, Church, Compass, HeartHandshake, MapPin, Sparkles, Users } from 'lucide-react'
import Layout from '../components/layout/Layout'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { useAuth } from '../hooks/useAuth'

const missionPillars = [
  {
    icon: Compass,
    title: 'Missão',
    description:
      'Compartilhar o evangelho com autenticidade, esperança e impacto real na vida das pessoas e das comunidades.',
  },
  {
    icon: HeartHandshake,
    title: 'Serviço',
    description:
      'Servir com humildade, compaixão e compromisso com o cuidado espiritual, social e pastoral.',
  },
  {
    icon: Users,
    title: 'Comunidade',
    description:
      'Construir uma igreja acolhedora, unida e ativa, onde cada pessoa encontra pertencimento e propósito.',
  },
]

const values = [
  'Fé viva e prática',
  'Hospitalidade e acolhimento',
  'Disciplina espiritual',
  'Serviço sem fronteiras',
  'Comunhão e unidade',
  'Transformação pessoal e comunitária',
]

const leadership = [
  {
    name: 'Pastor João Manuel',
    title: 'Pastor Presidente',
    summary: 'Liderança espiritual, visão pastoral e cuidado da comunidade local.',
  },
  {
    name: 'Maria Silva',
    title: 'Coordenadora de Discipulado',
    summary: 'Acompanhamento pastoral, formação cristã e vida em comunidade.',
  },
  {
    name: 'Daniel Fernandes',
    title: 'Coordenador de Missões',
    summary: 'Expansão da ação social, evangelística e de impacto comunitário.',
  },
]

const moments = [
  {
    year: '2016',
    title: 'Início da caminhada',
    text: 'A igreja começou com uma visão clara de servir, discipular e edificar pessoas em Cristo.',
  },
  {
    year: '2019',
    title: 'Expansão comunitária',
    text: 'Ampliação de grupos, encontros e ações de apoio social e espiritual na comunidade.',
  },
  {
    year: '2024',
    title: 'Visão em crescimento',
    text: 'Fortalecimento de programas, ministérios e presença com impacto sustentável em diversas frentes.',
  },
]

const AboutPage = () => {
  const { user } = useAuth()

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground">
        <section className="relative overflow-hidden border-b border-border/80 bg-gradient-to-br from-primary/8 via-background to-background">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)]" aria-hidden="true" />

          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  <Church className="h-3.5 w-3.5" />
                  Quem somos
                </div>

                <h1 className="max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  Uma igreja comprometida com a fé, a comunidade e a transformação.
                </h1>

                <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                  Na KAIRÓS, acreditamos que a Igreja é um lugar de acolhimento, discipulado, serviço e esperança.
                  Somos uma comunidade guiada pela Palavra de Deus, movida pelo amor e dedicada a impactar vidas.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Button className="rounded-full px-5 py-2.5 text-sm">
                    Visite-nos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button variant="outline" className="rounded-full px-5 py-2.5 text-sm">
                    Fale connosco
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
                  <div className="rounded-[22px] bg-gradient-to-br from-primary/12 via-background to-primary/5 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Nossa identidade
                      </span>

                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                        {user ? 'Comunidade ativa' : 'Você é bem-vindo'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-background/80 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Visão</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          Formar pessoas transformadas para transformar o mundo.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Card className="border-border bg-background/80 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Atuação</p>
                          <p className="mt-2 text-2xl font-bold text-foreground">+8</p>
                          <p className="mt-1 text-sm text-muted-foreground">anos de caminhada</p>
                        </Card>

                        <Card className="border-border bg-background/80 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Acolhimento</p>
                          <p className="mt-2 text-2xl font-bold text-foreground">1k+</p>
                          <p className="mt-1 text-sm text-muted-foreground">pessoas impactadas</p>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">A nossa essência</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Uma igreja com propósito, presença e profundidade espiritual.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {missionPillars.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="group h-full border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div className="mb-4 inline-flex rounded-xl border border-primary/15 bg-primary/5 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border/80 bg-muted/20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">A nossa história</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Crescemos em fé e servimos com compromisso.
              </h2>
            </div>

            <div className="space-y-5">
              <p className="text-base leading-7 text-muted-foreground">
                Desde o início, nossa comunidade tem buscado viver uma fé que não se limita ao culto, mas se expressa em serviço,
                cuidado com o próximo, discipulado e ação concreta em favor de pessoas e famílias.
              </p>
              <p className="text-base leading-7 text-muted-foreground">
                Acreditamos que a igreja deve ser um lugar de encontro, cura, direção e renovação. Por isso, investimos em grupos,
                encontros, formação, apoio e ações de impacto social e espiritual.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Valores</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">O que nos move</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {values.map((value) => (
              <div key={value} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border/80 bg-muted/25">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Liderança</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">O coração da nossa comunidade</h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {leadership.map(({ name, title, summary }) => (
                <Card key={name} className="overflow-hidden border-border bg-card">
                  <div className="h-32 bg-gradient-to-br from-primary/15 via-primary/5 to-background" />
                  <div className="p-5">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                      {name.charAt(0)}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{name}</h3>
                    <p className="mt-1 text-sm font-medium text-primary">{title}</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{summary}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Caminho</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Alguns marcos importantes</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {moments.map(({ year, title, text }) => (
              <Card key={year} className="border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <CalendarClock className="h-4 w-4" />
                  <span className="text-sm font-semibold">{year}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5 p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Junte-se a nós</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Venha fazer parte da nossa comunidade.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Seja bem-vindo à KAIRÓS. Esteja presente em momentos de culto, discipulado, serviço e crescimento espiritual.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button className="rounded-full px-5 py-2.5 text-sm">
                  Participar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" className="rounded-full px-5 py-2.5 text-sm">
                  <MapPin className="mr-2 h-4 w-4" />
                  Localização
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </Layout>
  )
}

export default AboutPage
