-- Create table for prompt ratings
CREATE TABLE ia_prompt_rating (
  id SERIAL PRIMARY KEY,
  prompt_base_id INT NOT NULL,
  user_id INT NOT NULL,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_prompt_user UNIQUE (prompt_base_id, user_id),
  CONSTRAINT fk_ia_prompt_rating_prompt_id
    FOREIGN KEY (prompt_base_id)
    REFERENCES ia_prompt (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT fk_ia_prompt_rating_user_id
    FOREIGN KEY (user_id)
    REFERENCES ia_user (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);

-- Create indexes for better query performance
CREATE INDEX idx_ia_prompt_rating_prompt_base_id ON ia_prompt_rating (prompt_base_id);
CREATE INDEX idx_ia_prompt_rating_user_id ON ia_prompt_rating (user_id);
