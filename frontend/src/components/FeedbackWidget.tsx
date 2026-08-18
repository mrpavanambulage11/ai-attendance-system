import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MessageSquareHeart, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { toast } from '@/lib/toast-store'
import { cn } from '@/lib/utils'

type Reaction = 'up' | 'down' | null

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [reaction, setReaction] = useState<Reaction>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function close() {
    setOpen(false)
    setTimeout(() => {
      setReaction(null)
      setComment('')
      setSubmitted(false)
    }, 200)
  }

  function handleSubmit() {
    if (!reaction) return
    setSubmitted(true)
    toast.success('Thanks for your feedback!')
    setTimeout(close, 1100)
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
            className="fixed bottom-24 left-24 z-40 w-80 max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-300">
                <MessageSquareHeart className="h-4 w-4" />
              </div>
              <p className="flex-1 text-sm font-semibold text-slate-100">Quick feedback</p>
              <button
                onClick={close}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              {submitted ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-4 text-center text-sm text-emerald-400"
                >
                  Thanks - your feedback helps us improve!
                </motion.p>
              ) : (
                <>
                  <p className="text-sm text-slate-400">How's your experience with this kiosk?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReaction('up')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors',
                        reaction === 'up'
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-800',
                      )}
                    >
                      <ThumbsUp className="h-4 w-4" /> Good
                    </button>
                    <button
                      onClick={() => setReaction('down')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors',
                        reaction === 'down'
                          ? 'border-red-500/40 bg-red-500/15 text-red-300'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-800',
                      )}
                    >
                      <ThumbsDown className="h-4 w-4" /> Needs work
                    </button>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Anything you'd like to add? (optional)"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!reaction}
                    className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Submit feedback
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        title="Send feedback"
        className="fixed bottom-6 left-24 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 shadow-lg shadow-black/40"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'open'}
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
          >
            {open ? <X className="h-5 w-5" /> : <MessageSquareHeart className="h-5 w-5" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  )
}
