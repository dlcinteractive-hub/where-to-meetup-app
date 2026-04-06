'use client'

import { useEffect, useRef, useState } from 'react'

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
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced fetch — fires 300ms after value changes, min 3 chars
  useEffect(() => {
    if (value.length < 3) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(value)}`)
        if (!res.ok) return
        const data = await res.json()
        const preds: Prediction[] = data.predictions ?? []
        setSuggestions(preds)
        setShowDropdown(preds.length > 0)
        setActiveIndex(-1)
      } catch {
        // silently fail — user can still type and submit manually
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  const handleSelect = (description: string) => {
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
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
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
    </div>
  )
}
