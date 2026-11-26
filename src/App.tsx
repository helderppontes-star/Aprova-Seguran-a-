import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CheckCircle2, Shield, BookOpen, Crown, LogOut, Copy, Clock3, Bell,
  XCircle, RefreshCw, LockKeyhole, Smartphone, ArrowLeft
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { isConfigured, supabase, type Profile, type PremiumRequest } from './supabase'

const pixPayload = import.meta.env.VITE_PIX_COPIA_COLA as string | undefined
const pixKey = import.meta.env.VITE_PIX_CHAVE_EXIBICAO as string | undefined
const pixHolder = import.meta.env.VITE_PIX_TITULAR as string | undefined
const amount = Number(import.meta.env.VITE_PIX_VALOR || 1.99)

type Question = {
  id: string
  career: string | null
  subject: string
  statement: string
  options: Record<string, string>
  exam_board: string | null
  exam_year: number | null
  source: string | null
  source_url: string | null
}

type AnswerResult = {
  is_correct: boolean
  correct_option: string
  explanation: string | null
}
type SimuladoQuestion = Question & {
  selected_option?: string | null
  correct_option?: string
  explanation?: string | null
  is_correct?: boolean
}
function money(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return

    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.27)
    oscillator.onended = () => { void context.close() }
  } catch {
    // O navegador pode bloquear o áudio automático.
  }
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [reference, setReference] = useState('')
  const [requests, setRequests] = useState<PremiumRequest[]>([])
  const [tab, setTab] = useState<'home' | 'premium' | 'admin' | 'questions' | 'simulado' | 'progress'>('home')
  const [requestSent, setRequestSent] = useState(false)

  const [questions, setQuestions] = useState<Question[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState('')
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [dailyUsed, setDailyUsed] = useState(0)
  const [progressLoading, setProgressLoading] = useState(false)
  const [progressAttempts, setProgressAttempts] = useState<{
    total: number
    correct: number
    incorrect: number
    percentage: number
  }>({
    total: 0,
    correct: 0,
    incorrect: 0,
    percentage: 0
  })

  const [subjectProgress, setSubjectProgress] = useState<{
    subject: string
    total: number
    correct: number
    percentage: number
  }[]>([])
const dailyLimit = 20
const dailyRemaining = Math.max(0, dailyLimit - dailyUsed)
  const [simuladoSessionId, setSimuladoSessionId] = useState<string | null>(null)
  const [simuladoQuestions, setSimuladoQuestions] = useState<SimuladoQuestion[]>([])
  const [simuladoAnswers, setSimuladoAnswers] = useState<Record<string, string>>({})
  const [simuladoIndex, setSimuladoIndex] = useState(0)
  const [simuladoResult, setSimuladoResult] = useState<SimuladoQuestion[] | null>(null)
  const [simuladoLoading, setSimuladoLoading] = useState(false)
  const [simuladoQuestionCount, setSimuladoQuestionCount] = useState(20)
  const [simuladoTimeLeft, setSimuladoTimeLeft] = useState(60 * 60) 
  
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) {
      setProfile(null)
      return
    }
      
    loadProfile()
  }, [session?.user?.id])
  

useEffect(() => {
  const client = supabase

  if (!client || !profile?.is_admin || !session?.user?.id) return

  const channel = client
    .channel('admin-premium-requests')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'premium_requests'
      },
      () => {
        void loadRequests()
        setMessage('Nova solicitação Premium recebida!')
        playNotificationSound()
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void loadRequests()
    })

  return () => {
    void client.removeChannel(channel)
  }
}, [profile?.is_admin, session?.user?.id])


useEffect(() => {
  if (!simuladoSessionId || simuladoResult) return

  const timer = window.setInterval(() => {
    setSimuladoTimeLeft((prev) => {
      if (prev <= 1) {
        window.clearInterval(timer)
        void finishSimulado()
        return 0
      }

      return prev - 1
    })
  }, 1000)

  return () => window.clearInterval(timer)
}, [simuladoSessionId, simuladoResult])

  async function loadProfile() {
    if (!supabase || !session?.user) return
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    if (error) {
      setMessage('Não foi possível carregar seu perfil: ' + error.message)
      return
    }
    setProfile(data as Profile)
  }

  async function loadRequests() {
    if (!supabase || !profile?.is_admin) return
    const { data, error } = await supabase
      .from('premium_requests').select('*')
      .order('created_at', { ascending: false })
    if (error) setMessage('Erro ao carregar solicitações: ' + error.message)
    else setRequests((data || []) as PremiumRequest[])
  }

  
  async function loadQuestions() {
    if (!supabase) return

    setQuestionsLoading(true)
    setMessage('')

    const pageSize = 1000
    let from = 0
    let allQuestions: Question[] = []

    while (true) {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)

      if (error) {
        setMessage('Erro ao carregar questões: ' + error.message)
        setQuestionsLoading(false)
        return
      }

      const page = (data || []) as Question[]
      allQuestions = [...allQuestions, ...page]

      if (page.length < pageSize) break

      from += pageSize
    }

    const shuffledQuestions = [...allQuestions]

    for (let i = shuffledQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledQuestions[i], shuffledQuestions[j]] =
        [shuffledQuestions[j], shuffledQuestions[i]]
    }

    setQuestions(shuffledQuestions)
    setQuestionIndex(0)
    setSelectedOption('')
    setAnswerResult(null)
    setQuestionsLoading(false)
  }

    
async function startSimulado() {
  if (!supabase) return

  const questionCount =
  profile?.is_admin ||
  (profile?.premium_until &&
    new Date(profile.premium_until) > new Date())
    ? simuladoQuestionCount
    : 20

  setSimuladoLoading(true)
  setMessage('')
  setSimuladoResult(null)
  setSimuladoAnswers({})
  setSimuladoIndex(0)
  setSimuladoSessionId(null)
  setSimuladoQuestions([])

  const { data, error } = await supabase.rpc('start_daily_simulado', {
    p_question_count: questionCount
  })

  if (error) {
    setMessage('Erro ao iniciar simulado: ' + error.message)
  } else if (
    !data?.session_id ||
    !Array.isArray(data?.questions) ||
    data.questions.length !== questionCount
  ) {
    setMessage(
      `Não foi possível carregar as ${questionCount} questões previstas.`
    )
  } else {
    setSimuladoSessionId(data.session_id)
    setSimuladoQuestions(data.questions as SimuladoQuestion[])
    setSimuladoTimeLeft(questionCount * 3 * 60)
    setMessage(`Simulado iniciado com ${questionCount} questões!`)
  }

  setSimuladoLoading(false)
}

async function loadDailyUsage() {
  if (!supabase) return

  const { data, error } = await supabase.rpc('get_daily_question_usage')

  if (error) {
    console.error('Erro ao consultar limite diário:', error.message)
    return
  }

  setDailyUsed(Number(data || 0))
}
  async function loadProgress() {
  if (!supabase || !session?.user?.id) return

  setProgressLoading(true)

  try {
    const { data: attempts, error: attemptsError } = await supabase
      .from('question_attempts')
      .select('question_id, is_correct')
      .eq('user_id', session.user.id)

    if (attemptsError) throw attemptsError

    const answers = attempts || []
    const questionIds = [...new Set(answers.map(item => item.question_id))]

    let questionsData: { id: string; subject: string | null }[] = []

    if (questionIds.length > 0) {
      const { data, error } = await supabase
        .from('questions')
        .select('id, subject')
        .in('id', questionIds)

      if (error) throw error
      questionsData = data || []
    }

    const subjectMap = new Map(
      questionsData.map(question => [
        question.id,
        question.subject?.trim() || 'Sem disciplina'
      ])
    )

    const correct = answers.filter(item => item.is_correct).length
    const incorrect = answers.length - correct

    setProgressAttempts({
      total: answers.length,
      correct,
      incorrect,
      percentage: answers.length
        ? Math.round((correct / answers.length) * 100)
        : 0
    })

    const grouped = new Map<string, { total: number; correct: number }>()

    answers.forEach(item => {
      const subject = subjectMap.get(item.question_id) || 'Sem disciplina'
      const current = grouped.get(subject) || { total: 0, correct: 0 }

      current.total++
      if (item.is_correct) current.correct++

      grouped.set(subject, current)
    })

    const results = Array.from(grouped.entries())
      .map(([subject, values]) => ({
        subject,
        total: values.total,
        correct: values.correct,
        percentage: Math.round((values.correct / values.total) * 100)
      }))
      .sort((a, b) => a.percentage - b.percentage)

    setSubjectProgress(results)
  } catch (error: any) {
    console.error('Erro ao carregar progresso:', error.message)
  } finally {
    setProgressLoading(false)
  }
}
  async function submitAnswer() {
    if (!supabase || !currentQuestion || !selectedOption || answerResult) return
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.rpc('submit_question_answer', {
      p_question_id: currentQuestion.id,
      p_selected_option: selectedOption
    })
    setLoading(false)

    if (error) {
      setMessage('Não foi possível enviar sua resposta: ' + error.message)
      return
    }
    const result = Array.isArray(data) ? data[0] : data

if (!result || typeof result.is_correct !== 'boolean') {
  setMessage('Não foi possível interpretar o gabarito recebido.')
  return
}

setAnswerResult(result as AnswerResult)
    await loadDailyUsage()
    await loadProgress()
  }
  async function finishSimulado() {
    if (!supabase || !simuladoSessionId) return
    if (simuladoLoading || simuladoResult) return

    setSimuladoLoading(true)
    setMessage('')

    const { data, error } = await supabase.rpc('finish_daily_simulado', {
      p_session_id: simuladoSessionId,
      p_answers: simuladoAnswers
    })

    setSimuladoLoading(false)

    if (error) {
      setMessage('Erro ao finalizar simulado: ' + error.message)
      return
    }

    const result = Array.isArray(data) ? data[0] : data

    if (!result || !result.results) {
      setMessage('Não foi possível carregar o resultado do simulado.')
      return
    }

    setSimuladoResult(result.results as SimuladoQuestion[])
    setMessage('Simulado finalizado com sucesso!')
  }
  useEffect(() => {
  if (tab === 'questions') {
    loadQuestions()
    loadDailyUsage()
  }
}, [tab, session?.user?.id])

  useEffect(() => {
    if (profile?.is_admin && tab === 'admin') loadRequests()
  }, [profile?.is_admin, tab])

  async function authenticate(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setMessage('')
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'https://helderppontes-star.github.io/Aprova-Seguran-a-/'
    }
  })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (result.error) setMessage(result.error.message)
    else if (authMode === 'signup' && !result.data.session)
      setMessage('Cadastro iniciado. Confira seu e-mail para confirmar a conta e depois entre no aplicativo.')
    else setMessage('Acesso realizado.')
  }

  
async function requestPremium() {
  if (!supabase || !session?.user) return

  setLoading(true)
  setMessage('')

  try {
    // Verifica se o usuário já possui solicitação pendente
    const { data: existing, error: checkError } = await supabase
      .from('premium_requests')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle()

    if (checkError) {
      setMessage('Não foi possível verificar sua solicitação: ' + checkError.message)
      return
    }

    if (existing) {
      setRequestSent(true)
      setMessage('Você já possui uma solicitação Premium pendente. Não é necessário enviar outra.')
      return
    }

    // Registra a solicitação vinculada à conta cadastrada
    const { error } = await supabase
      .from('premium_requests')
      .insert({
        user_id: session.user.id,
        email: session.user.email,
        amount_cents: Math.round(amount * 100),
        transaction_reference: reference.trim() || null
      })

    if (error) {
      setMessage('Não foi possível enviar a solicitação: ' + error.message)
      return
    }

    setRequestSent(true)
    setMessage('Solicitação registrada com sucesso! Agora você pode realizar o pagamento. Aguarde a conferência do administrador.')
  } catch {
    setMessage('Ocorreu um erro. Tente novamente.')
  } finally {
    setLoading(false)
  }
}


  async function reviewRequest(id: string, approve: boolean) {
    if (!supabase) return
    setLoading(true)
    setMessage('')
    const { error } = await supabase.rpc(
      approve ? 'approve_premium_request' : 'reject_premium_request',
      { request_id: id }
    )
    setLoading(false)
    if (error) setMessage('Não foi possível concluir: ' + error.message)
    else {
      setMessage(approve ? 'Premium liberado por 30 dias.' : 'Solicitação recusada.')
      await loadRequests()
      await loadProfile()
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setTab('home')
  }

  const currentQuestion = questions[questionIndex]
  const isPremium = Boolean(
    profile?.premium_until &&
    new Date(profile.premium_until).getTime() > Date.now()
  )
  const pendingCount = useMemo(
    () => requests.filter(r => r.status === 'pending').length,
    [requests]
  )  
    if (!isConfigured || !supabase) {
    return (
      <main className="app">
        <section className="panel">
          <Shield size={42} />
          <h1>Aprova Segurança</h1>
          <p>O aplicativo precisa ser configurado com o Supabase.</p>
        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="app">
        <section className="panel auth-panel">
        <div className="brand">
  <div className="brand-mark">
    <Shield size={96} strokeWidth={1.8} />
    <b>AS</b>
  </div>
  <div>
    <strong>Aprova Segurança</strong>
    <span>PREPARAÇÃO E APROVAÇÃO</span>
  </div>
</div>
          <h1>Aprova Segurança</h1>
          <p>Prepare-se para conquistar sua vaga na segurança pública.</p>
          <form onSubmit={authenticate}>
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              required
            />
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              minLength={6}
            />
            <button className="primary" disabled={loading}>
              {loading ? 'Aguarde...' : authMode === 'signup' ? 'Criar conta' : 'Entrar'}
            </button>
          </form>
          <button className="link-button" onClick={() => {
            setAuthMode(authMode === 'signup' ? 'login' : 'signup')
            setMessage('')
          }}>
            {authMode === 'signup' ? 'Já tenho uma conta. Entrar' : 'Não tenho conta. Criar cadastro'}
          </button>
          {message && <p className="notice">{message}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
  <div className="brand-mark">
    <Shield size={42} strokeWidth={1.8} />
    <b>AS</b>
  </div>
  <div>
    <strong>Aprova Segurança</strong>
    <small>Seu futuro começa aqui</small>
  </div>
</div>
        
   
{profile?.is_admin && (
  <button
    className="icon-button"
    onClick={() => setTab('admin')}
    title={`${pendingCount} solicitações Premium pendentes`}
    style={{ position: 'relative' }}
  >
    <Bell size={20} />
    {pendingCount > 0 && (
      <span style={{
        position: 'absolute',
        top: '-5px',
        right: '-5px',
        minWidth: '18px',
        height: '18px',
        padding: '0 4px',
        borderRadius: '999px',
        background: '#dc2626',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #fff'
      }}>
        {pendingCount > 99 ? '99+' : pendingCount}
      </span>
    )}
  </button>
)}
<button className="icon-button" onClick={signOut} title="Sair">
  <LogOut size={20} />
</button>
      </header>

      <section className="welcome">
        <p>Olá, candidato!</p>
        <h1>Vamos estudar hoje?</h1>
        <span>{session.user.email}</span>
      </section>

<nav className="tabs">
  <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>
    Início
  </button>

  <button className={tab === 'questions' ? 'active' : ''} onClick={() => setTab('questions')}>
    Questões
  </button>

  <button className={tab === 'premium' ? 'active' : ''} onClick={() => setTab('premium')}>
    Premium
  </button>

  {profile?.is_admin && (
    <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>
      Administração
    </button>
  )}
</nav>

      {message && <div className="notice">{message}</div>}

      {tab === 'home' && (
        <section className="content">
          <h2>Área de estudos</h2>
          
          <div className="feature-grid">
            <button className="feature" onClick={() => setTab('questions')}>
              <BookOpen size={30} />
              <strong>Banco de questões</strong>
              <span>Resolva questões e confira sua correção.</span>
            </button>

            <button className="feature" onClick={() => setTab('simulado')}>
              <CheckCircle2 size={30} />
              <strong>Simulados</strong>
              <span>Treine para sua prova.</span>
            </button>

            <button className="feature" onClick={() => setTab('progress')}>
              <strong>📊 Meu Progresso</strong>
              <span>Acompanhe seus acertos e desempenho.</span>
            </button>

            <button className="feature" onClick={() => setTab('premium')}>
              <Crown size={30} />
              <strong>Plano Premium</strong>
              <span>Conheça os recursos Premium.</span>
            </button>
          </div>

          <div className="panel">
            <h3>Seu acesso</h3>
            <p>{isPremium ? 'Premium ativo' : 'Plano gratuito'}</p>
            {profile?.premium_until && (
              <small>Validade: {new Date(profile.premium_until).toLocaleDateString('pt-BR')}</small>
            )}
          </div>
        </section>
      )}
      
      {tab === 'progress' && (
        <section className="content">
          <h2>Meu Progresso</h2>
          <p>Acompanhe seu desempenho nos estudos.</p>

          {progressLoading ? (
            <div className="panel">
              <p>Carregando seu progresso...</p>
            </div>
          ) : (
            <>
              <div className="feature-grid">
                <div className="panel">
                  <h3>Respondidas</h3>
                  <strong>{progressAttempts.total}</strong>
                </div>

                <div className="panel">
                  <h3>Acertos</h3>
                  <strong>{progressAttempts.correct}</strong>
                </div>

                <div className="panel">
                  <h3>Erros</h3>
                  <strong>{progressAttempts.incorrect}</strong>
                </div>

                <div className="panel">
                  <h3>Aproveitamento</h3>
                  <strong>{progressAttempts.percentage}%</strong>
                </div>
              </div>

              <div className="panel">
                <h3>Desempenho por disciplina</h3>

                {subjectProgress.length === 0 ? (
                  <p>Você ainda não respondeu questões. Comece pela aba Questões!</p>
                ) : (
                  subjectProgress.map((item) => (
                    <div key={item.subject} style={{ marginBottom: '20px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}>
                        <strong>{item.subject}</strong>
                        <strong>{item.percentage}%</strong>
                      </div>

                      <div style={{
                        background: '#ddd',
                        height: '10px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        margin: '8px 0'
                      }}>
                        <div style={{
                          width: `${item.percentage}%`,
                          height: '100%',
                          background: '#c99a32',
                          borderRadius: '10px'
                        }} />
                      </div>

                      <small>
                        {item.correct} acertos de {item.total} questões
                      </small>
                    </div>
                  ))
                )}
              </div>

              {subjectProgress.length > 0 && (
                <div className="panel">
                  <h3>Disciplina que merece atenção</h3>
                  <p>
                    Continue praticando: <strong>{subjectProgress[0].subject}</strong>.
                  </p>
                  <p>
                    Seu aproveitamento nessa disciplina é de
                    {' '}{subjectProgress[0].percentage}%.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}

{tab === 'questions' && (
  <section className="content">
    <button className="link-button" onClick={() => setTab('home')}>
      <ArrowLeft size={16} /> Voltar ao início
    </button>

    <div className="section-heading">
      <BookOpen size={28} />
      <div>
        <h2>Banco de questões</h2>
        <p>Pratique e acompanhe sua evolução.</p>
      </div>
    </div>

    <div className="panel">
      <strong>
        {isPremium || profile?.is_admin
          ? 'Questões ilimitadas'
          : `Questões gratuitas restantes: ${dailyRemaining.toString().padStart(2, '0')}/20`}
      </strong>

      {!isPremium && !profile?.is_admin && (
        <div style={{
          background: '#35516e',
          height: '10px',
          borderRadius: '10px',
          marginTop: '10px'
        }}>
          <div style={{
            background: '#78e0b6',
            width: `${(dailyRemaining / 20) * 100}%`,
            height: '10px',
            borderRadius: '10px'
          }} />
        </div>
      )}
    </div>

    {questionsLoading && <p>Carregando questões...</p>}

    {!questionsLoading && !isPremium && !profile?.is_admin && dailyRemaining === 0 && (
      <div className="panel">
        <Crown size={40} />
        <h2>Você utilizou suas 20 questões gratuitas de hoje!</h2>
        <p>Continue sua preparação sem limites com o plano Premium.</p>
        <button className="primary" onClick={() => setTab('premium')}>
          Conhecer o Premium
        </button>
        <p>Suas questões gratuitas serão renovadas à meia-noite.</p>
      </div>
    )}

    {!questionsLoading && questions.length === 0 && (
      <div className="panel">
        <BookOpen size={34} />
        <h3>Nenhuma questão disponível ainda</h3>
        <p>As questões aparecerão aqui assim que forem cadastradas no banco de dados.</p>
        <button className="secondary" onClick={loadQuestions}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>
    )}

    {!questionsLoading && currentQuestion &&
      (isPremium || profile?.is_admin || dailyRemaining > 0) && (
      <div className="panel question-panel">
        <div className="question-meta">
          <span>{currentQuestion.subject}</span>
          {currentQuestion.career && <span>{currentQuestion.career}</span>}
          {currentQuestion.exam_board && <span>{currentQuestion.exam_board}</span>}
          {currentQuestion.exam_year && <span>{currentQuestion.exam_year}</span>}
        </div>

        <p className="question-counter">
          Questão {questionIndex + 1} de {questions.length}
        </p>

        <h3>{currentQuestion.statement}</h3>

        <div className="options">
          {Object.entries(currentQuestion.options || {}).map(([letter, option]) => (
            <button
              key={letter}
              className={[
                'option',
                selectedOption === letter ? 'selected' : '',
                answerResult && letter === answerResult.correct_option ? 'correct' : '',
                answerResult && selectedOption === letter && !answerResult.is_correct ? 'incorrect' : ''
              ].join(' ')}
              disabled={Boolean(answerResult)}
              onClick={() => setSelectedOption(letter)}
            >
              <strong>{letter})</strong> {option}
            </button>
          ))}
        </div>

        {!answerResult ? (
          <button
            className="primary"
            disabled={!selectedOption || loading}
            onClick={submitAnswer}
          >
            {loading ? 'Enviando...' : 'Responder questão'}
          </button>
        ) : (
          <div className="correction">
            <h3>
              {answerResult.is_correct ? 'Resposta correta!' : 'Resposta incorreta'}
            </h3>
            <p>Gabarito: {answerResult.correct_option}</p>
            {answerResult.explanation && <p>{answerResult.explanation}</p>}
          </div>
        )}

        {currentQuestion.source && (
          <p className="source">Fonte: {currentQuestion.source}</p>
        )}

        {currentQuestion.source_url && (
          <a href={currentQuestion.source_url} target="_blank" rel="noreferrer">
            Consultar fonte original
          </a>
        )}

        {answerResult && (
          <button className="secondary" onClick={() => {
            setQuestionIndex((questionIndex + 1) % questions.length)
            setSelectedOption('')
            setAnswerResult(null)
          }}>
            Próxima questão
          </button>
        )}
      </div>
    )}
  </section>
)}
{tab === 'simulado' && (
  <section className="content">
  <button
  className="link-button"
  onClick={() => {
    setSimuladoSessionId(null)
    setSimuladoQuestions([])
    setSimuladoAnswers({})
    setSimuladoIndex(0)
    setSimuladoResult(null)
    setSimuladoTimeLeft(0)
    setMessage('')
    setTab('home')
  }}
>
  <ArrowLeft size={16} /> Voltar ao início
</button>

    <div className="panel">
      <h2>Simulados</h2>
      <p>Escolha a quantidade de questões do seu simulado.</p>

{(profile?.is_admin ||
  (profile?.premium_until &&
    new Date(profile.premium_until) > new Date())) && !simuladoSessionId && (
  <div className="panel">
    <p>Quantidade de questões Premium:</p>

    <div className="options">
      {[20, 40, 60].map((amount) => (
        <button
          key={amount}
          className={`option ${
            simuladoQuestionCount === amount ? 'selected' : ''
          }`}
          onClick={() => setSimuladoQuestionCount(amount)}
        >
          {amount} questões — {amount * 3} minutos
        </button>
      ))}
    </div>
  </div>
)}

      {!simuladoSessionId && !simuladoResult && (
        <button
          className="primary"
          onClick={startSimulado}
          disabled={simuladoLoading}
        >
          {simuladoLoading ? 'Preparando simulado...' : 'Iniciar simulado'}
        </button>
      )}

      {simuladoQuestions.length > 0 && !simuladoResult && (
        <>
          {simuladoSessionId && !simuladoResult && (
            <div
              className="correction"
              style={{ textAlign: 'center', marginBottom: '16px' }}
            >
              <p> TEMPO RESTANTE </p>
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                {String(Math.floor(simuladoTimeLeft / 60)).padStart(2, '0')}:
                {String(simuladoTimeLeft % 60).padStart(2, '0')}
              </div>
            </div>
          )}
  <p>Questão {simuladoIndex + 1} de {simuladoQuestions.length}</p>

          <h3>{simuladoQuestions[simuladoIndex]?.statement}</h3>

          <div className="options">
            {Object.entries(simuladoQuestions[simuladoIndex]?.options || {}).map(
              ([letter, option]) => (
                <button
                  key={letter}
                  className={[
                    'option',
                    simuladoAnswers[simuladoQuestions[simuladoIndex].id] === letter
                      ? 'selected'
                      : ''
                  ].join(' ')}
                  onClick={() =>
                    setSimuladoAnswers(prev => ({
                      ...prev,
                      [simuladoQuestions[simuladoIndex].id]: letter
                    }))
                  }
                >
                  <strong>{letter})</strong> {option}
                </button>
              )
            )}
          </div>

 
          <div className="button-row">
            <button
              className="secondary"
              disabled={simuladoIndex === 0}
              onClick={() => setSimuladoIndex(i => i - 1)}
            >
              Anterior
            </button>

            <button
              className="secondary"
              disabled={simuladoIndex === simuladoQuestions.length - 1}
              onClick={() => setSimuladoIndex(i => i + 1)}
            >
              Próxima
            </button>
          </div>

          <p>
            Respondidas: {Object.keys(simuladoAnswers).length}/{simuladoQuestions.length}
          </p>

          <button
            className="primary"
            onClick={finishSimulado}
            disabled={simuladoLoading}
          >
            {simuladoLoading ? 'Finalizando...' : 'Finalizar simulado'}
          </button>
        </>
      )}

      {simuladoResult && (
        <div className="correction">
          <h2>Resultado do simulado</h2>
          <p>
            Acertos: {simuladoResult.filter(q => q.is_correct).length} de {simuladoResult.length}
          </p>

          {simuladoResult.map((q, index) => (
            <div key={q.id}>
              <h3>Questão {index + 1}</h3>
              <p>{q.statement}</p>
              <p>Sua resposta: {q.selected_option}</p>
              <p>Gabarito: {q.correct_option}</p>
              <p>{q.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
)} 
    
{tab === 'premium' && (
  <section className="content">
    <div className="panel">
      <h2>⭐ Seja Premium!</h2>

      <div className="price">
        <strong>{money(Math.round(amount * 100))}</strong>
        <span> / 30 dias</span>
      </div>

      <h3>Suas vantagens:</h3>
      <ul>
        <li><strong>Questões ilimitadas:</strong> estude sem limite diário.</li>
        <li><strong>Simulados personalizados:</strong> escolha 20, 40 ou 60 questões.</li>
        <li><strong>Mais tempo para testar seus conhecimentos:</strong> 3 minutos por questão.</li>
        <li><strong>Histórico de desempenho:</strong> acompanhe seus resultados nos simulados.</li>
      </ul>

      <p>Prepare-se melhor e aumente suas chances de aprovação!</p>

      {isPremium ? (
        <p>
          Seu Premium está ativo até{' '}
          {new Date(profile!.premium_until!).toLocaleDateString('pt-BR')}.
        </p>
      ) : (
        <>
          {requestSent ? (
            <>
              <p className="notice">
                Sua solicitação foi registrada! Faça o pagamento pelo PIX abaixo.
                A liberação ocorrerá após a conferência do pagamento.
              </p>

              {pixPayload ? (
                <div className="pix-box">
                  <h3>Pagamento via PIX</h3>
                  <QRCodeCanvas
                    value={pixPayload}
                    size={210}
                    level="M"
                    includeMargin
                  />
                  <button
                    className="secondary"
                    onClick={() => navigator.clipboard.writeText(pixPayload)}
                  >
                    <Copy size={16} /> Copiar PIX copia e cola
                  </button>
                  {pixKey && <p>Chave PIX: <strong>{pixKey}</strong></p>}
                  {pixHolder && <p>Titular: {pixHolder}</p>}
                </div>
              ) : (
                <p className="notice">O PIX ainda precisa ser configurado.</p>
              )}
            </>
          ) : (
            <>
              <p className="small">
                Solicite o Premium para registrar seu pedido e liberar os dados
                de pagamento.
              </p>
              <button
                className="primary"
                onClick={requestPremium}
                disabled={loading}
              >
                {loading
                  ? 'Enviando...'
                  : 'Solicitar Premium e liberar PIX'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  </section>
)}

      {tab === 'admin' && profile?.is_admin && (
        <section className="content">
          <h2>Solicitações Premium</h2>
          <p>{pendingCount} aguardando análise</p>
          <button className="secondary" onClick={loadRequests}>
            <RefreshCw size={16} /> Atualizar solicitações
          </button>

          {requests.length === 0 ? (
            <div className="panel">Nenhuma solicitação encontrada.</div>
          ) : (
            requests.map(r => (
              <div className="panel" key={r.id}>
                <strong>{r.email}</strong>
                <p>{money(r.amount_cents)}</p>
                <p>Status: {r.status === 'pending' ? 'Pendente' : r.status === 'approved' ? 'Aprovado' : 'Recusado'}</p>
                {r.transaction_reference && <p>Referência: {r.transaction_reference}</p>}
                {r.status === 'pending' && (
                  <div className="button-row">
                    <button className="approve" disabled={loading} onClick={() => reviewRequest(r.id, true)}>
                      <CheckCircle2 size={16} /> Liberar 30 dias
                    </button>
                    <button className="reject" disabled={loading} onClick={() => reviewRequest(r.id, false)}>
                      <XCircle size={16} /> Recusar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          <p className="small">Confira o recebimento diretamente no banco antes de liberar o Premium.</p>
        </section>
      )}
    </main>
  )
}
