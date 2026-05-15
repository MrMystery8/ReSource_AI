import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, MessageCircle, RefreshCw, Send, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ProjectContext {
  ideaTitle: string;
  materials: string[];
  steps: string[];
  deviceInfo: string;
}

export interface ProjectChatbotProps {
  projectContext: ProjectContext;
  isOpen: boolean;
  onToggle: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 50;
const REQUEST_TIMEOUT_MS = 30_000;

const API_URL = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL ?? '';
const API_KEY = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_KEY ?? '';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Appends a new message to history, discarding the oldest when the cap is
 * reached (Requirement 5.6 / Property 7).
 */
function appendMessage(history: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const next = [...history, message];
  if (next.length > MAX_HISTORY_MESSAGES) {
    return next.slice(next.length - MAX_HISTORY_MESSAGES);
  }
  return next;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectChatbot({ projectContext, isOpen, onToggle }: ProjectChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessageId, setErrorMessageId] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Clear conversation history on navigation away (Requirement 5.7)
  useEffect(() => {
    return () => {
      setMessages([]);
      setInputValue('');
      setIsLoading(false);
      setErrorMessageId(null);
      setLastUserMessage(null);
      abortControllerRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (messageText: string) => {
      const trimmed = messageText.trim();
      if (!trimmed || isLoading) return;

      // Validate message length (Requirement 5.3)
      if (trimmed.length > MAX_MESSAGE_LENGTH) return;

      // Abort any in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Build user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => appendMessage(prev, userMessage));
      setLastUserMessage(trimmed);
      setInputValue('');
      setIsLoading(true);
      setErrorMessageId(null);

      // Set up 30-second timeout (Requirement 5.5)
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const token = localStorage.getItem('resource_ai_token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/guide/chat`, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            message: trimmed,
            projectContext,
            conversationHistory: messages,
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorText = `Request failed (${response.status})`;
          try {
            const errorBody = await response.json() as { error?: { message?: string } };
            errorText = errorBody.error?.message ?? errorText;
          } catch {
            // ignore parse error
          }
          throw new Error(errorText);
        }

        const data = await response.json() as { reply: string };

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: data.reply,
          timestamp: Date.now(),
        };

        setMessages((prev) => appendMessage(prev, assistantMessage));
      } catch (err) {
        clearTimeout(timeoutId);

        if ((err as Error).name === 'AbortError') {
          // Timeout or manual abort — show error with retry (Requirement 5.5)
          const errorMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: controller.signal.aborted
              ? 'The request timed out after 30 seconds. You can retry your last message.'
              : 'The request was cancelled.',
            timestamp: Date.now(),
          };
          setMessages((prev) => appendMessage(prev, errorMsg));
          setErrorMessageId(errorMsg.id);
        } else {
          // Network or API error — show error with retry (Requirement 5.5)
          const errorMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: `Something went wrong: ${(err as Error).message}. You can retry your last message.`,
            timestamp: Date.now(),
          };
          setMessages((prev) => appendMessage(prev, errorMsg));
          setErrorMessageId(errorMsg.id);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, projectContext]
  );

  const handleRetry = useCallback(() => {
    if (lastUserMessage) {
      // Remove the error message from history before retrying
      setMessages((prev) => prev.filter((m) => m.id !== errorMessageId));
      // Also remove the last user message so it gets re-added cleanly
      setMessages((prev) => {
        const idx = [...prev].reverse().findIndex((m) => m.role === 'user' && m.content === lastUserMessage);
        if (idx === -1) return prev;
        const realIdx = prev.length - 1 - idx;
        return prev.filter((_, i) => i !== realIdx);
      });
      setErrorMessageId(null);
      void sendMessage(lastUserMessage);
    }
  }, [lastUserMessage, errorMessageId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(inputValue);
    }
  };

  const charsRemaining = MAX_MESSAGE_LENGTH - inputValue.length;
  const isOverLimit = charsRemaining < 0;
  const canSend = inputValue.trim().length > 0 && !isLoading && !isOverLimit;

  return (
    <>
      {/* Hint bubble — light motion cue to explain the chat affordance */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-[122px] right-6 z-30 pointer-events-none"
            aria-hidden="true"
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-full border shadow-lg text-xs font-medium text-text-primary"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 90%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-border-default) 80%, transparent)',
                backdropFilter: 'blur(18px) saturate(140%)',
                WebkitBackdropFilter: 'blur(18px) saturate(140%)',
              }}
            >
              <motion.span
                className="w-2 h-2 rounded-full bg-primary-400"
                animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              Need a second opinion? Ask the guide.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button — 44×44px minimum touch target (Requirement 5.1) */}
      <button
        onClick={onToggle}
        aria-label={isOpen ? 'Close project chatbot' : 'Open project chatbot'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30 hover:bg-primary-400 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
        style={{ width: 52, height: 52, minWidth: 44, minHeight: 44 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-5 h-5" aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Chat Panel — overlays the guide page (Requirement 5.2) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Project chatbot"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-[76px] right-6 z-40 w-[min(380px,calc(100vw-3rem))] h-[min(520px,calc(100vh-120px))]"
          >
            <div
              className="relative flex h-full flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-surface-card) 88%, transparent)',
                backdropFilter: 'blur(24px) saturate(150%)',
                WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 8%, transparent) 0%, transparent 26%), radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 14%, transparent) 0%, transparent 42%)',
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* Header */}
              <div className="relative flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-primary-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary leading-tight">Project Assistant</p>
                    <p className="text-[10px] text-text-muted leading-tight truncate max-w-[180px]">
                      {projectContext.ideaTitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onToggle}
                  aria-label="Close chatbot"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Messages */}
              <div
                className="relative flex-1 overflow-y-auto px-4 py-3 space-y-3"
                aria-live="polite"
                aria-label="Conversation history"
              >
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
                    <MessageCircle className="w-8 h-8 text-text-muted/40" aria-hidden="true" />
                    <p className="text-sm text-text-muted">
                      Ask anything about your project.
                    </p>
                    <p className="text-xs text-text-muted/60">
                      I'm scoped to: <span className="font-medium text-text-muted">{projectContext.ideaTitle}</span>
                    </p>
                  </div>
                )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={[
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary-500/20 text-primary-100 rounded-br-sm'
                        : msg.id === errorMessageId
                          ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-bl-sm'
                          : 'bg-surface-elevated text-text-primary rounded-bl-sm',
                    ].join(' ')}
                  >
                    {msg.id === errorMessageId && (
                      <AlertCircle className="w-3.5 h-3.5 inline-block mr-1.5 mb-0.5 text-rose-400" aria-hidden="true" />
                    )}
                    {msg.content}

                    {/* Retry button on error messages (Requirement 5.5) */}
                    {msg.id === errorMessageId && lastUserMessage && (
                      <button
                        onClick={handleRetry}
                        disabled={isLoading}
                        className="mt-2 flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 transition-colors disabled:opacity-50"
                        aria-label="Retry last message"
                      >
                        <RefreshCw className="w-3 h-3" aria-hidden="true" />
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator (Requirement 5.3) */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-elevated rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-1.5" aria-label="Assistant is typing" role="status">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-text-muted"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="relative shrink-0 border-t border-white/10 bg-white/5 px-3 py-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your project…"
                      rows={1}
                      disabled={isLoading}
                      aria-label="Chat message"
                      aria-describedby="char-count"
                      className={[
                        'w-full resize-none rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                        'bg-surface-elevated border transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
                        'placeholder:text-text-muted text-text-primary',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'max-h-[120px] overflow-y-auto',
                        isOverLimit
                          ? 'border-rose-500/50 focus:ring-rose-500/40'
                          : 'border-border-subtle focus:border-primary-500/40',
                      ].join(' ')}
                      style={{ fieldSizing: 'content' } as React.CSSProperties}
                    />
                  </div>
                  <button
                    onClick={() => void sendMessage(inputValue)}
                    disabled={!canSend}
                    aria-label="Send message"
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-primary-500 text-white hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Character count */}
                <div
                  id="char-count"
                  className={[
                    'mt-1.5 text-right text-[10px] transition-colors',
                    isOverLimit ? 'text-rose-400' : charsRemaining <= 50 ? 'text-amber-400' : 'text-text-muted',
                  ].join(' ')}
                  aria-live="polite"
                >
                  {isOverLimit
                    ? `${Math.abs(charsRemaining)} characters over limit`
                    : `${charsRemaining} characters remaining`}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ProjectChatbot;
