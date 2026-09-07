-- Add defaults for existing tasks without changing their stages, order or archive state.
ALTER TABLE tasks
  ADD COLUMN priority varchar(8) NOT NULL DEFAULT 'medium',
  ADD COLUMN due_date date,
  ADD COLUMN checklist jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ADD CONSTRAINT tasks_checklist_array_check CHECK (
    CASE WHEN jsonb_typeof(checklist) = 'array'
      THEN jsonb_array_length(checklist) <= 100
      ELSE false
    END
  );
