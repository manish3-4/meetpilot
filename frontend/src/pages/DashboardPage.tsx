import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Meeting } from '../types'

export default function DashboardPage() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const today = new Date()
        const nextWeek = new Date(today)
        nextWeek.setDate(today.getDate() + 7)

        const response = await api.get('/meetings', {
          params: {
            start: today.toISOString(),
            end: nextWeek.toISOString(),
          },
        })
        setMeetings(response.data.data)
      } catch (error) {
        console.error('Failed to fetch meetings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMeetings()
  }, [])

  const todayMeetings = meetings.filter((m) => {
    const meetingDate = new Date(m.start)
    const today = new Date()
    return meetingDate.toDateString() === today.toDateString()
  })

  const upcomingMeetings = meetings.filter((m) => {
    const meetingDate = new Date(m.start)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return meetingDate > today
  }).slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name}
        </h1>
        <p className="text-gray-600">Here's what's on your schedule today.</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/scheduler"
          className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <h3 className="font-semibold text-lg">AI Scheduler</h3>
          <p className="text-blue-100 text-sm mt-1">Schedule with natural language</p>
        </Link>

        <Link
          to="/calendar"
          className="bg-white border border-gray-200 p-6 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-semibold text-lg text-gray-900">Calendar</h3>
          <p className="text-gray-600 text-sm mt-1">View your schedule</p>
        </Link>

        <Link
          to="/meetings"
          className="bg-white border border-gray-200 p-6 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-semibold text-lg text-gray-900">Meetings</h3>
          <p className="text-gray-600 text-sm mt-1">Manage your meetings</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Meetings */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Today's Meetings</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            ) : todayMeetings.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No meetings scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {todayMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{meeting.title}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(meeting.start).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(meeting.end).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Upcoming Meetings</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            ) : upcomingMeetings.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No upcoming meetings</p>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{meeting.title}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(meeting.start).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(meeting.start).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
