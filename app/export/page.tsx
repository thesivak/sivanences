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
        <p className="mt-1 text-muted-foreground">Záloha a export vašich finančních dat</p>
      </div>

      {/* Year Selection */}
      <Card className="opacity-0 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-base font-medium">Rozsah exportu</CardTitle>
          <CardDescription>Vyberte rok pro export nebo exportujte všechna data</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={exportYear} onValueChange={setExportYear}>
            <SelectTrigger className="w-48">
              <SelectValue>
                {exportYear === 'all' ? 'Všechna data' : `Rok ${exportYear}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechna data</SelectItem>
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
              Pro import do tabulkového procesoru (Excel, Google Sheets)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>CSV export obsahuje:</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Výdaje podle kategorií a měsíců</li>
                  <li>Příjmy podle zdroje a měsíců</li>
                  <li>Spořící cíle a jejich stav</li>
                  <li>Daňové odpočty</li>
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
                    Stáhnout CSV
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
              Kompletní záloha dat ve strojově čitelném formátu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>JSON export obsahuje:</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Všechny kategorie a zdroje příjmů</li>
                  <li>Kompletní historii výdajů a příjmů</li>
                  <li>Spořící cíle s transakcemi</li>
                  <li>Daňové odpočty</li>
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
                    Stáhnout JSON
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
            Záloha databáze
          </CardTitle>
          <CardDescription>
            Informace o přímé záloze databázového souboru
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>
              Databáze aplikace je uložena v souboru <code className="font-mono-numbers bg-muted px-1.5 py-0.5 rounded">prisma/dev.db</code> v adresáři aplikace.
            </p>
            <p>
              Pro kompletní zálohu doporučujeme pravidelně kopírovat tento soubor na externí úložiště.
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
            Generování PDF reportů bude dostupné v budoucí verzi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Plánované typy reportů:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Měsíční souhrn rozpočtu</li>
              <li>Roční přehled s trendy</li>
              <li>Stav spořících cílů</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
