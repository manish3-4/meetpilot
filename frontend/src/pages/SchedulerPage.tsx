import { useState, useRef, useEffect } from 'react'
import api from '../api/client'
import type { TimeSlot, SchedulingIntent } from '../types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  slots?: TimeSlot[]
  intent?: SchedulingIntent
}

const SUGGESTED_PROMPTS = [
  'Schedule a meeting with Rahul tomorrow',
  'Find a 1-hour slot for the engineering team next week',
  'Schedule a client meeting after lunch',
  'Reschedule my 3 PM meeting',
]

export default function SchedulerPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (messageText?: string) => {
    const text = messageText || input
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.post('/ai/chat', {
        message: text,
        conversationId,
      })

      const { conversationId: convId, slots, explanation, intent } = response.data.data

      if (!conversationId) {
        setConversationId(convId)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: explanation,
        slots,
        intent,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectSlot = async (slot: TimeSlot) => {
    if (!conversationId) return

    try {
      const response = await api.post('/ai/schedule', {
        conversationId,
        selectedSlot: {
          start: slot.start,
          end: slot.end,
        },
      })

      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Meeting scheduled successfully! You can view it in your calendar.`,
      }

      setMessages((prev) => [...prev, confirmMessage])
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Scheduler</h1>
        <p className="text-gray-600">Schedule meetings using natural language</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              What would you like to schedule?
            </h2>
            <p className="text-gray-600 mb-6">
              Tell me about the meeting you want to schedule
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(prompt)}
                  className="p-3 text-left text-sm bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.slots && message.slots.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="font-medium">Available time slots:</p>
                    {message.slots.map((slot, index) => (
                      <div
                        key={index}
                        className="bg-white p-3 rounded-lg border border-gray-200"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {new Date(slot.start).toLocaleDateString([], {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(slot.start).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(slot.end).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Score: {slot.score}/100
                            </div>
                            <ul className="text-xs text-gray-600 mt-1">
                              {slot.reasons.map((reason, i) => (
                                <li key={i}>• {reason}</li>
                              ))}
                            </ul>
                          </div>
                          <button
                            onClick={() => handleSelectSlot(slot)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your meeting..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
