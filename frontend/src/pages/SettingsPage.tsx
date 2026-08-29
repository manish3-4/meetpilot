import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { CalendarAccount, AvailabilityPreference } from '../types'

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SettingsPage() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC')
  const [accounts, setAccounts] = useState<CalendarAccount[]>([])
  const [preferences, setPreferences] = useState<AvailabilityPreference[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, prefsRes] = await Promise.all([
          api.get('/calendar/accounts'),
          api.get('/users/me/preferences'),
        ])
        setAccounts(accountsRes.data.data)
        setPreferences(prefsRes.data.data)
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      }
    }

    fetchData()
  }, [])

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setMessage('')

    try {
      await api.patch('/users/me', { name, timezone })
      setMessage('Profile updated successfully')
    } catch (error) {
      setMessage('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConnectCalendar = async () => {
    try {
      const response = await api.get('/calendar/connect')
      window.location.href = response.data.data.url
    } catch (error) {
      console.error('Failed to connect calendar:', error)
    }
  }

  const handleDisconnectCalendar = async (accountId: string) => {
    if (!window.confirm('Are you sure you want to disconnect this calendar?')) {
      return
    }

    try {
      await api.delete(`/calendar/accounts/${accountId}`)
      setAccounts(accounts.filter((a) => a.id !== accountId))
    } catch (error) {
      console.error('Failed to disconnect calendar:', error)
    }
  }

  const handleUpdatePreference = async (dayOfWeek: number, data: Partial<AvailabilityPreference>) => {
    try {
      const response = await api.patch(`/users/me/preferences/${dayOfWeek}`, data)
      setPreferences(
        preferences.map((p) => (p.dayOfWeek === dayOfWeek ? response.data.data : p))
      )
    } catch (error) {
      console.error('Failed to update preference:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={user?.email}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Asia/Kolkata">India</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>

          {message && (
            <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar</h2>

        {accounts.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">No calendars connected</p>
            <button
              onClick={handleConnectCalendar}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Connect Google Calendar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{account.calendarName}</div>
                  <div className="text-sm text-gray-600">{account.provider}</div>
                </div>
                <button
                  onClick={() => handleDisconnectCalendar(account.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Working Hours */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Working Hours</h2>

        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day, index) => {
            const pref = preferences.find((p) => p.dayOfWeek === index)
            return (
              <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-24 font-medium">{day}</div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pref?.isAvailable ?? (index > 0 && index < 6)}
                    onChange={(e) =>
                      handleUpdatePreference(index, { isAvailable: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Available</span>
                </label>
                {pref?.isAvailable && (
                  <>
                    <input
                      type="time"
                      value={pref?.startTime || '09:00'}
                      onChange={(e) => handleUpdatePreference(index, { startTime: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-gray-600">to</span>
                    <input
                      type="time"
                      value={pref?.endTime || '17:00'}
                      onChange={(e) => handleUpdatePreference(index, { endTime: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
