'use client'

import { useEffect, useRef, useState } from 'react'

const LA_LAT = 34.0522
const LA_LNG = -118.2437

interface Prediction {
  description: string
  place_id: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
}

interface DropdownPos {
  top: number
  left: number
  width: number
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  required,
}: Props) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [dropdownPos, setDropdownPos] = useState<DropdownPos>({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const coordsRef = useRef<{ lat: number; lng: number }>({ lat: LA_LAT, lng: LA_LNG })
  const justSelectedRef = useRef(false)

  // Attempt geolocation on mount — fall back to LA if denied or unavailable
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      },
      () => {} // denied or unavailable — keep LA default
    )
  }, [])

  const calcPos = () => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }

  // Debounced fetch — fires 300ms after value changes, min 3 chars
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }
    if (value.length < 3) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const { lat, lng } = coordsRef.current
        const res = await fetch(
          `/api/autocomplete?q=${encodeURIComponent(value)}&lat=${lat}&lng=${lng}`
        )
        if (!res.ok) return
        const data = await res.json()
        const preds: Prediction[] = data.predictions ?? []
        setSuggestions(preds)
        if (preds.length > 0) {
          calcPos()
          setShowDropdown(true)
        }
        setActiveIndex(-1)
      } catch {
        // silently fail — user can still type and submit manually
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  const handleSelect = (description: string) => {
    justSelectedRef.current = true
    onChange(description)
    setSuggestions([])
    setShowDropdown(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIndex].description)
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIndex(-1)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) { calcPos(); setShowDropdown(true) }
        }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && (
        <ul
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.place_id}
              onMouseDown={() => handleSelect(s.description)}
              className={`px-4 py-2.5 text-sm cursor-pointer ${
                i === activeIndex
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
