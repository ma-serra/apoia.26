-- Add prompt_id column to ia_generation table
-- This column will store the numeric ID extracted from the prompt field when it's in the format 'prompt-X'

-- Step 1: Add the new column as nullable
ALTER TABLE ia_generation
ADD COLUMN prompt_id INT NULL;

-- Step 2: Populate prompt_id from existing prompt values
-- Extract the numeric ID from prompt field when it matches 'prompt-X' pattern
-- and verify that the ID exists in ia_prompt table
UPDATE ia_generation
SET prompt_id = CAST(SUBSTRING(prompt FROM 8) AS INT)
WHERE prompt ~ '^prompt-[0-9]+$'
  AND CAST(SUBSTRING(prompt FROM 8) AS INT) IN (SELECT id FROM ia_prompt);

-- Step 3: Add foreign key constraint
ALTER TABLE ia_generation
ADD CONSTRAINT ia_generation_prompt_id_fk 
  FOREIGN KEY (prompt_id) 
  REFERENCES ia_prompt (id) 
  ON UPDATE NO ACTION 
  ON DELETE SET NULL;

-- Step 4: Create index for better query performance
CREATE INDEX idx_ia_generation_prompt_id ON ia_generation (prompt_id);
