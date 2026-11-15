import { useMemo, useState } from 'react'
import {
  ArrowDownRight, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, CircleHelp,
  ClipboardList, FileText, Flame, GraduationCap, LayoutDashboard, LockKeyhole, LogIn,
  Menu, Shield, ShieldCheck, Sparkles, Target, X, Zap,
} from 'lucide-react'
import { useAuth } from './lib/useAuth'
import { useAccess } from './lib/useAccess'
import { isSupabaseConfigured } from './lib/supabase'

type Section = 'Início' | 'Questões' | 'Concursos' | 'Redação' | 'Cronograma' | 'Premium' | 'Administração'
const sections: { name: Section; icon: typeof LayoutDashboard }[] = [
  { name: 'Início', icon: LayoutDashboard }, { name: 'Questões', icon: BookOpen },
  { name: 'Concursos', icon: Target }, { name: 'Redação', icon: FileText },
  { name: 'Cronograma', icon: CalendarDays }, { name: 'Premium', icon: Sparkles },
]

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}><span className="brand-shield"><Shield size={25} strokeWidth={1.8}/><b>AS</b></span>{!compact && <span className="brand-name">APROVA <strong>SEGURANÇA</strong></span>}</div>
}

function AuthDialog({ onClose, onAuthed }: { onClose: () => void; onAuthed: () => void }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      if (mode === 'login') { await signIn(email, password); onAuthed(); onClose() }
      else { await signUp(email, password); setMessage('Cadastro enviado. Confira seu e-mail para confirmar a conta.') }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.') }
    finally { setBusy(false) }
  }
  return <div className="modal-backdrop" onClick={onClose}><section className="auth-modal" onClick={e => e.stopPropagation()}>
    <button className="icon-button modal-close" onClick={onClose} aria-label="Fechar"><X size={20}/></button><Brand compact/>
    <p className="eyebrow">SUA PRÓXIMA FASE COMEÇA AQUI</p><h2>{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h2>
    <p className="muted">Acompanhe sua preparação para a carreira que você escolheu.</p>
    {!isSupabaseConfigured && <div className="notice">A autenticação será ativada quando as variáveis do Supabase forem configuradas.</div>}
    <form onSubmit={submit} className="auth-form"><label>E-mail<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label>Senha<input type="password" required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label><button className="button button-primary full" disabled={busy}>{busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}</button></form>
    {message && <p className="form-message" role="status">{message}</p>}<button className="text-button auth-switch" onClick={() => {setMode(mode === 'login' ? 'register' : 'login'); setMessage('')}}>{mode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}</button>
  </section></div>
}

function EmptyPanel({ icon: Icon, title, description, action }: { icon: typeof BookOpen; title: string; description: string; action?: string }) {
  return <div className="empty-panel"><span className="empty-icon"><Icon size={22}/></span><h3>{title}</h3><p>{description}</p>{action && <button className="button button-outline" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>{action}</button>}</div>
}

function Dashboard({ setSection, userName }: { setSection: (section: Section) => void; userName: string }) {
  const quick = [
    { icon: BookOpen, title: 'Banco de questões', sub: 'Pratique no seu ritmo', section: 'Questões' as Section, color: 'blue' },
    { icon: Target, title: 'Concursos', sub: 'Acompanhe oportunidades', section: 'Concursos' as Section, color: 'gold' },
    { icon: FileText, title: 'Treino de redação', sub: 'Desenvolva sua escrita', section: 'Redação' as Section, color: 'green' },
    { icon: CalendarDays, title: 'Cronograma', sub: 'Organize sua rotina', section: 'Cronograma' as Section, color: 'purple' },
  ]
  return <>
    <section className="welcome-card"><div className="welcome-copy"><span className="eyebrow light">FOCO NO SEU OBJETIVO</span><h1>Bom dia{userName ? `, ${userName}` : ''}.</h1><p>Sua jornada na segurança pública começa com o próximo passo.</p><button className="button button-gold" onClick={() => setSection('Cronograma')}>Organizar meus estudos <ArrowRight size={17}/></button></div><div className="welcome-art"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><ShieldCheck size={112} strokeWidth={1}/><span className="art-star">✦</span></div></section>
    <div className="section-heading"><div><span className="eyebrow">SEU ESPAÇO DE PREPARAÇÃO</span><h2>Continue avançando</h2></div><button className="text-button" onClick={() => setSection('Cronograma')}>Ver cronograma <ArrowRight size={16}/></button></div>
    <div className="stats-grid"><div className="stat-card"><span className="stat-icon stat-blue"><Flame size={19}/></span><div><b>—</b><span>Dias de foco</span></div><small>Seu ritmo começa hoje</small></div><div className="stat-card"><span className="stat-icon stat-gold"><ClipboardList size={19}/></span><div><b>—</b><span>Questões resolvidas</span></div><small>Pratique e acompanhe</small></div><div className="stat-card"><span className="stat-icon stat-green"><Check size={19}/></span><div><b>—</b><span>Horas estudadas</span></div><small>Consistência é a chave</small></div></div>
    <div className="section-heading quick-heading"><div><span className="eyebrow">COMECE POR AQUI</span><h2>Ferramentas para sua aprovação</h2></div></div>
    <div className="quick-grid">{quick.map(({icon: Icon,title,sub,section,color})=><button className="quick-card" key={title} onClick={()=>setSection(section)}><span className={`quick-icon ${color}`}><Icon size={21}/></span><span className="quick-text"><b>{title}</b><small>{sub}</small></span><ArrowDownRight className="quick-arrow" size={18}/></button>)}</div>
    <section className="bottom-cta"><div className="cta-mark"><Sparkles size={22}/></div><div><b>Prepare-se com estratégia</b><p>Monte uma rotina que funcione para o seu objetivo.</p></div><button className="button button-dark" onClick={()=>setSection('Premium')}>Conhecer Premium <ArrowRight size={16}/></button></section>
  </>
}

function SectionContent({ section, premium, onAuth }: { section: Section; premium: boolean; onAuth: () => void }) {
  const content = useMemo(() => ({
    'Questões': { eyebrow:'PRÁTICA INTELIGENTE', title:'Banco de questões', desc:'Encontre questões por disciplina, carreira e nível de dificuldade. Seu progresso fica organizado em um só lugar.', icon:BookOpen, action:'Entrar para acompanhar meu progresso' },
    'Concursos': { eyebrow:'OPORTUNIDADES', title:'Concursos', desc:'Consulte oportunidades abertas e previstas com informações verificadas e atualizadas pela equipe.', icon:Target },
    'Redação': { eyebrow:'ESCREVA. REVISE. EVOLUA.', title:'Treinamento de redação', desc:'Pratique a escrita dissertativa, organize argumentos e acompanhe sua evolução.', icon:FileText, action:'Entrar para salvar meus textos' },
    'Cronograma': { eyebrow:'PLANEJAMENTO DE ESTUDOS', title:'Seu cronograma', desc:'Distribua as disciplinas na semana, defina metas realistas e mantenha constância.', icon:CalendarDays, action:'Entrar para criar meu cronograma' },
    'Premium': { eyebrow:'MAIS RECURSOS PARA SUA PREPARAÇÃO', title:'Aprova Segurança Premium', desc:'Uma experiência ampliada para quem quer estruturar cada etapa da preparação.', icon:Sparkles },
    'Administração': { eyebrow:'ACESSO RESTRITO', title:'Painel administrativo', desc:'Área exclusiva do proprietário para gerenciar conteúdo, concursos e acessos Premium.', icon:LockKeyhole },
  } as const)[section], [section])
  const Icon = content.icon
  if (section === 'Premium') return <div className="feature-page"><div className="feature-hero premium-hero"><div className="feature-icon"><Sparkles size={27}/></div><span className="eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.desc}</p><div className="premium-status"><span className="status-dot"/>{premium ? 'Seu acesso Premium está ativo' : 'Acesso liberado manualmente pelo proprietário'}</div></div><div className="premium-grid"><div className="premium-benefit"><Check/><div><b>Estudos organizados</b><p>Centralize sua rotina e acompanhe seu progresso.</p></div></div><div className="premium-benefit"><Check/><div><b>Prática direcionada</b><p>Recursos de preparação em um só ambiente.</p></div></div><div className="premium-benefit"><Check/><div><b>Sem cobranças automáticas</b><p>O acesso é ativado manualmente após confirmação do PIX.</p></div></div></div><div className="notice premium-notice"><CircleHelp size={18}/><span>Esta versão não processa pagamentos. Para solicitar acesso, entre em contato com o proprietário. O Premium só será ativado após confirmação manual do PIX.</span></div></div>
  if (section === 'Administração') return <div className="feature-page"><div className="feature-hero"><div className="feature-icon"><LockKeyhole size={27}/></div><span className="eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.desc}</p></div><div className="admin-locked"><ShieldCheck size={25}/><div><b>A autorização é validada pelo banco de dados</b><p>Somente uma conta com papel de proprietário configurado com segurança no Supabase pode acessar esta área. Não há e-mail administrativo fixo no aplicativo.</p></div></div></div>
  return <div className="feature-page"><div className="feature-hero"><div className="feature-icon"><Icon size={27}/></div><span className="eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.desc}</p></div><EmptyPanel icon={Icon} title={section === 'Concursos' ? 'Nenhum concurso cadastrado' : 'Seu espaço está pronto'} description={section === 'Concursos' ? 'Ainda não há concursos publicados. As informações serão adicionadas após verificação, sem previsões inventadas.' : 'Conecte-se para começar a montar sua preparação. Conteúdos oficiais serão publicados somente após validação.'} action={content.action}/>{content.action && <button className="button button-primary" onClick={onAuth}><LogIn size={17}/> Entrar ou criar conta</button>}</div>
}

export default function App() {
  const { user, loading, signOut } = useAuth()
  const { premium, admin } = useAccess(user?.id)
  const [section, setSection] = useState<Section>('Início')
  const [authOpen, setAuthOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const firstName = user?.email.split('@')[0].split(/[._-]/)[0] ?? ''
  const visibleSections = admin ? [...sections, {name:'Administração' as Section,icon:LockKeyhole}] : sections
  function navigate(name: Section) { setSection(name); setMobileOpen(false); window.scrollTo({top:0,behavior:'smooth'}) }
  return <div className="app-shell">
    {mobileOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={()=>setMobileOpen(false)}/>}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><div className="sidebar-top"><Brand/><button className="icon-button mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Fechar menu"><X/></button></div><div className="sidebar-label">MENU PRINCIPAL</div><nav>{visibleSections.map(({name,icon:Icon})=><button key={name} onClick={()=>navigate(name)} className={`nav-item ${section===name?'active':''}`}><Icon size={19}/><span>{name}</span>{name==='Premium'&&!premium&&<span className="nav-pro">PRO</span>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-tip"><span><Zap size={17}/></span><b>Um passo de cada vez</b><p>A constância transforma objetivo em conquista.</p><button onClick={()=>navigate('Cronograma')}>Montar rotina <ArrowRight size={14}/></button></div><div className="sidebar-footer"><span className="online-dot"/>Sua jornada começa hoje</div></div></aside>
    <main className="main-area"><header className="topbar"><button className="icon-button menu-toggle" aria-label="Abrir menu" onClick={()=>setMobileOpen(true)}><Menu/></button><div className="breadcrumb"><span>Área do candidato</span><ChevronDown size={14}/><b>{section}</b></div><div className="topbar-actions">{!user ? <button className="button button-outline top-login" onClick={()=>setAuthOpen(true)}><LogIn size={16}/> Entrar</button> : <div className="profile-wrap"><button className="profile-button" onClick={()=>setProfileOpen(!profileOpen)}><span className="avatar">{user.email.slice(0,1).toUpperCase()}</span><span className="profile-label"><b>{firstName}</b><small>{premium?'Premium':'Candidato'}</small></span><ChevronDown size={15}/></button>{profileOpen&&<div className="profile-menu"><span>{user.email}</span><button onClick={()=>{void signOut();setProfileOpen(false)}}>Sair da conta</button></div>}</div>}</div></header>
      <div className="page-content">{section==='Início'?<Dashboard setSection={navigate} userName={firstName}/>:<SectionContent section={section} premium={premium} onAuth={()=>setAuthOpen(true)}/>}<footer className="page-footer"><span>© {new Date().getFullYear()} Aprova Segurança</span><span>Seu objetivo. Sua disciplina. Sua conquista.</span></footer></div>
    </main>{authOpen&&<AuthDialog onClose={()=>setAuthOpen(false)} onAuthed={()=>navigate('Início')}/>}{loading&&<div className="loading-bar"/>}
  </div>
}
