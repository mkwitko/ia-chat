import { ChevronRight, Trash2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CommonCopy } from './setup-copy';

type InputProps = Omit<ComponentProps<'input'>, 'onChange' | 'value'>;
type AreaProps = Omit<ComponentProps<'textarea'>, 'onChange' | 'value'>;

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}

/** Label, input and optional hint, wired for screen readers. */
export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  ...rest
}: Readonly<FieldProps & InputProps>) {
  return (
    <div className="grid max-w-2xl gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function AreaField({
  id,
  label,
  value,
  onChange,
  hint,
  ...rest
}: Readonly<FieldProps & AreaProps>) {
  return (
    <div className="grid max-w-2xl gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

interface FormActionsProps {
  pending: boolean;
  disabled?: boolean;
  saveLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Inside an item's editor: removing lives here, never next to "Editar" in the list. */
  onRemove?: (() => void) | undefined;
}

export function FormActions(props: Readonly<FormActionsProps>) {
  const {
    pending,
    disabled,
    saveLabel = CommonCopy.save,
    onCancel,
    cancelLabel = CommonCopy.cancel,
    onRemove,
  } = props;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={pending || disabled}>
        {pending ? CommonCopy.saving : saveLabel}
      </Button>
      {onCancel && (
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
      {onRemove && (
        <Button type="button" variant="ghost" className="ml-auto text-danger" onClick={onRemove}>
          <Trash2 aria-hidden="true" />
          {CommonCopy.remove}
        </Button>
      )}
    </div>
  );
}

/** "Editar ›" of a list row; removing is inside the editor it opens. */
export function RowActions({ onEdit }: Readonly<{ onEdit: () => void }>) {
  return (
    <Button variant="ghost" onClick={onEdit}>
      {CommonCopy.edit}
      <ChevronRight aria-hidden="true" />
    </Button>
  );
}
