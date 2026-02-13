CREATE TABLE suspicious_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  file_id UUID REFERENCES task_files(id),
  activity_type VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  evidence JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
