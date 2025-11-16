-- EventHaiti Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('attendee', 'organizer');
CREATE TYPE ticket_status AS ENUM ('active', 'used', 'cancelled');
CREATE TYPE scan_result AS ENUM ('valid', 'already_used', 'invalid');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    role user_role NOT NULL DEFAULT 'attendee',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events table
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    venue_name TEXT NOT NULL,
    city TEXT NOT NULL,
    commune TEXT NOT NULL,
    address TEXT NOT NULL,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    banner_image_url TEXT,
    ticket_price NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'HTG',
    total_tickets INTEGER NOT NULL,
    tickets_sold INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT positive_tickets CHECK (total_tickets > 0),
    CONSTRAINT valid_tickets_sold CHECK (tickets_sold >= 0 AND tickets_sold <= total_tickets),
    CONSTRAINT valid_price CHECK (ticket_price >= 0)
);

-- Tickets table
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    attendee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    qr_code_data TEXT NOT NULL UNIQUE,
    status ticket_status NOT NULL DEFAULT 'active',
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket scans table
CREATE TABLE public.ticket_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result scan_result NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_events_organizer ON public.events(organizer_id);
CREATE INDEX idx_events_published ON public.events(is_published) WHERE is_published = true;
CREATE INDEX idx_events_start_datetime ON public.events(start_datetime);
CREATE INDEX idx_events_city ON public.events(city);
CREATE INDEX idx_events_category ON public.events(category);
CREATE INDEX idx_tickets_event ON public.tickets(event_id);
CREATE INDEX idx_tickets_attendee ON public.tickets(attendee_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_ticket_scans_ticket ON public.ticket_scans(ticket_id);
CREATE INDEX idx_ticket_scans_event ON public.ticket_scans(event_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Events policies
CREATE POLICY "Anyone can view published events"
    ON public.events FOR SELECT
    USING (is_published = true OR organizer_id = auth.uid());

CREATE POLICY "Organizers can create events"
    ON public.events FOR INSERT
    WITH CHECK (
        auth.uid() = organizer_id AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'organizer')
    );

CREATE POLICY "Organizers can update their own events"
    ON public.events FOR UPDATE
    USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete their own events"
    ON public.events FOR DELETE
    USING (organizer_id = auth.uid());

-- Tickets policies
CREATE POLICY "Users can view their own tickets"
    ON public.tickets FOR SELECT
    USING (
        attendee_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
    );

CREATE POLICY "Authenticated users can create tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (auth.uid() = attendee_id);

CREATE POLICY "Ticket owners and organizers can update tickets"
    ON public.tickets FOR UPDATE
    USING (
        attendee_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
    );

-- Ticket scans policies
CREATE POLICY "Organizers can view scans for their events"
    ON public.ticket_scans FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
    );

CREATE POLICY "Organizers can create scans for their events"
    ON public.ticket_scans FOR INSERT
    WITH CHECK (
        scanned_by = auth.uid() AND
        EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND organizer_id = auth.uid())
    );

-- Function to handle user creation from auth trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'attendee')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
