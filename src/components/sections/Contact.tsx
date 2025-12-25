import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Youtube } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'

const Contact = () => {
  const contactInfo = [
    {
      icon: MapPin,
      title: 'Endereço',
      info: 'Rua da Reconciliação, 123',
      info2: 'Centro - São Paulo, SP',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Phone,
      title: 'Telefone',
      info: '(11) 1234-5678',
      info2: '(11) 98765-4321',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Mail,
      title: 'E-mail',
      info: 'contato@mer.com.br',
      info2: 'secretaria@mer.com.br',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Clock,
      title: 'Horários',
      info: 'Dom: 9h e 18h',
      info2: 'Qua: 19h30',
      color: 'from-yellow-500 to-orange-500',
    },
  ]

  const socialLinks = [
    { icon: Instagram, label: 'Instagram', color: 'from-pink-500 to-rose-500' },
    { icon: Facebook, label: 'Facebook', color: 'from-blue-500 to-indigo-500' },
    { icon: Youtube, label: 'YouTube', color: 'from-red-500 to-rose-500' },
  ]

  return (
    <section id="contact" className="section-padding bg-muted/30">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
          <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            Contato
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Entre em{' '}
            <span className="text-gradient">Contato</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Estamos aqui para ajudar você. Entre em contato conosco!
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="p-8 border-2">
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Envie uma Mensagem
              </h3>
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      placeholder="Seu nome"
                      className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none transition-colors bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none transition-colors bg-background"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      placeholder="(11) 12345-6789"
                      className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none transition-colors bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Assunto
                    </label>
                    <select className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none transition-colors bg-background">
                      <option>Quero ser membro</option>
                      <option>Pedido de oração</option>
                      <option>Dúvidas</option>
                      <option>Outro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Mensagem
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Digite sua mensagem..."
                    className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary focus:outline-none transition-colors bg-background resize-none"
                  />
                </div>

                <Button className="w-full gradient-primary text-white font-semibold text-lg py-6">
                  Enviar Mensagem
                </Button>
              </form>
            </Card>
          </div>

          {/* Contact Info & Social */}
          <div className="space-y-6">
            {/* Contact Info Cards */}
            {contactInfo.map((item, index) => (
              <Card
                key={item.title}
                className={`p-6 border-2 hover:border-primary/50 transition-all hover:shadow-lg animate-fade-in-up animate-delay-${index * 100}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} flex-shrink-0`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground mb-1">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.info}</div>
                    <div className="text-sm text-muted-foreground">{item.info2}</div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Social Media */}
            <Card className="p-6 gradient-primary text-white border-0">
              <h4 className="font-bold text-lg mb-4">Redes Sociais</h4>
              <div className="space-y-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href="#"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-all group"
                  >
                    <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                      <social.icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold">@mer.oficial</span>
                  </a>
                ))}
              </div>
            </Card>

            {/* Map */}
            <Card className="p-0 overflow-hidden border-2 h-64">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.0977!2d-46.6333!3d-23.55052!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzgnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact
