import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getStoredTheme, getEffectiveTheme, saveTheme, applyTheme } from '@/lib/theme'

beforeEach(() => {
  localStorage.clear()
  // Reset html class
  document.documentElement.className = ''
})

describe('theme', () => {
  it('getStoredTheme returns null when nothing stored', () => {
    expect(getStoredTheme()).toBeNull()
  })

  it('saveTheme persists to localStorage', () => {
    saveTheme('light')
    expect(localStorage.getItem('linforo-theme')).toBe('light')
  })

  it('getStoredTheme returns stored value', () => {
    saveTheme('dark')
    expect(getStoredTheme()).toBe('dark')
  })

  it('getStoredTheme returns saved light', () => {
    saveTheme('light')
    expect(getStoredTheme()).toBe('light')
  })

  it('applyTheme adds light-theme class', () => {
    applyTheme('light')
    expect(document.documentElement.classList.contains('light-theme')).toBe(true)
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false)
  })

  it('applyTheme adds dark-theme class', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true)
    expect(document.documentElement.classList.contains('light-theme')).toBe(false)
  })

  it('applyTheme switches from light to dark', () => {
    applyTheme('light')
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true)
    expect(document.documentElement.classList.contains('light-theme')).toBe(false)
  })

  it('getEffectiveTheme returns stored theme when set', () => {
    saveTheme('light')
    expect(getEffectiveTheme()).toBe('light')
  })
})
