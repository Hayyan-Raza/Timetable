-- Migration: Add preferredRoomId and manualSchedule to allotments table
-- Run this in your Supabase SQL Editor

-- Add preferred_room_id column (optional room assignment from CSV)
ALTER TABLE allotments 
ADD COLUMN IF NOT EXISTS preferred_room_id TEXT;

-- Add manual_schedule column (optional schedule from CSV)
ALTER TABLE allotments 
ADD COLUMN IF NOT EXISTS manual_schedule JSONB;

-- Add comment for documentation
COMMENT ON COLUMN allotments.preferred_room_id IS 'Room ID assigned from CSV import';
COMMENT ON COLUMN allotments.manual_schedule IS 'Manual schedule from CSV with day and time';
