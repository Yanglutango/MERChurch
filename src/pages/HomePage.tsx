import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useUser } from '../contexts/UserContext'
import {
  Play,
  Calendar,
  Users,
  Sparkles,
  ArrowRight
} from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { role } = useUser()

  const isGuest = role === 'guest'
  const isAdmin = role === 'admin'

  return (
    <Layout>
      <div className="space-y-16">

        {/* HERO */}
        <section className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold">
            {t('home.title', 'Bem-vindo à Kairós')}
          </h1>

          <p className="max-w-2xl mx-auto text-muted-foreground">
            {t(
              'home.subtitle',
              'Um espaço para crescer em fé, comunhão e propósito.'
            )}
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <Button size="lg" onClick={() => navigate('/ao-vivo')}>
              <Play className="mr-2 h-5 w-5" />
              {t('home.watchLive', 'Assistir ao Vivo')}
            </Button>

            {isGuest && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/sobre')}
              >
                {t('home.learnMore', 'Conhecer a MER')}
              </Button>
            )}
          </div>
        </section>

        {/* PRÓXIMO CULTO */}
        <section>
          <Card className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-xl font-semibold">
                {t('home.nextService', 'Próximo Culto')}
              </h2>
              <p className="text-muted-foreground">
                {t('home.serviceInfo', 'Domingo • 9h & 17h')}
              </p>
            </div>

            <Button onClick={() => navigate('/agenda')}>
              <Calendar className="mr-2 h-4 w-4" />
              {t('home.seeAgenda', 'Ver Agenda')}
            </Button>
          </Card>
        </section>

        {/* CAMINHOS PRINCIPAIS */}
        <section className="grid md:grid-cols-3 gap-6">
          <Card onClick={() => navigate('/comunidade')} className="cursor-pointer p-6 hover:shadow-lg transition">
            <Users className="h-8 w-8 mb-4" />
            <h3 className="font-semibold text-lg">
              {t('home.community', 'Comunidade')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('home.communityDesc', 'Conecte-se com a família da fé')}
            </p>
          </Card>

          <Card onClick={() => navigate('/ministerios')} className="cursor-pointer p-6 hover:shadow-lg transition">
            <Sparkles className="h-8 w-8 mb-4" />
            <h3 className="font-semibold text-lg">
              {t('home.ministries', 'Ministérios')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('home.ministriesDesc', 'Sirva com seus dons')}
            </p>
          </Card>

          <Card onClick={() => navigate('/mer-academy')} className="cursor-pointer p-6 hover:shadow-lg transition">
            <ArrowRight className="h-8 w-8 mb-4" />
            <h3 className="font-semibold text-lg">
              MER Academy
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('home.academyDesc', 'Cresça no conhecimento da Palavra')}
            </p>
          </Card>
        </section>

        {/* CTA FINAL */}
        {isGuest && (
          <section className="text-center">
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-4">
                {t('home.joinTitle', 'Faça parte da nossa família')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t(
                  'home.joinDesc',
                  'Se você ainda não pertence a uma congregação, será uma alegria caminhar com você.'
                )}
              </p>
              <Button size="lg" onClick={() => navigate('/configuracoes')}>
                {t('home.becomeMember', 'Quero ser membro')}
              </Button>
            </Card>
          </section>
        )}

        {isAdmin && (
          <section className="text-center">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Ir para o Dashboard
            </Button>
          </section>
        )}

      </div>
    </Layout>
  )
}

export default HomePage