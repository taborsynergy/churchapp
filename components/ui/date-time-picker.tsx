'use client';

import * as React from 'react';
import { format, isValid, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disablePast?: boolean;
  minDate?: Date;
  disabled?: boolean;
  placeholder?: string;
}

export function DateTimePicker({
  value,
  onChange,
  disablePast = false,
  minDate,
  disabled = false,
  placeholder = 'Pick a date & time',
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const date = value ? new Date(value) : undefined;
  const validDate = date && isValid(date) ? date : undefined;
  const timeStr = validDate ? format(validDate, 'HH:mm') : '09:00';

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    const [h, m] = timeStr.split(':').map(Number);
    const updated = new Date(day);
    updated.setHours(h, m, 0, 0);
    onChange(format(updated, "yyyy-MM-dd'T'HH:mm"));
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const time = e.target.value;
    const base = validDate ?? new Date();
    const [h, m] = time.split(':').map(Number);
    const updated = new Date(base);
    updated.setHours(h, m, 0, 0);
    onChange(format(updated, "yyyy-MM-dd'T'HH:mm"));
  }

  const today = startOfDay(new Date());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white h-10 px-3',
            !validDate && 'text-slate-500'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          {validDate
            ? format(validDate, 'MMM d, yyyy h:mm a')
            : <span className="font-normal">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-slate-900 border border-slate-700 shadow-xl"
        align="start"
      >
        <Calendar
          mode="single"
          selected={validDate}
          onSelect={handleDaySelect}
          disabled={
            disablePast
              ? { before: today }
              : minDate
                ? { before: startOfDay(minDate) }
                : undefined
          }
          initialFocus
          classNames={{
            months: 'flex flex-col',
            month: 'space-y-2 p-3',
            caption: 'flex justify-center pt-1 relative items-center',
            caption_label: 'text-sm font-semibold text-white',
            nav: 'space-x-1 flex items-center',
            nav_button: cn(
              'h-7 w-7 p-0 flex items-center justify-center rounded border border-slate-600',
              'text-slate-400 hover:text-white hover:bg-slate-700 transition-colors'
            ),
            nav_button_previous: 'absolute left-1',
            nav_button_next: 'absolute right-1',
            table: 'w-full border-collapse',
            head_row: 'flex',
            head_cell: 'text-slate-500 rounded-md w-9 font-normal text-[0.75rem] text-center',
            row: 'flex w-full mt-1',
            cell: 'h-9 w-9 text-center text-sm p-0 relative focus-within:z-20',
            day: cn(
              'h-9 w-9 p-0 font-normal rounded-md transition-colors',
              'text-slate-200 hover:bg-slate-700 hover:text-white',
              'aria-selected:opacity-100'
            ),
            day_selected: 'bg-teal-500 text-white hover:bg-teal-400 hover:text-white focus:bg-teal-500',
            day_today: 'ring-1 ring-teal-500/50 text-white',
            day_outside: 'text-slate-600 opacity-40',
            day_disabled: 'text-slate-600 opacity-30 cursor-not-allowed hover:bg-transparent hover:text-slate-600',
            day_range_middle: '',
            day_hidden: 'invisible',
          }}
        />
        <div className="border-t border-slate-700 px-3 py-2.5 flex items-center gap-3">
          <span className="text-xs text-slate-400 shrink-0">Time</span>
          <input
            type="time"
            value={timeStr}
            onChange={handleTimeChange}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500 [color-scheme:dark]"
          />
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs bg-teal-500 hover:bg-teal-400 text-white font-semibold px-3"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
