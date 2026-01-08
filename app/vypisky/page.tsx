'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TableSkeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'
import {
  Upload,
  FileText,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Building2,
  Plus,
  CreditCard,
  Wallet,
  PiggyBank,
  Briefcase,
  TrendingUp,
} from 'lucide-react'
import type {
  BankStatementUpload,
  ParsedTransaction,
  UserBankAccount,
  BankAccountType,
  Category,
  IncomeSource,
} from '@/lib/types'

const ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  checking: 'Běžný účet',
  savings: 'Spořicí účet',
  credit_card: 'Kreditní karta',
  business: 'Podnikatelský účet',
  investment: 'Investiční účet',
}

const ACCOUNT_TYPE_ICONS: Record<BankAccountType, typeof Wallet> = {
  checking: Wallet,
  savings: PiggyBank,
  credit_card: CreditCard,
  business: Briefcase,
  investment: TrendingUp,
}

export default function VypiskyPage() {
  // State
  const [uploads, setUploads] = useState<BankStatementUpload[]>([])
  const [accounts, setAccounts] = useState<UserBankAccount[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [selectedUpload, setSelectedUpload] = useState<BankStatementUpload | null>(null)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showApplyConfirm, setShowApplyConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New account form state
  const [newAccount, setNewAccount] = useState({
    name: '',
    accountNumber: '',
    bankCode: '',
    accountType: 'checking' as BankAccountType,
  })

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [uploadsRes, accountsRes, categoriesRes, incomeRes] = await Promise.all([
        fetch('/api/bank-statements'),
        fetch('/api/bank-accounts'),
        fetch('/api/expenses/categories'),
        fetch('/api/income/sources'),
      ])

      if (uploadsRes.ok) setUploads(await uploadsRes.json())
      if (accountsRes.ok) setAccounts(await accountsRes.json())
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || data)
      }
      if (incomeRes.ok) {
        const data = await incomeRes.json()
        setIncomeSources(data.sources || data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/bank-statements', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setSelectedUpload(data)
        fetchData()
      } else {
        const error = await res.json()
        alert(`Chyba: ${error.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Chyba při nahrávání souboru')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle add account
  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.accountNumber) {
      alert('Vyplňte název a číslo účtu')
      return
    }

    try {
      const res = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccount.name,
          accountNumber: newAccount.bankCode
            ? `${newAccount.accountNumber}/${newAccount.bankCode}`
            : newAccount.accountNumber,
          bankCode: newAccount.bankCode || null,
          accountType: newAccount.accountType,
        }),
      })

      if (res.ok) {
        setShowAccountDialog(false)
        setNewAccount({ name: '', accountNumber: '', bankCode: '', accountType: 'checking' })
        fetchData()
      } else {
        const error = await res.json()
        alert(`Chyba: ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding account:', error)
    }
  }

  // Handle delete account
  const handleDeleteAccount = async (id: string) => {
    try {
      await fetch(`/api/bank-accounts?id=${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  // Handle delete upload
  const handleDeleteUpload = async (id: string) => {
    try {
      await fetch(`/api/bank-statements?id=${id}`, { method: 'DELETE' })
      if (selectedUpload?.id === id) {
        setSelectedUpload(null)
      }
      fetchData()
    } catch (error) {
      console.error('Error deleting upload:', error)
    }
  }

  // Handle transaction category change
  const handleTransactionChange = async (
    txId: string,
    field: 'categoryId' | 'incomeSourceId' | 'excluded',
    value: string | boolean
  ) => {
    if (!selectedUpload?.parsedData) return

    const updates = [{
      id: txId,
      [field === 'categoryId' ? 'suggestedCategoryId' : field === 'incomeSourceId' ? 'suggestedIncomeSourceId' : 'excluded']: value,
      ...(field === 'categoryId' && {
        suggestedCategoryName: categories.find(c => c.id === value)?.name,
      }),
      ...(field === 'incomeSourceId' && {
        suggestedIncomeSourceName: incomeSources.find(s => s.id === value)?.name,
      }),
    }]

    try {
      const res = await fetch(`/api/bank-statements/${selectedUpload.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: updates }),
      })

      if (res.ok) {
        const updated = await res.json()
        setSelectedUpload(updated)
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
    }
  }

  // Handle apply transactions
  const handleApplyTransactions = async () => {
    if (!selectedUpload?.parsedData) return

    setApplying(true)
    try {
      // Determine year/month from statement period
      const [monthStr, yearStr] = selectedUpload.statementPeriod.split('/')
      const year = parseInt(yearStr)
      const month = parseInt(monthStr)

      const transactions = selectedUpload.parsedData.transactions.map(tx => ({
        id: tx.id,
        categoryId: tx.suggestedCategoryId || undefined,
        incomeSourceId: tx.suggestedIncomeSourceId || undefined,
        excluded: tx.excluded,
      }))

      const res = await fetch('/api/bank-statements/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: selectedUpload.id,
          year,
          month,
          transactions,
        }),
      })

      if (res.ok) {
        setShowApplyConfirm(false)
        setSelectedUpload(null)
        fetchData()
        alert('Transakce byly úspěšně aplikovány!')
      } else {
        const error = await res.json()
        alert(`Chyba: ${error.error}`)
      }
    } catch (error) {
      console.error('Error applying transactions:', error)
      alert('Chyba při aplikování transakcí')
    } finally {
      setApplying(false)
    }
  }

  // Render transaction row
  const renderTransactionRow = (tx: ParsedTransaction) => {
    const isExpense = tx.amount < 0
    const isIncome = tx.amount > 0

    return (
      <TableRow key={tx.id} className={tx.excluded ? 'opacity-50' : ''}>
        <TableCell className="w-10">
          <input
            type="checkbox"
            checked={!tx.excluded}
            onChange={(e) => handleTransactionChange(tx.id, 'excluded', !e.target.checked)}
            className="h-4 w-4"
          />
        </TableCell>
        <TableCell className="text-sm">{tx.date}</TableCell>
        <TableCell className="max-w-[200px] truncate text-sm" title={tx.description}>
          {tx.description}
          {tx.isInternalTransfer && (
            <Badge variant="outline" className="ml-2 text-xs">
              Interní
            </Badge>
          )}
          {tx.isDuplicate && (
            <Badge variant="destructive" className="ml-2 text-xs">
              Duplikát
            </Badge>
          )}
        </TableCell>
        <TableCell className={`text-right font-mono-numbers ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(tx.amount, false)}
        </TableCell>
        <TableCell>
          {isExpense && (
            <Select
              value={tx.suggestedCategoryId || ''}
              onValueChange={(value) => handleTransactionChange(tx.id, 'categoryId', value)}
              disabled={tx.excluded}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isIncome && (
            <Select
              value={tx.suggestedIncomeSourceId || ''}
              onValueChange={(value) => handleTransactionChange(tx.id, 'incomeSourceId', value)}
              disabled={tx.excluded}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Zdroj příjmu" />
              </SelectTrigger>
              <SelectContent>
                {incomeSources.map(src => (
                  <SelectItem key={src.id} value={src.id}>
                    {src.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </TableCell>
        <TableCell>
          <Badge
            variant={tx.confidence > 0.7 ? 'default' : tx.confidence > 0.4 ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {Math.round(tx.confidence * 100)}%
          </Badge>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Bankovní výpisky</h1>
        <p className="mt-1 text-muted-foreground">
          Nahrajte výpisky z banky a automaticky importujte transakce
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">Import výpisů</TabsTrigger>
          <TabsTrigger value="accounts">Moje účty</TabsTrigger>
          <TabsTrigger value="history">Historie importů</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          {/* Upload Section */}
          <Card className="opacity-0 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Upload className="h-5 w-5 text-muted-foreground" />
                Nahrát výpis
              </CardTitle>
              <CardDescription>
                Nahrajte PDF výpis z banky. Podporované banky: Česká spořitelna, Komerční banka, ČSOB a další.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Nahrávám...' : 'Vybrat PDF soubor'}
                </Button>
                {uploading && (
                  <span className="text-sm text-muted-foreground">
                    Zpracovávám výpis pomocí AI...
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transaction Review */}
          {selectedUpload?.parsedData && (
            <Card className="opacity-0 animate-fade-in stagger-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      {selectedUpload.filename}
                    </CardTitle>
                    <CardDescription>
                      {selectedUpload.bankName} • {selectedUpload.statementPeriod} •{' '}
                      {selectedUpload.parsedData.transactions.length} transakcí
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUpload(null)}
                    >
                      Zrušit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowApplyConfirm(true)}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Aplikovat transakce
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary */}
                <div className="mb-6 grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground">Celkem transakcí</div>
                    <div className="text-xl font-semibold">
                      {selectedUpload.parsedData.summary.totalTransactions}
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <div className="text-sm text-red-600">Výdaje</div>
                    <div className="text-xl font-semibold text-red-700">
                      {formatCurrency(selectedUpload.parsedData.summary.totalExpenses, false)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <div className="text-sm text-green-600">Příjmy</div>
                    <div className="text-xl font-semibold text-green-700">
                      {formatCurrency(selectedUpload.parsedData.summary.totalIncome, false)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-3">
                    <div className="text-sm text-yellow-600">Vyloučeno</div>
                    <div className="text-xl font-semibold text-yellow-700">
                      {selectedUpload.parsedData.summary.excludedCount}
                    </div>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="w-24">Datum</TableHead>
                        <TableHead>Popis</TableHead>
                        <TableHead className="w-28 text-right">Částka</TableHead>
                        <TableHead className="w-40">Kategorie</TableHead>
                        <TableHead className="w-20">Jistota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUpload.parsedData.transactions.map(renderTransactionRow)}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <Card className="opacity-0 animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    Moje bankovní účty
                  </CardTitle>
                  <CardDescription>
                    Přidejte své účty pro automatické rozpoznání interních převodů
                  </CardDescription>
                </div>
                <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Přidat účet
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Přidat bankovní účet</DialogTitle>
                      <DialogDescription>
                        Přidejte svůj účet pro automatické vyloučení interních převodů
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="account-name">Název účtu</Label>
                        <Input
                          id="account-name"
                          placeholder="např. Hlavní účet"
                          value={newAccount.name}
                          onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="account-number">Číslo účtu</Label>
                          <Input
                            id="account-number"
                            placeholder="2647271193"
                            value={newAccount.accountNumber}
                            onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bank-code">Kód banky</Label>
                          <Input
                            id="bank-code"
                            placeholder="0800"
                            value={newAccount.bankCode}
                            onChange={(e) => setNewAccount({ ...newAccount, bankCode: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Typ účtu</Label>
                        <Select
                          value={newAccount.accountType}
                          onValueChange={(value) => setNewAccount({ ...newAccount, accountType: value as BankAccountType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
                        Zrušit
                      </Button>
                      <Button onClick={handleAddAccount}>
                        Přidat účet
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton rows={3} columns={4} />
              ) : accounts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Building2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Zatím nemáte přidané žádné účty</p>
                  <p className="text-sm">
                    Přidejte své účty pro automatické rozpoznání interních převodů
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Název</TableHead>
                      <TableHead>Číslo účtu</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => {
                      const Icon = ACCOUNT_TYPE_ICONS[account.accountType]
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell className="font-mono-numbers">{account.accountNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {ACCOUNT_TYPE_LABELS[account.accountType]}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteAccount(account.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="opacity-0 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Historie importů
              </CardTitle>
              <CardDescription>
                Přehled všech nahraných výpisů
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : uploads.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Zatím nemáte žádné nahrané výpisky</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Soubor</TableHead>
                      <TableHead>Banka</TableHead>
                      <TableHead>Období</TableHead>
                      <TableHead>Transakcí</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploads.map((upload) => (
                      <TableRow key={upload.id}>
                        <TableCell className="font-medium">{upload.filename}</TableCell>
                        <TableCell>{upload.bankName || '-'}</TableCell>
                        <TableCell>{upload.statementPeriod}</TableCell>
                        <TableCell>{upload.transactionCount || 0}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              upload.status === 'applied'
                                ? 'default'
                                : upload.status === 'reviewed'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {upload.status === 'applied'
                              ? 'Aplikováno'
                              : upload.status === 'reviewed'
                              ? 'Zkontrolováno'
                              : 'Čeká na zpracování'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {upload.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedUpload(upload)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteUpload(upload.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Apply Confirmation Dialog */}
      <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Potvrdit import transakcí
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce nahradí všechny existující výdaje a příjmy za období{' '}
              <strong>{selectedUpload?.statementPeriod}</strong> importovanými daty.
              <br /><br />
              <strong>Shrnutí importu:</strong>
              <ul className="mt-2 list-disc list-inside">
                <li>Výdaje: {formatCurrency(selectedUpload?.parsedData?.summary.totalExpenses || 0, false)}</li>
                <li>Příjmy: {formatCurrency(selectedUpload?.parsedData?.summary.totalIncome || 0, false)}</li>
                <li>Vyloučeno: {selectedUpload?.parsedData?.summary.excludedCount || 0} transakcí</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyTransactions} disabled={applying}>
              {applying ? 'Aplikuji...' : 'Aplikovat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
