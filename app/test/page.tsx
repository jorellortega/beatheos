'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, AlertCircle, Database, Wifi, Clock } from 'lucide-react'

interface TestResult {
  table: string
  status: 'success' | 'error' | 'warning'
  message: string
  data?: any
  error?: string
  responseTime?: number
}

export default function TestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')
  const [supabaseUrl, setSupabaseUrl] = useState<string>('')
  const [supabaseKey, setSupabaseKey] = useState<string>('')



  // Test basic connection
  const testConnection = async (): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1)
      const responseTime = Date.now() - startTime
      
      if (error) {
        return {
          table: 'Connection Test',
          status: 'error',
          message: 'Failed to connect to Supabase',
          error: error.message,
          responseTime
        }
      }
      
      return {
        table: 'Connection Test',
        status: 'success',
        message: 'Successfully connected to Supabase',
        data: data,
        responseTime
      }
    } catch (err: any) {
      return {
        table: 'Connection Test',
        status: 'error',
        message: 'Connection failed',
        error: err.message,
        responseTime: Date.now() - startTime
      }
    }
  }

  // Test all tables
  const testTables = async (): Promise<TestResult[]> => {
    const tables = [
      'users',
      'beats',
      'saved_patterns',
      'pattern_packs',
      'pattern_subfolders',
      'audio_library',
      'genres',
      'subgenres',
      'beat_sessions',
      'song_arrangements',
      'user_settings',
      'playlists',
      'beat_playlists',
      'beat_licenses',
      'beat_ratings',
      'posts',
      'audio_packs',
      'sessions',
      'studios',
      'collaborations',
      'reviews',
      'fans',
      'storage_files',
      'products',
      'orders',
      'promotions'
    ]

    const results: TestResult[] = []
    
    for (const table of tables) {
      const startTime = Date.now()
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(1)
        
        const responseTime = Date.now() - startTime
        
        if (error) {
          results.push({
            table,
            status: 'error',
            message: `Error accessing ${table}`,
            error: error.message,
            responseTime
          })
        } else {
          results.push({
            table,
            status: 'success',
            message: `Successfully accessed ${table} (${count || 0} records)`,
            data: { count, sample: data?.[0] },
            responseTime
          })
        }
      } catch (err: any) {
        results.push({
          table,
          status: 'error',
          message: `Exception accessing ${table}`,
          error: err.message,
          responseTime: Date.now() - startTime
        })
      }
    }
    
    return results
  }

  // Test storage buckets
  const testStorage = async (): Promise<TestResult[]> => {
    const buckets = ['beats', 'artist-profiles', 'audio-library']
    const results: TestResult[] = []
    
    for (const bucket of buckets) {
      const startTime = Date.now()
      try {
        const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1 })
        const responseTime = Date.now() - startTime
        
        if (error) {
          results.push({
            table: `Storage: ${bucket}`,
            status: 'error',
            message: `Error accessing storage bucket: ${bucket}`,
            error: error.message,
            responseTime
          })
        } else {
          results.push({
            table: `Storage: ${bucket}`,
            status: 'success',
            message: `Successfully accessed storage bucket: ${bucket}`,
            data: { fileCount: data?.length || 0 },
            responseTime
          })
        }
      } catch (err: any) {
        results.push({
          table: `Storage: ${bucket}`,
          status: 'error',
          message: `Exception accessing storage bucket: ${bucket}`,
          error: err.message,
          responseTime: Date.now() - startTime
        })
      }
    }
    
    return results
  }

  // Test RPC functions
  const testRPC = async (): Promise<TestResult[]> => {
    const results: TestResult[] = []
    
    // Test if any custom functions exist
    const startTime = Date.now()
    try {
      // This is a simple test - you might have custom RPC functions
      const { data, error } = await supabase.rpc('version')
      const responseTime = Date.now() - startTime
      
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        results.push({
          table: 'RPC Functions',
          status: 'warning',
          message: 'No custom RPC functions found (this is normal)',
          responseTime
        })
      } else if (error) {
        results.push({
          table: 'RPC Functions',
          status: 'error',
          message: 'Error testing RPC functions',
          error: error.message,
          responseTime
        })
      } else {
        results.push({
          table: 'RPC Functions',
          status: 'success',
          message: 'RPC functions working',
          data,
          responseTime
        })
      }
    } catch (err: any) {
      results.push({
        table: 'RPC Functions',
        status: 'error',
        message: 'Exception testing RPC functions',
        error: err.message,
        responseTime: Date.now() - startTime
      })
    }
    
    return results
  }

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])
    
    const allResults: TestResult[] = []
    
    // Test connection first
    console.log('Testing connection...')
    const connectionResult = await testConnection()
    allResults.push(connectionResult)
    
    if (connectionResult.status === 'success') {
      setConnectionStatus('connected')
      
      // Test tables
      console.log('Testing tables...')
      const tableResults = await testTables()
      allResults.push(...tableResults)
      
      // Test storage
      console.log('Testing storage...')
      const storageResults = await testStorage()
      allResults.push(...storageResults)
      
      // Test RPC
      console.log('Testing RPC...')
      const rpcResults = await testRPC()
      allResults.push(...rpcResults)
    } else {
      setConnectionStatus('disconnected')
    }
    
    setTestResults(allResults)
    setIsRunning(false)
  }

  // Get environment variables
  useEffect(() => {
    setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set')
    setSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
      `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
      'Not set'
    )
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-900 text-green-300">Success</Badge>
      case 'error':
        return <Badge className="bg-red-900 text-red-300">Error</Badge>
      case 'warning':
        return <Badge className="bg-yellow-900 text-yellow-300">Warning</Badge>
      default:
        return <Badge className="bg-gray-900 text-gray-300">Unknown</Badge>
    }
  }

  const successCount = testResults.filter(r => r.status === 'success').length
  const errorCount = testResults.filter(r => r.status === 'error').length
  const warningCount = testResults.filter(r => r.status === 'warning').length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-white">Supabase Database Test</h1>
      </div>

      {/* Environment Info */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Environment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Supabase URL:</span>
            <code className="text-green-400 bg-gray-900 px-2 py-1 rounded text-sm">
              {supabaseUrl}
            </code>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Supabase Key:</span>
            <code className="text-green-400 bg-gray-900 px-2 py-1 rounded text-sm">
              {supabaseKey}
            </code>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Connection Status:</span>
            <Badge className={
              connectionStatus === 'connected' ? 'bg-green-900 text-green-300' :
              connectionStatus === 'disconnected' ? 'bg-red-900 text-red-300' :
              'bg-gray-900 text-gray-300'
            }>
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'disconnected' ? 'Disconnected' : 'Unknown'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Test Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isRunning ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-400">{successCount} Success</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-400">{errorCount} Errors</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <span className="text-yellow-400">{warningCount} Warnings</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Test Results */}
      {testResults.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Detailed Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="text-white font-medium">{result.table}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result.status)}
                      {result.responseTime && (
                        <span className="text-gray-400 text-sm">
                          {result.responseTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-300 mb-2">{result.message}</p>
                  {result.error && (
                    <div className="bg-red-900/20 border border-red-700 rounded p-2">
                      <p className="text-red-400 text-sm font-mono">{result.error}</p>
                    </div>
                  )}
                  {result.data && (
                    <div className="bg-gray-900/50 border border-gray-600 rounded p-2">
                      <pre className="text-green-400 text-sm overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting Tips */}
      {errorCount > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Troubleshooting Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-gray-300">If you're seeing connection errors:</p>
            <ul className="text-gray-400 text-sm space-y-1 ml-4">
              <li>• Check your Supabase project is active and not paused</li>
              <li>• Verify your environment variables are correct</li>
              <li>• Ensure your IP is not blocked by Supabase</li>
              <li>• Check if you've hit any rate limits</li>
              <li>• Verify your database schema matches the expected tables</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 