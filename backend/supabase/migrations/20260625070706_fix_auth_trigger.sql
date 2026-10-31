-- Remove the duplicate profile to allow the admin user to log in and have their profile automatically created
DELETE FROM public.profiles WHERE email = 'praveen12rangasamy@gmail.com';
