import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bot, Send, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: number
  from: 'bot' | 'user'
  text: string
}

const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['check in', 'checkin', 'scan', 'attendance'],
    answer:
      'Stand in front of the camera and click "Scan to check in / out". Keep your face centered and well-lit for the best match.',
  },
  {
    keywords: ['check out', 'checkout'],
    answer:
      'Just scan again - the system automatically figures out whether you need to check in or check out based on your last scan today.',
  },
  {
    keywords: ['camera', 'webcam', 'permission', 'black'],
    answer:
      "If the camera isn't showing, your browser may be blocking access. Check the camera permission for this site in your browser settings and reload the page.",
  },
  {
    keywords: ['not recognized', 'recognised', "doesn't work", 'denied', 'fail'],
    answer:
      "If your face isn't recognized, ask an admin to re-enroll you with a few clearer, well-lit shots from slightly different angles.",
  },
  {
    keywords: ['admin', 'sign in', 'login', 'log in'],
    answer:
      'Admins can sign in from the "Admin sign in" link at the top of this page to manage employees and attendance records.',
  },
  {
    keywords: ['enroll', 'register', 'new employee'],
    answer:
      'An admin needs to add you as an employee and capture 3-5 reference photos of your face before you can check in.',
  },
  {
    keywords: ['hi', 'hello', 'hey'],
    answer: "Hello! I'm the attendance assistant. Ask me about checking in, the camera, or admin access.",
  },
  {
    keywords: ['thank', 'thanks'],
    answer: "You're welcome! Anything else I can help with?",
  },
]

const QUICK_REPLIES = ['How do I check in?', 'Camera isn’t working', 'Where do I sign in as admin?']

function getBotReply(message: string): string {
  const lower = message.toLowerCase()
  const match = FAQ.find((entry) => entry.keywords.some((keyword) => lower.includes(keyword)))
  return (
    match?.answer ??
    "I'm just a small demo assistant, so I don't have an answer for that yet - try asking about checking in, the camera, or admin sign-in."
  )
}

let nextId = 1

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId++, from: 'bot', text: "Hi! I'm a sample attendance assistant. Ask me how to check in, or try a suggestion below." },
  ])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => [...prev, { id: nextId++, from: 'user', text: trimmed }])
    setDraft('')
    setTyping(true)
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId++, from: 'bot', text: getBotReply(trimmed) }])
      setTyping(false)
    }, 550)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 left-6 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-300">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">Attendance assistant</p>
                <p className="text-[11px] text-slate-500">Sample chatbot &middot; scripted replies</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn('flex', message.from === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <p
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-snug',
                      message.from === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-800 bg-slate-800/60 text-slate-200',
                    )}
                  >
                    {message.text}
                  </p>
                </motion.div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-2">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-slate-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 border-t border-slate-800 px-3 py-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => send(reply)}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-300 transition-colors hover:bg-indigo-500/20"
                  >
                    <Sparkles className="h-3 w-3" />
                    {reply}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(draft)
              }}
              className="flex items-center gap-2 border-t border-slate-800 p-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask a question..."
                className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        title="Chat with the attendance assistant"
        className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/50"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'open'}
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
          >
            {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  )
}
