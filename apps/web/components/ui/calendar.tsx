'use client';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={es}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col space-y-4',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium text-slate-200 capitalize',
        nav: 'space-x-1 flex items-center absolute inset-x-0 top-0 justify-between',
        button_previous: 'h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors',
        button_next: 'h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors',
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'text-slate-500 rounded-md w-9 font-normal text-[0.8rem] text-center',
        weeks: 'space-y-1',
        week: 'flex w-full mt-2',
        day: 'h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
        day_button: cn(
          'h-9 w-9 p-0 font-normal rounded-md text-slate-300 transition-colors',
          'hover:bg-slate-800 hover:text-slate-100',
          'focus:outline-none focus:ring-2 focus:ring-slate-600',
        ),
        selected: '[&>button]:bg-slate-100 [&>button]:text-slate-900 [&>button]:hover:bg-slate-200 [&>button]:font-semibold',
        today: '[&>button]:border [&>button]:border-slate-600 [&>button]:text-slate-100',
        outside: '[&>button]:text-slate-700 [&>button]:hover:bg-transparent',
        disabled: '[&>button]:text-slate-700 [&>button]:hover:bg-transparent [&>button]:cursor-not-allowed',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
