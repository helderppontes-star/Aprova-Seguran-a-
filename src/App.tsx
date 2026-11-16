import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Shield, BookOpen, Crown, LogOut, Copy, Clock3, XCircle, RefreshCw, LockKeyhole, Smartphone } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { isConfigured, supabase, type Profile, type PremiumRequest } from './supabase'

const pixPayload = import.meta.env.VITE_PIX_COPIA_COLA as string | undefined
const pixKey = import.meta.env.VITE_PIX_CHAVE_EXIBICAO as string | undefined
const pixHolder = import.meta.env.VITE_PIX_TITULAR as string | undefined
const amount = Number(import.meta.env.VITE_PIX_VALOR || 1.99)

function money(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login'|'signup'>('signup')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [reference, setReference] = useState('')
  const [requests, setRequests] = useState<PremiumRequest[]>([])
  const [tab, setTab] = useState<'home'|'premium'|'admin'>('home')
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) { setProfile(null); return }
    loadProfile()
  }, [session?.user?.id])

  async function loadProfile() {
    if (!supabase || !session?.user) return
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (error) { setMessage('Não foi possível carregar seu perfil: ' + error.message); return }
    setProfile(data as Profile)
  }

  async function loadRequests() {
    if (!supabase || !profile?.is_admin) return
    const { data, error } = await supabase.from('premium_requests').select('*').order('created_at', { ascending: false })
    if (error) setMessage('Erro ao carregar solicitações: ' + error.message)
    else setRequests((data || []) as PremiumRequest[])
  }

  useEffect(() => { if (profile?.is_admin && tab === 'admin') loadRequests() }, [profile?.is_admin, tab])

  async function authenticate(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true); setMessage('')
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (result.error) setMessage(result.error.message)
    else if (authMode === 'signup' && !result.data.session) setMessage('Cadastro iniciado. Confira seu e-mail para confirmar a conta e depois entre no aplicativo.')
    else setMessage('Acesso realizado.')
  }

  async function requestPremium() {
    if (!supabase || !session?.user) return
    setLoading(true); setMessage('')
    const { error } = await supabase.from('premium_requests').insert({
      user_id: session.user.id,
      email: session.user.email,
      amount_cents: Math.round(amount * 100),
      transaction_reference: reference.trim() || null
    })
    setLoading(false)
    if (error) setMessage('Não foi possível enviar a solicitação: ' + error.message)
    else { setRequestSent(true); setMessage('Solicitação enviada. Aguarde a conferência e liberação do administrador.') }
  }

  async function reviewRequest(id: string, approve: boolean) {
    if (!supabase) return
    setLoading(true); setMessage('')
    const { error } = await supabase.rpc(approve ? 'approve_premium_request' : 'reject_premium_request', { request_id: id })
    setLoading(false)
    if (error) setMessage('Não foi possível concluir: ' + error.message)
    else { setMessage(approve ? 'Premium liberado por 30 dias.' : 'Solicitação recusada.'); await loadRequests(); await loadProfile() }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setSession(null); setProfile(null); setTab('home')
  }

  const isPremium = Boolean(profile?.premium_until && new Date(profile.premium_until).getTime() > Date.now())
  const pendingCount = useMemo(() => requests.filter(r => r.status === 'pending').length, [requests])

  if (!isConfigured) return <SetupScreen />

  if (!session) return (
    <main className="auth-wrap">
      <div className="brand"><div className="brand-mark"><Shield size={28}/><b>AS</b></div><div><strong>APROVA</strong><span>SEGURANÇA</span></div></div>
      <section className="panel auth-panel">
        <p className="eyebrow">SUA PREPARAÇÃO COMEÇA AQUI</p>
        <h1>{authMode === 'signup' ? 'Crie sua conta' : 'Bem-vindo de volta'}</h1>
        <p className="muted">Acesse questões, simulados e seu progresso.</p>
        <form onSubmit={authenticate} className="stack">
          <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></label>
          <label>Senha<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label>
          <button className="primary" disabled={loading}>{loading ? 'Aguarde...' : authMode === 'signup' ? 'Criar conta' : 'Entrar'}</button>
        </form>
        <button className="link-button" onClick={()=>setAuthMode(authMode === 'signup' ? 'login' : 'signup')}>
          {authMode === 'signup' ? 'Já tenho conta. Entrar' : 'Ainda não tenho conta. Criar cadastro'}
        </button>
        {message && <p className="notice">{message}</p>}
      </section>
      <p className="footer-note">Preparação para todas as carreiras de segurança pública.</p>
    </main>
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand compact"><div className="brand-mark"><Shield size={22}/><b>AS</b></div><div><strong>APROVA</strong><span>SEGURANÇA</span></div></div>
        <button className="icon-button" onClick={signOut} title="Sair"><LogOut size={19}/></button>
      </header>
      <nav className="tabs">
        <button className={tab==='home'?'active':''} onClick={()=>setTab('home')}><BookOpen size={16}/> Início</button>
        <button className={tab==='premium'?'active':''} onClick={()=>setTab('premium')}><Crown size={16}/> Premium</button>
        {profile?.is_admin && <button className={tab==='admin'?'active':''} onClick={()=>setTab('admin')}><LockKeyhole size={16}/> Administração {pendingCount>0 && <i>{pendingCount}</i>}</button>}
      </nav>
      <main className="content">
        {tab==='home' && <>
          <p className="eyebrow">ÁREA DO CANDIDATO</p>
          <h1>Olá, concurseiro!</h1>
          <p className="muted">Sua preparação para a segurança pública começa com uma questão de cada vez.</p>
          <div className="hero-card">
            <div><span className="eyebrow gold">APROVA SEGURANÇA</span><h2>Seu próximo objetivo começa aqui.</h2><p>Organize seus estudos e acompanhe sua evolução.</p></div>
            <Shield size={54} className="hero-shield"/>
          </div>
          <div className="feature-grid">
            <div className="feature"><BookOpen/><b>Banco de questões</b><small>Em desenvolvimento</small></div>
            <div className="feature"><RefreshCw/><b>Simulados</b><small>Em desenvolvimento</small></div>
          </div>
          <div className="status-card"><span>{isPremium ? 'Premium ativo' : 'Plano gratuito'}</span><b className={isPremium?'green':''}>{isPremium ? `Até ${new Date(profile!.premium_until!).toLocaleDateString('pt-BR')}` : 'Acesso básico'}</b><button className="secondary" onClick={()=>setTab('premium')}>{isPremium?'Ver assinatura':'Conhecer Premium'}</button></div>
        </>}
        {tab==='premium' && <section className="panel">
          <p className="eyebrow">ACESSO EXCLUSIVO</p><h1>Desbloqueie o Premium</h1>
          <div className="price"><strong>{money(Math.round(amount*100))}</strong><span>/ 30 dias</span></div>
          <p className="muted">Faça o PIX e solicite a liberação. O acesso só será ativado depois que o administrador conferir o recebimento.</p>
          {isPremium ? <div className="success-box"><CheckCircle2/> Seu Premium está ativo até {new Date(profile!.premium_until!).toLocaleDateString('pt-BR')}.</div> : <>
            {pixPayload ? <div className="pix-box">
              <h3>Pagamento via PIX</h3>
              <QRCodeCanvas value={pixPayload} size={210} level="M" includeMargin/>
              <p className="muted small">Escaneie o QR Code no aplicativo do seu banco.</p>
              <button className="secondary" onClick={()=>navigator.clipboard.writeText(pixPayload)}><Copy size={16}/> Copiar PIX copia e cola</button>
              {pixKey && <p className="small">Chave PIX: <b>{pixKey}</b></p>}
              {pixHolder && <p className="small">Titular: {pixHolder}</p>}
            </div> : <div className="warning-box">O QR Code ainda precisa ser configurado com o código PIX copia e cola válido, fornecido pelo banco. Não use uma chave PIX isolada como QR de pagamento.</div>}
            <label>Identificador da transação (opcional)<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Ex.: E123... ou código do comprovante"/></label>
            <p className="small muted">Enviar esta solicitação não confirma o pagamento. Não informe senha, token ou dados bancários.</p>
            <button className="primary" onClick={requestPremium} disabled={loading || requestSent}>{loading?'Enviando...':requestSent?'Solicitação enviada':'Já paguei — solicitar liberação'}</button>
            {requestSent && <div className="success-box"><Clock3/> Solicitação pendente de conferência pelo administrador.</div>}
          </>}
          {message && <p className="notice">{message}</p>}
        </section>}
        {tab==='admin' && profile?.is_admin && <section>
          <p className="eyebrow">CONTROLE DO PROPRIETÁRIO</p><h1>Solicitações Premium</h1>
          <div className="admin-summary"><strong>{pendingCount}</strong><span>aguardando análise</span><button className="icon-button" onClick={loadRequests}><RefreshCw size={17}/></button></div>
          {requests.length===0 ? <div className="panel muted">Nenhuma solicitação encontrada.</div> : <div className="request-list">
            {requests.map(r=><article className="panel request" key={r.id}>
              <div className="request-head"><b>{r.email}</b><span className={`pill ${r.status}`}>{r.status==='pending'?'Pendente':r.status==='approved'?'Aprovado':'Recusado'}</span></div>
              <p className="muted small">{new Date(r.created_at).toLocaleString('pt-BR')}</p>
              <strong>{money(r.amount_cents)}</strong>
              {r.transaction_reference && <p className="small">Referência: {r.transaction_reference}</p>}
              {r.status==='pending' && <div className="button-row"><button className="approve" disabled={loading} onClick={()=>reviewRequest(r.id,true)}><CheckCircle2 size={16}/> Liberar 30 dias</button><button className="reject" disabled={loading} onClick={()=>reviewRequest(r.id,false)}><XCircle size={16}/> Recusar</button></div>}
              {r.status==='approved' && <p className="small green">Aprovado em {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString('pt-BR') : '—'}</p>}
            </article>)}
          </div>}
          {message && <p className="notice">{message}</p>}
          <p className="small muted">Antes de liberar, confira o crédito diretamente no extrato bancário. A aprovação concede 30 dias a partir do fim de eventual período Premium ainda ativo.</p>
        </section>}
      </main>
      <footer className="app-footer">APROVA SEGURANÇA • ESTUDE COM ESTRATÉGIA</footer>
    </div>
  )
}

function SetupScreen() {
  return <main className="auth-wrap"><div className="brand"><div className="brand-mark"><Shield/><b>AS</b></div><div><strong>APROVA</strong><span>SEGURANÇA</span></div></div><section className="panel"><h1>Configuração necessária</h1><p>O projeto está preparado, mas ainda precisa ser conectado ao Supabase. Siga o README incluído no pacote para configurar as variáveis e executar o banco de dados.</p><div className="warning-box"><Smartphone/> Esta versão ainda não está publicada e não pode ser compartilhada por link até ser configurada e hospedada.</div></section></main>
}
