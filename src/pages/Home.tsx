import { useState, useRef, useEffect } from 'react'
import { Search, Globe, AlertCircle, ExternalLink, ChevronDown, Sparkles, List } from 'lucide-react'
import { trpc } from "@/providers/trpc"

interface SearchResult {
  title: string
  url: string
  domain: string
  snippet: string
}

interface GenSource {
  url: string
  title: string
  used: boolean
}

const SEARCH_TYPES = [
  { value: 'SEARCH_TYPE_RU', label: 'Русский' },
  { value: 'SEARCH_TYPE_COM', label: 'Международный' },
  { value: 'SEARCH_TYPE_TR', label: 'Турецкий' },
  { value: 'SEARCH_TYPE_KK', label: 'Казахский' },
  { value: 'SEARCH_TYPE_BE', label: 'Белорусский' },
  { value: 'SEARCH_TYPE_UZ', label: 'Узбекский' },
]

type SearchMode = 'regular' | 'ai'

export default function Home() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('regular')

  // Regular search state
  const [results, setResults] = useState<SearchResult[]>([])

  // AI search state
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiSources, setAiSources] = useState<GenSource[]>([])
  const [aiHints, setAiHints] = useState<string[]>([])
  const [aiRejected, setAiRejected] = useState(false)

  // Shared state
  const [error, setError] = useState<string | null>(null)
  const [searchType, setSearchType] = useState<string>('SEARCH_TYPE_RU')
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const regularMutation = trpc.search.yandex.useMutation({
    onSuccess: (data) => {
      setResults(data.results)
      setAiAnswer('')
      setAiSources([])
      setError(null)
    },
    onError: (err) => {
      setError(err.message)
      setResults([])
    },
  })

  const aiMutation = trpc.genSearch.yandex.useMutation({
    onSuccess: (data) => {
      setAiAnswer(data.answer)
      setAiSources(data.sources)
      setAiHints(data.hints)
      setAiRejected(data.isAnswerRejected)
      setResults([])
      setError(null)
    },
    onError: (err) => {
      setError(err.message)
      setAiAnswer('')
      setAiSources([])
    },
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTypeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setError(null)
    setHasSearched(true)

    if (mode === 'regular') {
      regularMutation.mutate({ queryText: query.trim(), searchType: searchType as any, page: 0 })
    } else {
      aiMutation.mutate({ queryText: query.trim(), searchType: searchType as any })
    }
  }

  const loading = regularMutation.isPending || aiMutation.isPending
  const currentTypeLabel = SEARCH_TYPES.find(t => t.value === searchType)?.label || 'Русский'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#fc3f1d] flex items-center justify-center text-white font-bold text-xs">
            Y
          </div>
          <span className="text-sm font-medium text-white/60">Search API Demo</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            API Ready
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center px-4"
        style={{ marginTop: hasSearched ? '40px' : '20vh' }}>

        {/* Logo */}
        {!hasSearched && (
          <div className="mb-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#fc3f1d] flex items-center justify-center text-white font-bold text-2xl">
              Y
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Search</h1>
          </div>
        )}

        {/* Mode toggle */}
        <div className="mb-4 flex bg-[#1a1a1a] rounded-xl p-1 border border-white/5">
          <button
            onClick={() => setMode('regular')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'regular'
                ? 'bg-[#fc3f1d] text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <List size={14} />
            Обычный
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'ai'
                ? 'bg-[#fc3f1d] text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Sparkles size={14} />
            ИИ-ответ
          </button>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl">
          <div className="relative">
            <div className="flex items-center bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden focus-within:border-[#fc3f1d]/50 focus-within:ring-1 focus-within:ring-[#fc3f1d]/20 transition-all">
              <div className="pl-4 text-white/30">
                {mode === 'ai' ? <Sparkles size={20} /> : <Search size={20} />}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === 'ai' ? 'Задайте вопрос ИИ...' : 'Введите поисковый запрос...'}
                className="flex-1 bg-transparent px-4 py-4 text-base outline-none placeholder:text-white/25"
                disabled={loading}
              />

              {/* Search type selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="flex items-center gap-1 px-3 py-2 mr-1 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Globe size={13} />
                  {currentTypeLabel}
                  <ChevronDown size={12} />
                </button>
                {showTypeDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50 min-w-[140px]">
                    {SEARCH_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => { setSearchType(type.value); setShowTypeDropdown(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          searchType === type.value
                            ? 'bg-[#fc3f1d]/10 text-[#fc3f1d]'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="mr-2 px-5 py-2.5 bg-[#fc3f1d] hover:bg-[#e0351a] disabled:opacity-40 disabled:hover:bg-[#fc3f1d] text-white text-sm font-medium rounded-xl transition-colors"
              >
                {loading ? '...' : mode === 'ai' ? 'Спросить' : 'Найти'}
              </button>
            </div>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-6 w-full max-w-2xl bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-300 font-medium">Ошибка</p>
                <p className="text-sm text-red-300/70 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Results */}
        {mode === 'ai' && hasSearched && !error && !loading && (
          <div className="mt-8 w-full max-w-2xl">
            {aiRejected ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4">
                <p className="text-sm text-amber-300">Модель отказалась отвечать на этот запрос по этическим соображениям.</p>
              </div>
            ) : aiAnswer ? (
              <div className="space-y-6">
                {/* AI Answer */}
                <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-[#fc3f1d]" />
                    <span className="text-sm font-medium text-white/60">Ответ YandexGPT</span>
                  </div>
                  <div className="text-white/80 leading-relaxed whitespace-pre-wrap">
                    {aiAnswer}
                  </div>
                </div>

                {/* Sources */}
                {aiSources.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3">
                      Источники ({aiSources.length})
                    </h3>
                    <div className="space-y-3">
                      {aiSources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 group hover:bg-white/[0.02] -mx-2 px-2 py-2 rounded-xl transition-colors"
                        >
                          <span className="text-xs text-white/20 mt-0.5">{idx + 1}</span>
                          <div>
                            <h4 className="text-[#8ab4f8] text-sm font-medium group-hover:underline">
                              {src.title}
                            </h4>
                            <p className="text-xs text-white/30 truncate max-w-md">{src.url}</p>
                          </div>
                          {src.used && (
                            <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                              использован
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hints */}
                {aiHints.length > 0 && (
                  <div className="bg-white/[0.02] rounded-xl p-4">
                    <p className="text-xs text-white/30 mb-2">Подсказки:</p>
                    {aiHints.map((hint, idx) => (
                      <p key={idx} className="text-sm text-white/40">{hint}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-white/30">
                <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Нет ответа</p>
              </div>
            )}
          </div>
        )}

        {/* Regular Results */}
        {mode === 'regular' && hasSearched && !error && (
          <div className="mt-8 w-full max-w-2xl">
            <div className="mb-4 text-xs text-white/30">
              {loading ? 'Поиск...' : `Найдено результатов: ${results.length}`}
            </div>

            {results.length > 0 ? (
              <div className="space-y-5">
                {results.map((result, idx) => (
                  <div key={idx} className="group">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:bg-white/[0.02] -mx-3 px-3 py-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-white/40">{result.domain}</span>
                        <ExternalLink size={11} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="text-[#8ab4f8] text-base font-medium mb-1 group-hover:underline decoration-1 underline-offset-2">
                        {result.title}
                      </h3>
                      {result.snippet && (
                        <p className="text-sm text-white/50 leading-relaxed line-clamp-3">
                          {result.snippet}
                        </p>
                      )}
                    </a>
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-16 text-white/30">
                <Search size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Нет результатов</p>
              </div>
            ) : null}

            {loading && results.length === 0 && (
              <div className="space-y-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-3 w-32 bg-white/5 rounded mb-2" />
                    <div className="h-4 w-3/4 bg-white/5 rounded mb-2" />
                    <div className="h-3 w-full bg-white/[0.03] rounded" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasSearched && (
          <p className="mt-6 text-xs text-white/20">
            {mode === 'ai' ? 'ИИ-ответ на базе YandexGPT' : 'Powered by Yandex Search API v2'}
          </p>
        )}
      </div>
    </div>
  )
}
