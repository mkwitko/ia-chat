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
}

export function FormActions(props: Readonly<FormActionsProps>) {
  const {
    pending,
    disabled,
    saveLabel = CommonCopy.save,
    onCancel,
    cancelLabel = CommonCopy.cancel,
  } = props;
  return (
    <div className="flex gap-2">
      <Button type="submit" disabled={pending || disabled}>
        {pending ? CommonCopy.saving : saveLabel}
      </Button>
      {onCancel && (
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
    </div>
  );
}

/** Edit and remove buttons of a list row. */
export function RowActions({
  onEdit,
  onRemove,
}: Readonly<{ onEdit: () => void; onRemove: () => void }>) {
  return (
    <div className="flex gap-2">
      <Button variant="ghost" onClick={onEdit}>
        {CommonCopy.edit}
      </Button>
      <Button variant="ghost" className="text-danger" onClick={onRemove}>
        {CommonCopy.remove}
      </Button>
    </div>
  );
}
