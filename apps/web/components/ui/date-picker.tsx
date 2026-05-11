'use client';
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', disabled, className }: DatePickerProps) {
  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const validSelected = selected && isValid(selected) ? selected : undefined;

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    onChange(format(date, 'yyyy-MM-dd'));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-slate-100',
            !validSelected && 'text-slate-500',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
          {validSelected
            ? format(validSelected, 'dd MMM yyyy', { locale: es })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={validSelected}
          onSelect={handleSelect}
          defaultMonth={validSelected}
        />
      </PopoverContent>
    </Popover>
  );
}
