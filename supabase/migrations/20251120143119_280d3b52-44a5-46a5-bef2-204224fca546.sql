-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create user roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create premixes table
CREATE TABLE public.premixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  water_amount INTEGER NOT NULL,
  oil_amount TEXT NOT NULL,
  optional_extras TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.premixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view premixes"
  ON public.premixes FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert premixes"
  ON public.premixes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update premixes"
  ON public.premixes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete premixes"
  ON public.premixes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create premix steps table
CREATE TABLE public.premix_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  premix_id UUID NOT NULL REFERENCES public.premixes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(premix_id, step_number)
);

ALTER TABLE public.premix_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view premix steps"
  ON public.premix_steps FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert premix steps"
  ON public.premix_steps FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update premix steps"
  ON public.premix_steps FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete premix steps"
  ON public.premix_steps FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create tutorials table
CREATE TABLE public.tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Beginner', 'Intermediate', 'Advanced')),
  tags TEXT[],
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tutorials"
  ON public.tutorials FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert tutorials"
  ON public.tutorials FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tutorials"
  ON public.tutorials FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tutorials"
  ON public.tutorials FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create bake shares table
CREATE TABLE public.bake_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  premix_id UUID NOT NULL REFERENCES public.premixes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bake_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible bake shares"
  ON public.bake_shares FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Users can insert their own bake shares"
  ON public.bake_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bake shares"
  ON public.bake_shares FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bake shares"
  ON public.bake_shares FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any bake share"
  ON public.bake_shares FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any bake share"
  ON public.bake_shares FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create bake likes table
CREATE TABLE public.bake_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bake_share_id UUID NOT NULL REFERENCES public.bake_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bake_share_id, user_id)
);

ALTER TABLE public.bake_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bake likes"
  ON public.bake_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own likes"
  ON public.bake_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.bake_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Create bake comments table
CREATE TABLE public.bake_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bake_share_id UUID NOT NULL REFERENCES public.bake_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bake_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bake comments"
  ON public.bake_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own comments"
  ON public.bake_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.bake_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.bake_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment"
  ON public.bake_comments FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for bake photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('bake-photos', 'bake-photos', true);

-- Storage policies for bake photos
CREATE POLICY "Anyone can view bake photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bake-photos');

CREATE POLICY "Authenticated users can upload bake photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bake-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own bake photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'bake-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own bake photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bake-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_premixes_updated_at
  BEFORE UPDATE ON public.premixes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_premix_steps_updated_at
  BEFORE UPDATE ON public.premix_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tutorials_updated_at
  BEFORE UPDATE ON public.tutorials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bake_shares_updated_at
  BEFORE UPDATE ON public.bake_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bake_comments_updated_at
  BEFORE UPDATE ON public.bake_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();