"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type NativeSelectProps = {
  "aria-describedby"?: string
  "aria-invalid"?: React.AriaAttributes["aria-invalid"]
  "aria-label"?: string
  children?: React.ReactNode
  className?: string
  defaultValue?: string | number
  disabled?: boolean
  form?: string
  id?: string
  name?: string
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
  required?: boolean
  size?: "sm" | "default"
  value?: string | number
}

type NativeSelectOptionProps = {
  children?: React.ReactNode
  className?: string
  disabled?: boolean
  label?: string
  value?: string | number
}

type NativeSelectOptGroupProps = {
  children?: React.ReactNode
  className?: string
  label?: React.ReactNode
}

function getTextContent(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getTextContent).join("")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getTextContent(node.props.children)
  }
  return ""
}

function getOptionItems(children: React.ReactNode) {
  const items: { label: React.ReactNode; value: string }[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return

    if (child.type === NativeSelectOptGroup) {
      React.Children.forEach(
        (child.props as NativeSelectOptGroupProps).children,
        (groupChild) => {
          if (!React.isValidElement(groupChild) || groupChild.type !== NativeSelectOption) return

          const props = groupChild.props as NativeSelectOptionProps
          items.push({
            label: props.children,
            value: String(props.value ?? ""),
          })
        },
      )
      return
    }

    if (child.type !== NativeSelectOption) return

    const props = child.props as NativeSelectOptionProps
    items.push({
      label: props.children,
      value: String(props.value ?? ""),
    })
  })

  return items
}

function NativeSelect({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  className,
  children,
  defaultValue,
  disabled,
  form,
  id,
  name,
  onChange,
  required,
  size = "default",
  value,
}: NativeSelectProps) {
  const options = React.useMemo(() => getOptionItems(children), [children])
  const placeholder = options.find((option) => option.value === "")?.label

  function handleValueChange(nextValue: string | null) {
    onChange?.({
      currentTarget: { value: nextValue ?? "" },
      target: { value: nextValue ?? "" },
    } as React.ChangeEvent<HTMLSelectElement>)
  }

  return (
    <Select
      defaultValue={defaultValue === undefined ? undefined : String(defaultValue)}
      disabled={disabled}
      form={form}
      id={id}
      items={options}
      name={name}
      onValueChange={handleValueChange}
      required={required}
      value={value === undefined ? undefined : String(value)}
    >
      <SelectTrigger
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        className={cn("w-fit", className)}
        data-size={size}
        data-slot="native-select"
        size={size}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} side="bottom" sideOffset={4}>
        {children}
      </SelectContent>
    </Select>
  )
}

function NativeSelectOption({
  className,
  children,
  disabled,
  label,
  value,
}: NativeSelectOptionProps) {

  return (
    <SelectItem
      data-slot="native-select-option"
      disabled={disabled}
      label={label ?? getTextContent(children)}
      value={String(value ?? "")}
      className={className}
    >
      {children}
    </SelectItem>
  )
}

function NativeSelectOptGroup({
  className,
  children,
  label,
}: NativeSelectOptGroupProps) {

  return (
    <SelectGroup
      data-slot="native-select-optgroup"
      className={className}
    >
      {label ? <SelectLabel>{label}</SelectLabel> : null}
      {children}
    </SelectGroup>
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
