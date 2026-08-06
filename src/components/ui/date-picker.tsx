"use client"

import * as React from "react"
import { CalendarIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function parseDateValue(value?: string | null) {
  if (!value) return undefined

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function formatDateValue(date?: Date) {
  if (!date) return ""

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatDisplayDate(date?: Date) {
  if (!date) return ""

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

type DatePickerProps = {
  "aria-describedby"?: string
  "aria-invalid"?: React.AriaAttributes["aria-invalid"]
  className?: string
  defaultValue?: string
  disabled?: boolean
  id?: string
  name: string
  placeholder?: string
  required?: boolean
}

function DatePicker({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  defaultValue,
  disabled,
  id,
  name,
  placeholder = "Pick a date",
  required,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState(() => parseDateValue(defaultValue))
  const value = formatDateValue(date)

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <input name={name} required={required} type="hidden" value={value} />
      <PopoverTrigger
        disabled={disabled}
        id={id}
        render={
          <Button
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            className={cn(
              "w-full justify-between bg-background text-left font-normal",
              !date && "text-muted-foreground",
              className,
            )}
            type="button"
            variant="outline"
          />
        }
      >
        <span>{date ? formatDisplayDate(date) : placeholder}</span>
        <CalendarIcon aria-hidden="true" className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          captionLayout="dropdown"
          mode="single"
          onSelect={(selectedDate) => {
            setDate(selectedDate)
            setOpen(false)
          }}
          selected={date}
        />
        {date ? (
          <div className="border-t p-2">
            <Button
              className="w-full justify-start"
              onClick={() => {
                setDate(undefined)
                setOpen(false)
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <XIcon data-icon="inline-start" />
              Clear date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
