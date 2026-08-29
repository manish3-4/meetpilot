import { useEffect, useState } from 'react'
import api from '../api/client'
import { Meeting } from '../types'

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await api.get('/meetings')
        setMeetings(response.data.data)
      } catch (error) {
        console.error('Failed to fetch meetings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMeetings()
  }, [])

  const filteredMeetings = meetings.filter((meeting) => {
    const meetingDate = new Date(meeting.start)
    const now = new Date()

    if (filter === 'upcoming') return meetingDate >= now
    if (filter === 'past') return meetingDate < now
    return true
  })

  const handleCancel = async (meetingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this meeting?')) {
      return
    }

    try {
      await api.delete(`/meetings/${meetingId}`)
      setMeetings(meetings.filter((m) => m.id !== meetingId))
    } catch (error) {
      console.error('Failed to cancel meeting:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
        <p className="text-gray-600">Manage your scheduled meetings</p>
      </div>

      <div className="flex space-x-4">
        {(['all', 'upcoming', 'past'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No meetings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMeetings.map((meeting) => (
            <div key={meeting.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(meeting.start).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(meeting.start).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(meeting.end).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {meeting.participants.length} participant(s)
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleCancel(meeting.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
