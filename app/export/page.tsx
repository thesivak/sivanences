'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getYearsArray } from '@/lib/format'
import { Download, FileJson, FileSpreadsheet, Database, FileText } from 'lucide-react'

export default function ExportPage() {
  const [exportYear, setExportYear] = useState<string>('all')
  const [exporting, setExporting] = useState<string | null>(null)

  const years = getYearsArray()

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(format)
    try {
      const yearParam = exportYear === 'all' ? '' : `&year=${exportYear}`
      const res = await fetch(`/api/export?format=${format}${yearParam}`)

      if (format === 'csv') {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rozpocet-export-${exportYear}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rozpocet-export-${exportYear}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Export dat</h1>
        <p className="mt-1 text-muted-foreground">Zaloha a export vasich financnich dat</p>
      </div>

      {/* Year Selection */}
      <Card className="opacity-0 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-base font-medium">Rozsah exportu</CardTitle>
          <CardDescription>Vyberte rok pro export nebo exportujte vsechna data</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={exportYear} onValueChange={setExportYear}>
            <SelectTrigger className="w-48">
              <SelectValue>
                {exportYear === 'all' ? 'Vsechna data' : `Rok ${exportYear}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vsechna data</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  Rok {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid grid-cols-2 gap-6">
        {/* CSV Export */}
        <Card className="opacity-0 animate-fade-in stagger-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              CSV Export
            </CardTitle>
            <CardDescription>
              Pro import do tabulkoveho procesoru (Excel, Google Sheets)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>CSV export obsahuje:</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Vydaje podle kategorii a mesicu</li>
                  <li>Prijmy podle zdroje a mesicu</li>
                  <li>Sporici cile a jejich stav</li>
                  <li>Danove odpocty</li>
                </ul>
              </div>
              <Button
                onClick={() => handleExport('csv')}
                disabled={exporting !== null}
                className="w-full"
              >
                {exporting === 'csv' ? (
                  'Exportuji...'
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Stahnout CSV
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* JSON Export */}
        <Card className="opacity-0 animate-fade-in stagger-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FileJson className="h-5 w-5 text-muted-foreground" />
              JSON Export
            </CardTitle>
            <CardDescription>
              Kompletni zaloha dat ve strojove citelnem formatu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>JSON export obsahuje:</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Vsechny kategorie a zdroje prijmu</li>
                  <li>Kompletni historii vydaju a prijmu</li>
                  <li>Sporici cile s transakcemi</li>
                  <li>Danove odpocty</li>
                </ul>
              </div>
              <Button
                onClick={() => handleExport('json')}
                disabled={exporting !== null}
                variant="outline"
                className="w-full"
              >
                {exporting === 'json' ? (
                  'Exportuji...'
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Stahnout JSON
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Backup Info */}
      <Card className="opacity-0 animate-fade-in stagger-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Database className="h-5 w-5 text-muted-foreground" />
            Zaloha databaze
          </CardTitle>
          <CardDescription>
            Informace o prime zaloze databazoveho souboru
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>
              Databaze aplikace je ulozena v souboru <code className="font-mono-numbers bg-muted px-1.5 py-0.5 rounded">prisma/dev.db</code> v adresari aplikace.
            </p>
            <p>
              Pro kompletni zalohu doporucujeme pravidelne kopirovat tento soubor na externi uloziste.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Future: PDF Reports */}
      <Card className="opacity-0 animate-fade-in stagger-5 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
            <FileText className="h-5 w-5" />
            PDF Reporty
          </CardTitle>
          <CardDescription>
            Generovani PDF reportu bude dostupne v budouci verzi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Planovane typy reportu:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Mesicni souhrn rozpoctu</li>
              <li>Rocni prehled s trendy</li>
              <li>Stav sporicich cilu</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
