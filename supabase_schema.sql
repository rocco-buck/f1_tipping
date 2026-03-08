-- Create Enums
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE race_status AS ENUM ('upcoming', 'locked', 'completed');

-- Users Table (Extends Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Teams Table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Drivers Table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Races Table
CREATE TABLE public.races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  prediction_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  crazy_prediction_desc TEXT,
  crazy_prediction_points INTEGER DEFAULT 0,
  track_image_url TEXT,
  race_logo_url TEXT,
  location_image_url TEXT,
  status race_status DEFAULT 'upcoming',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Predictions Table
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  race_id UUID REFERENCES public.races(id) NOT NULL,
  pole_driver_id UUID REFERENCES public.drivers(id),
  p1_driver_id UUID REFERENCES public.drivers(id),
  p2_driver_id UUID REFERENCES public.drivers(id),
  p3_driver_id UUID REFERENCES public.drivers(id),
  p10_driver_id UUID REFERENCES public.drivers(id),
  crazy_prediction_value TEXT,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, race_id)
);

-- Race Results Table
CREATE TABLE public.race_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES public.races(id) UNIQUE NOT NULL,
  pole_driver_id UUID REFERENCES public.drivers(id),
  p1_driver_id UUID REFERENCES public.drivers(id),
  p2_driver_id UUID REFERENCES public.drivers(id),
  p3_driver_id UUID REFERENCES public.drivers(id),
  p10_driver_id UUID REFERENCES public.drivers(id),
  crazy_prediction_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY "Users can view their own profile." ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles." ON public.users FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for Teams & Drivers
CREATE POLICY "Anyone can view teams." ON public.teams FOR SELECT USING (true);
CREATE POLICY "Admins can insert teams." ON public.teams FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone can view drivers." ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Admins can insert drivers." ON public.drivers FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for Races
CREATE POLICY "Anyone can view races." ON public.races FOR SELECT USING (true);
CREATE POLICY "Admins can manage races." ON public.races FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for Predictions
-- Users can insert and update their own predictions IF the race is not locked/completed OR if they are an admin
CREATE POLICY "Users can manage their own predictions." ON public.predictions FOR ALL USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for Race Results
CREATE POLICY "Anyone can view results." ON public.race_results FOR SELECT USING (true);
CREATE POLICY "Admins can manage results." ON public.race_results FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Function to handle new user signups and add them to public.users table automatically
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();