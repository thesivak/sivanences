# Rodinný rozpočet - Specifikace aplikace

## Přehled

Webová aplikace pro správu rodinného rozpočtu v českém jazyce. Primární cíl: pomoci otci rodiny činit kvalifikovaná finanční rozhodnutí, zejména ohledně půjček (auto, rekonstrukce domu, apod.).

## Klíčové charakteristiky

- **Jazyk**: Čeština
- **Měna**: CZK (formátování: 1 234,56 Kč)
- **Model dat**: Měsíční součty podle kategorií (NE jednotlivé transakce)
- **Primární zařízení**: Desktop prohlížeč
- **Vizuální styl**: Minimalistický, čísla a přehledy, málo grafů

---

## Technický stack

- **Framework**: Next.js 16
- **UI komponenty**: shadcn/ui
- **Databáze**: SQLite
- **ORM**: Prisma
- **Vizualizace**: Recharts (pro grafy v analýze půjček)

---

## Datový model

### Výdaje
- Sledování **měsíčních součtů** podle kategorií
- Jedna hodnota na kategorii na měsíc
- 10-20 kategorií (plochý seznam, bez hierarchie)
- Příklady kategorií: Potraviny, Bydlení, Energie, Doprava, Oblečení, Zdraví, Vzdělávání, Zábava, Ostatní

### Příjmy
- Sledování podle **zdroje příjmu** měsíčně
- Zdroje: Mzda, Bonusy, Ostatní (uživatel může přidávat vlastní)

### Daňově uznatelné položky
- Úroky z hypotéky
- Penzijní připojištění
- Životní pojištění
- Dary (charita)

### Spořící cíle (Fondy)
- Více virtuálních fondů/kbelíků
- Manuální alokace prostředků
- Doporučení 3měsíčního nouzového fondu

### Historie
- Plná historie navždy (žádné mazání)
- Historie plně editovatelná

---

## Hlavní funkce

### 1. Přehled (Dashboard)
- Minimalistické zobrazení klíčových čísel
- Aktuální měsíc: příjmy, výdaje, bilance
- Stav spořících fondů
- Porovnání s předchozími měsíci

### 2. Správa výdajů
- **Quick entry**: Rychlé zadání ve formátu `kategorie částka`
  - Příklad: `potraviny 15000`
  - Nastaví hodnotu pro aktuální měsíc (nahrazuje, nepřičítá)
  - Při nejednoznačné kategorii: zobrazit návrh + potvrzení
- Tabulkový přehled měsíce s editací
- Výběr měsíce pro zobrazení/editaci

### 3. Správa příjmů
- Zadání příjmů podle zdroje
- Měsíční přehled příjmů

### 4. Spořící cíle
- Vytváření a správa fondů (např. Nouzový fond, Dovolená, Auto)
- Manuální přidávání/odebírání prostředků
- Progress bar s cílovou částkou
- Doporučení: Nouzový fond = 3× měsíční výdaje

### 5. Analýza půjček (Loan Calculator)

Hlavní rozhodovací nástroj aplikace.

#### Vstupy:
- Výše půjčky
- Úroková sazba (presety českých sazeb + vlastní)
- Doba splácení
- Typ půjčky (hypotéka, spotřebitelský úvěr)

#### Výstupy:
- **Jednoduchý verdikt**: "Dostupné" / "Rizikové" / "Nedoporučeno" s krátkým zdůvodněním
- **Detailní rozpis**: Měsíční splátka, celková zaplacená částka, úroky celkem, dopad na rozpočet
- **Vizuální časová osa**: Graf ukazující vývoj rozpočtu po dobu trvání půjčky
- **Porovnání scénářů**: Vedle sebe: s půjčkou vs. bez půjčky

#### Stress testing:
- **Pokles příjmů**: Modelování při -10%, -20%, -30% příjmu
- **Inflace výdajů**: Fixní roční nárůst (3-5%)

#### České sazby (presety):
- Hypotéka: aktuální průměrné sazby
- Spotřebitelský úvěr: typické sazby
- Uživatel může zadat vlastní sazbu

### 6. Daňový přehled
- Roční souhrn daňově uznatelných položek
- Export pro daňové přiznání

### 7. Export a reporty

#### PDF reporty:
- Měsíční souhrn: příjmy, výdaje podle kategorií, úspory, bilance
- Roční přehled: 12měsíční trendy, roční součty, meziroční porovnání
- Stav cílů: aktuální stav fondů s projekcemi

#### CSV export:
- Kompletní export dat pro analýzu v tabulkovém procesoru

### 8. Záloha dat
- Manuální export (CSV + SQLite soubor)
- Žádná automatická synchronizace do cloudu

---

## Uživatelské rozhraní

### Navigace
- Bude určena během implementace (tab-based nebo sidebar)
- Hlavní sekce: Přehled, Výdaje, Příjmy, Cíle, Půjčky, Export

### Design principy
- **Jednoduchost je prioritou** (hlavní obava uživatele je komplexita)
- Minimalistické zobrazení čísel
- Čisté tabulky, klíčové metriky prominent
- Minimum grafů (grafy hlavně v analýze půjček)
- Developer-friendly: detailní chybové hlášky, možnost vidět SQL dotazy

### Lokalizace
- Veškeré texty v češtině
- České formátování čísel: 1 234,56
- České formátování měny: 1 234 Kč
- České formátování datumů: 15. 1. 2024

---

## Inicializace dat

- Databáze bude předvyplněna seed daty z `data/seed_data.json`
- Seed data budou zadána manuálně (bez OCR parsování PNG)
- Zdrojová data jsou v `data/` složce (PNG screenshoty Google Sheets)

---

## Co aplikace NEOBSAHUJE

- ❌ AI integrace / OpenAI
- ❌ Denní tracking jednotlivých transakcí
- ❌ Šablony opakujících se výdajů
- ❌ Detekce anomálií
- ❌ Notifikace a upozornění
- ❌ Gamifikace (odznaky, série, body)
- ❌ Sociální funkce (sdílení, porovnávání)
- ❌ Sledování investic
- ❌ Mobilní optimalizace (pouze desktop)
- ❌ Multi-user / přihlašování
- ❌ Cloud synchronizace

---

## Bezpečnost

- Pouze lokální data (SQLite soubor na disku)
- Žádné šifrování databáze
- Žádné přihlašování (single shared view)

---

## Budoucí rozšíření (mimo scope)

Následující funkce nejsou součástí aktuální specifikace, ale mohou být přidány později:
- Import bankovních výpisů (znalost českých formátů)
- Mobilní responzivní verze
- Pokročilé reporty

---

## Shrnutí rozhodnutí z interview

| Oblast | Rozhodnutí |
|--------|-----------|
| Datový model | Měsíční součty, ne transakce |
| Příjmy | Podle zdroje (Mzda, Bonusy, Ostatní) |
| Kategorie | Plochý seznam, 10-20 položek |
| Šablony | Odstraněny |
| AI | Odstraněno |
| Quick entry | `kategorie částka`, nahrazuje hodnotu |
| Stress testing | Fixní % pokles příjmů, fixní inflace |
| Úrokové sazby | České presety |
| Historie | Navždy, plně editovatelná |
| Export | PDF + CSV, manuální |
| Notifikace | Žádné |
| Hlavní obava | Komplexita - udržet jednoduché |
