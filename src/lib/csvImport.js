/** Import of an Axio (formerly Walnut) "EXPENSE REPORT" CSV export.
 *  Pure functions only — no Firestore, no DOM — so the mapping can be tested
 *  against a real file. */

/** Rows whose category means "money moved between my own accounts". These are
 *  not income or expense; counting them would inflate both sides, so they are
 *  dropped and reported in the summary. */
const TRANSFER_CATEGORIES = new Set(['TRANSFER', 'ACCOUNT TRANSFER', 'SPLIT'])

/** Axio writes `'-` where a field is empty, and prefixes some values with `'`
 *  to stop spreadsheets reformatting them. */
const clean = (v) => {
  const s = String(v ?? '').trim().replace(/^'/, '')
  return s === '-' ? '' : s
}

/** Source CATEGORY -> this app's category key. Anything unmapped becomes a new
 *  category created at import time. An empty string means "leave
 *  uncategorised", which is what Axio's UNKNOWN/CREDIT/OTHER placeholders mean. */
const CATEGORY_MAP = {
  'FOOD & DRINKS': 'food',
  GROCERIES: 'groceries',
  FUEL: 'fuel',
  TRAVEL: 'travel',
  BILLS: 'bills',
  SHOPPING: 'shopping',
  FASHION: 'fashion',
  ENTERTAINMENT: 'entertainment',
  HEALTH: 'health',
  INVESTMENT: 'investment',
  IGNOU: 'education',
  ASSET: 'investment',
  SALARY: 'salary',
  INTEREST: 'interest',
  REFUND: 'refund',
  UNKNOWN: '',
  CREDIT: '',
  OTHER: '',
}

/** A minimal RFC-4180 reader: quoted fields, escaped quotes, CR/LF endings. */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const src = String(text).replace(/^﻿/, '')

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (quoted) {
      if (ch !== '"') {
        field += ch
      } else if (src[i + 1] === '"') {
        field += '"'
        i += 1
      } else {
        quoted = false
      }
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch !== '\r') field += ch
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Axio puts five metadata lines above the real header, so the header is found
 *  by content rather than by a fixed offset. */
function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 40); i += 1) {
    const cells = rows[i].map((c) => clean(c).toUpperCase())
    if (cells.includes('DATE') && cells.includes('AMOUNT')) {
      return { index: i, header: cells }
    }
  }
  return null
}

/** "01:56 PM" -> {h, m} in 24h. Returns null when unparseable. */
function parseTime(value) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(clean(value))
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2])
  const ampm = m[3]?.toUpperCase()
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return { h, m: min }
}

/** Stable id from the fields that identify a transaction, so re-importing the
 *  same file updates rows in place instead of duplicating them. Plain FNV-1a —
 *  this needs determinism, not cryptographic strength. */
export function rowId(parts) {
  let hash = 0x811c9dc5
  const s = parts.join('|')
  for (let i = 0; i < s.length; i += 1) {
    hash ^= s.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `csv-${hash.toString(16).padStart(8, '0')}-${s.length.toString(36)}`
}

/**
 * Turns raw CSV text into records ready for Firestore, plus a summary to show
 * the user before anything is written.
 *
 * @returns {{ records: Array, summary: object, newCategories: Array }}
 */
export function parseAxioCsv(text, { knownCategoryKeys = [] } = {}) {
  const rows = parseCsv(text)
  const found = findHeader(rows)
  if (!found) {
    throw new Error(
      'Could not find a header row with DATE and AMOUNT columns — is this an Axio expense report CSV?',
    )
  }
  const { index, header } = found
  const at = (row, name) => {
    const i = header.indexOf(name)
    return i === -1 ? '' : clean(row[i])
  }

  const records = []
  const known = new Set(knownCategoryKeys)
  const created = new Map()
  // Two genuinely separate transactions can share date, time, amount, place and
  // account — two identical payments a minute apart, say. Counting occurrences
  // keeps them as distinct records while the id stays a pure function of the
  // file, so a re-import still updates in place rather than duplicating.
  const seen = new Map()
  const summary = {
    totalRows: 0,
    imported: 0,
    income: 0,
    expense: 0,
    skippedTransfers: 0,
    skippedInvalid: 0,
    uncategorised: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    firstDate: null,
    lastDate: null,
    invalidExamples: [],
    duplicateRows: 0,
  }

  for (const row of rows.slice(index + 1)) {
    if (!row.some((c) => clean(c))) continue
    summary.totalRows += 1

    const rawCategory = at(row, 'CATEGORY').toUpperCase()
    if (TRANSFER_CATEGORIES.has(rawCategory)) {
      summary.skippedTransfers += 1
      continue
    }

    const dateStr = at(row, 'DATE')
    const amountStr = at(row, 'AMOUNT').replace(/,/g, '')
    const drcr = at(row, 'DR/CR').toUpperCase()
    const amount = Number.parseFloat(amountStr)

    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    if (!dateOk || !Number.isFinite(amount) || amount <= 0 || (drcr !== 'DR' && drcr !== 'CR')) {
      summary.skippedInvalid += 1
      if (summary.invalidExamples.length < 5) {
        summary.invalidExamples.push(
          `${dateStr || '(no date)'} / ${amountStr || '(no amount)'} / ${drcr || '(no DR/CR)'}`,
        )
      }
      continue
    }

    const type = drcr === 'CR' ? 'income' : 'expense'

    // Category: mapped, else a new category derived from the source name.
    let categoryKey = CATEGORY_MAP[rawCategory]
    if (categoryKey === undefined && rawCategory) {
      categoryKey = rawCategory
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30)
      if (categoryKey && !known.has(categoryKey) && !created.has(categoryKey)) {
        created.set(categoryKey, {
          key: categoryKey,
          label: titleCase(rawCategory),
          type,
          imported: true,
        })
      }
    }
    if (!categoryKey) {
      categoryKey = type === 'income' ? 'other-income' : 'other'
      summary.uncategorised += 1
    }

    // Time and account are folded into the note rather than adding fields.
    const [y, mo, d] = dateStr.split('-').map(Number)
    const t = parseTime(at(row, 'TIME'))
    const date = new Date(y, mo - 1, d, t ? t.h : 12, t ? t.m : 0)

    const note = [at(row, 'NOTE'), at(row, 'PLACE'), at(row, 'ACCOUNT'), at(row, 'TIME')]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 500)

    const idParts = [dateStr, at(row, 'TIME'), amountStr, drcr, at(row, 'PLACE'), at(row, 'ACCOUNT')]
    const baseId = rowId(idParts)
    const occurrence = (seen.get(baseId) ?? 0) + 1
    seen.set(baseId, occurrence)

    records.push({
      id: occurrence === 1 ? baseId : `${baseId}-${occurrence}`,
      amount: Math.round(amount * 100) / 100,
      type,
      category: categoryKey,
      note,
      date,
    })

    if (occurrence > 1) summary.duplicateRows += 1
    summary.imported += 1
    if (type === 'income') {
      summary.income += 1
      summary.incomeTotal += amount
    } else {
      summary.expense += 1
      summary.expenseTotal += amount
    }
    if (!summary.firstDate || dateStr < summary.firstDate) summary.firstDate = dateStr
    if (!summary.lastDate || dateStr > summary.lastDate) summary.lastDate = dateStr
  }

  summary.incomeTotal = Math.round(summary.incomeTotal * 100) / 100
  summary.expenseTotal = Math.round(summary.expenseTotal * 100) / 100

  summary.uniqueRecords = new Set(records.map((r) => r.id)).size

  return { records, summary, newCategories: [...created.values()] }
}

const titleCase = (s) =>
  s.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase()).replace(/\s+/g, ' ').trim()
