import { ArrowRight, CalendarCheck2, CheckCircle2, Church, Compass, HeartHandshake, MapPin, Sparkles, Users } from 'lucide-react'
import Layout from '../components/layout/Layout'

const stats = [
  { label: 'Active members', value: '1.2k+' },
  { label: 'Weekly gatherings', value: '6+' },
  { label: 'Community groups', value: '18' },
  { label: 'Serving ministries', value: '12' },
]

const ministries = [
  {
    title: 'Children & Youth',
    description: 'Safe, joyful spaces where young people are nurtured in faith, identity, and purpose.',
    icon: Users,
  },
  {
    title: 'Prayer & Care',
    description: 'A compassionate prayer network supporting members through difficult seasons and celebrations.',
    icon: HeartHandshake,
  },
  {
    title: 'Discipleship',
    description: 'Biblical teaching and life-on-life mentoring that helps people grow in spiritual maturity.',
    icon: Compass,
  },
  {
    title: 'Community Outreach',
    description: 'Encouraging service, generosity, and local mission as a visible expression of Christ’s love.',
    icon: Sparkles,
  },
]

const values = [
  'Christ-centered worship and teaching',
  'Warm hospitality and genuine belonging',
  'Prayerful dependence on God',
  'Service rooted in compassion and truth',
  'A family culture that welcomes all generations',
  'Mission-minded outreach in the city and beyond',
]

const journey = [
  {
    year: '2012',
    title: 'A church family begins',
    text: 'MER Church started with a vision to create a place where people could experience Jesus, belong in community, and grow through faith.',
  },
  {
    year: '2016',
    title: 'Growth in discipleship',
    text: 'We expanded our ministries to include young people, prayer care, and spiritual formation for every stage of life.',
  },
  {
    year: '2020',
    title: 'Serving beyond the walls',
    text: 'Our mission extended beyond Sunday worship into outreach, support, and practical care for families and communities around us.',
  },
]

export default function AboutPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-[#f8f5f1] text-slate-800">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f6efe6] via-white to-[#f4efe9]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(167,139,250,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.12),transparent_30%)]" />

          <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9c5a1] bg-white/80 px-4 py-2 text-sm font-medium text-[#6d4c2f] shadow-sm backdrop-blur">
                  <Church size={16} />
                  About MER Church
                </div>

                <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                  A church where faith, family, and purpose grow together.
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  MER Church is a vibrant community centered on Jesus Christ, committed to worship, discipleship,
                  and compassionate service. We believe every person is invited to belong, be transformed, and
                  live with purpose.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <a
                    href="#mission"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1f2a44] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-[#141d33]"
                  >
                    Discover our mission
                    <ArrowRight size={16} />
                  </a>
                  <a
                    href="#visit"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Plan your visit
                  </a>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-[#eadfce] bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                      <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                      <div className="mt-1 text-sm text-slate-600">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[2rem] border border-[#ecd9bf] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
                  <div className="rounded-[1.5rem] bg-gradient-to-br from-[#1d273d] via-[#28395c] to-[#6d4c2f] p-6 text-white">
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-200">Sunday gatherings</p>
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CalendarCheck2 size={18} className="text-[#f7d7a9]" />
                          <span className="font-medium">Worship service</span>
                        </div>
                        <span className="text-sm text-slate-200">9:00 AM</span>
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-[#f7d7a9]" />
                          <span className="font-medium">Bible study</span>
                        </div>
                        <span className="text-sm text-slate-200">11:15 AM</span>
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <MapPin size={18} className="text-[#f7d7a9]" />
                          <span className="font-medium">Location</span>
                        </div>
                        <span className="text-sm text-slate-200">City Center</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Why people stay</p>
                    <p className="mt-3 text-base leading-7 text-slate-700">
                      We create a space where people can truly belong, grow spiritually, and be part of something larger than themselves.
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
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8d6b45]">Our mission</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Rooted in Christ. Reaching people with hope.
              </h2>
            </div>

            <div className="space-y-5 text-lg leading-8 text-slate-600">
              <p>
                At MER Church, we believe the gospel is transformative. Our mission is to help people encounter Jesus,
                discover their calling, and live with courage, compassion, and purpose.
              </p>
              <p>
                We are committed to spiritual formation, community care, and practical acts of love that reflect the heart
                of Christ across every generation and every neighborhood.
              </p>
            </div>
          </section>

          <section className="mt-20">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8d6b45]">What we value</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Faith-filled living shaped by grace and generosity.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {values.map((value) => (
                <div key={value} className="rounded-3xl border border-[#f0e6d8] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5ead8] text-[#7a552f]">
                    <CheckCircle2 size={22} />
                  </div>
                  <p className="text-lg font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8d6b45]">Ministries</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Opportunities to connect, grow, and serve.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {ministries.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-3xl border border-[#f0e6d8] bg-[#fffdf9] p-6 shadow-sm">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efe4d4] text-[#6d4c2f]">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20 rounded-[2rem] bg-[#1d273d] px-6 py-8 text-white md:px-8 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f1dcb1]">Our story</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">From a vision to a growing church family.</h2>
              </div>

              <div className="space-y-6">
                {journey.map((item) => (
                  <div key={item.year} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f1dcb1] text-[#1d273d] font-bold">
                      {item.year}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-200">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="visit" className="mt-20 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8d6b45]">Visit us</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Come as you are and experience genuine community.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Whether you are new to faith, returning to church, or exploring spiritual life, you are welcome here.
                We would love to walk with you and help you find your place in the church family.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <MapPin className="mt-1 text-[#7a552f]" size={20} />
                  <div>
                    <p className="font-semibold text-slate-900">Location</p>
                    <p className="text-slate-600">123 Hope Avenue, City Center</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <CalendarCheck2 className="mt-1 text-[#7a552f]" size={20} />
                  <div>
                    <p className="font-semibold text-slate-900">Service times</p>
                    <p className="text-slate-600">Sunday Worship: 9:00 AM & 11:00 AM</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#f0e6d8] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8d6b45]">Next steps</p>
              <h3 className="mt-4 text-2xl font-black text-slate-900">We’d love to meet you.</h3>

              <div className="mt-6 space-y-4">
                <a
                  href="mailto:hello@merchurch.org"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition hover:bg-slate-100"
                >
                  <span>Email the church</span>
                  <ArrowRight size={16} />
                </a>

                <a
                  href="tel:+1234567890"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition hover:bg-slate-100"
                >
                  <span>Call us</span>
                  <ArrowRight size={16} />
                </a>

                <a
                  href="/contact"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition hover:bg-slate-100"
                >
                  <span>Connect with our team</span>
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </Layout>
  )
}
